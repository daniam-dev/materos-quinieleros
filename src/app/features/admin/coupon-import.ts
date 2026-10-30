import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CouponDraftRow, madridInputToIso, parseCouponText } from '../../domain/coupon-import';
import { AdminCommand } from '../../core/data/admin-service';
import type { Worker } from 'tesseract.js';

@Component({
  selector: 'mq-coupon-import',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coupon-import.html',
})
export class CouponImport {
  readonly busy = input(false);
  readonly submitted = output<AdminCommand>();
  readonly reading = signal(false);
  readonly progress = signal('');
  readonly error = signal('');
  readonly preview = signal('');
  readonly rows = signal<CouponDraftRow[]>([]);
  number: number | null = null;
  drawDate = '';
  closesAt = '';
  text = '';
  confirmed = false;
  private worker: Worker | undefined;
  private alive = true;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      if (this.preview()) URL.revokeObjectURL(this.preview());
      void this.stopWorker();
    });
  }
  private async stopWorker(): Promise<void> {
    const worker = this.worker;
    this.worker = undefined;
    if (worker) await worker.terminate().catch(() => undefined);
  }
  manual(): void {
    this.rows.set(Array.from({ length: 15 }, () => ({ home: '', away: '', category: '' })));
    this.confirmed = false;
    this.error.set('');
  }
  applyText(): void {
    this.confirmed = false;
    this.error.set('');
    try {
      const result = parseCouponText(this.text);
      this.rows.set(result.rows);
      this.progress.set(
        `${result.recognized} de 15 encuentros reconocidos. Revisa todos los equipos, el orden y M/F antes de guardar.`,
      );
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }
  async readPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.reading()) return;
    this.error.set('');
    this.confirmed = false;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 12 * 1024 * 1024
    ) {
      this.error.set('Usa una imagen JPG, PNG o WebP de hasta 12 MB.');
      input.value = '';
      return;
    }
    this.reading.set(true);
    this.progress.set('Preparando la lectura de la foto…');
    let phase: 'image' | 'engine' | 'recognition' = 'image';
    try {
      if (this.preview()) URL.revokeObjectURL(this.preview());
      this.preview.set(URL.createObjectURL(file));
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width * bitmap.height > 24_000_000)
          throw new Error('La foto es demasiado grande. Recorta el boleto y vuelve a intentarlo.');
        const scale = Math.min(2, 2200 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se ha podido preparar la imagen.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        phase = 'engine';
        this.progress.set('Cargando el lector de la foto…');
        const tesseract = await import('tesseract.js');
        // The production CommonJS bundle exposes Tesseract through its default export.
        const { createWorker, PSM } = tesseract.default ?? tesseract;
        if (!this.alive) return;
        let rejectInitialization!: (reason: Error) => void;
        const initializationFailed = new Promise<never>((_, reject) => {
          rejectInitialization = reject;
        });
        let initializationFinished = false;
        const timeout = setTimeout(
          () => rejectInitialization(new Error('OCR initialization timed out')),
          30_000,
        );
        const initializingWorker = createWorker('spa', 1, {
          workerPath: '/ocr/worker.min.js',
          corePath: '/ocr/core',
          langPath: '/ocr/lang',
          // Language/model failures may only reach this callback in Tesseract.
          errorHandler: () => rejectInitialization(new Error('OCR initialization failed')),
          logger: (message) => {
            if (this.alive && message.status === 'recognizing text')
              this.progress.set(`Leyendo la foto… ${Math.round(message.progress * 100)} %`);
          },
        });
        void initializingWorker.then(
          (worker) => {
            if (initializationFinished || !this.alive) void worker.terminate();
          },
          () => undefined,
        );
        try {
          this.worker = await Promise.race([initializingWorker, initializationFailed]);
        } finally {
          initializationFinished = true;
          clearTimeout(timeout);
        }
        if (!this.alive) {
          await this.stopWorker();
          return;
        }
        phase = 'recognition';
        this.progress.set('Leyendo la foto…');
        await this.worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
        const result = await this.worker.recognize(canvas);
        if (this.alive) {
          this.text = result.data.text;
          this.applyText();
        }
      } finally {
        bitmap.close();
      }
    } catch (error) {
      if (this.alive) {
        this.progress.set('');
        const recovery =
          'Vuelve a seleccionar la foto, pega los cruces como texto o introdúcelos manualmente.';
        const failures = {
          image: 'No se ha podido preparar la foto. Prueba con otra imagen JPG, PNG o WebP.',
          engine: `No se ha podido cargar el lector de fotos. Comprueba tu conexión. ${recovery}`,
          recognition: `No se ha podido leer la foto. ${recovery}`,
        };
        this.error.set(
          error instanceof Error && error.message.startsWith('La foto')
            ? error.message
            : failures[phase],
        );
      }
    } finally {
      await this.stopWorker();
      if (this.alive) {
        this.reading.set(false);
        input.value = '';
      }
    }
  }
  save(): void {
    this.error.set('');
    try {
      if (
        !this.confirmed ||
        this.rows().length !== 15 ||
        this.rows().some((r) => !r.home.trim() || !r.away.trim() || !r.category)
      )
        throw new Error('Completa y revisa los 15 encuentros, incluido el Pleno.');
      this.submitted.emit({
        type: 'create-played-journey',
        number: Number(this.number),
        drawDate: this.drawDate,
        closesAt: madridInputToIso(this.closesAt),
        confirmed: true,
        fixtures: this.rows().map((r) => ({
          ...r,
          category: r.category as 'men' | 'women',
          kickoff: null,
          competitionName: null,
        })),
      });
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }
}
