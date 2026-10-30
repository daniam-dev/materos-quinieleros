import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { MadridDatePipe } from '../../shared/ui/madrid-date';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { AdminCommand, AdminService, AdminSnapshot } from '../../core/data/admin-service';
import { QuinielaStore } from '../../core/data/quiniela-store';
import { MqPageHeader } from '../../shared/ui/page-header';
import { MqButton } from '../../shared/ui/button';
import { MqLoadingState } from '../../shared/ui/loading-state';
import { MqEmptyState } from '../../shared/ui/empty-state';
import { CouponImport } from './coupon-import';
import { Participant } from '../../domain/models';

@Component({
  selector: 'mq-admin-page',
  imports: [
    MadridDatePipe,
    FormsModule,
    MqPageHeader,
    MqButton,
    MqLoadingState,
    MqEmptyState,
    CouponImport,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-page.html',
})
export class AdminPage {
  readonly auth = inject(AuthService);
  private readonly api = inject(AdminService);
  private readonly store = inject(QuinielaStore);
  private readonly router = inject(Router);
  private readonly feedback = viewChild<ElementRef<HTMLElement>>('feedback');
  readonly data = signal<AdminSnapshot | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly tab = signal<'predictions' | 'people' | 'journeys' | 'competitions' | 'results'>(
    'predictions',
  );
  readonly resultId = signal('');
  readonly resultJourney = computed(() =>
    this.data()?.snapshot.journeys.find((j) => j.id === this.resultId()),
  );
  resultSigns = Array<string>(14).fill('');
  resultHome = '';
  resultAway = '';
  resultNote = '';
  readonly availableJourneys = computed(
    () =>
      this.data()?.snapshot.journeys.filter(
        (j) => !['excluded', 'pending'].includes(j.participation?.state ?? ''),
      ) ?? [],
  );
  readonly classificationId = signal('');
  readonly classificationJourney = computed(() =>
    this.data()?.snapshot.journeys.find((j) => j.id === this.classificationId()),
  );
  filterEnabled = false;
  enabledCompetitionIds: string[] = [];
  classifiedCompetitionIds: string[] = [];
  classificationConfirmed = false;
  classificationSignature = '';
  readonly removal = signal('');
  readonly journey = computed(() =>
    this.data()?.snapshot.journeys.find((j) => j.id === this.journeyId()),
  );
  readonly journeyId = signal('');
  readonly participantId = signal('daniel-arroyo');
  readonly people = computed(
    () =>
      this.data()?.snapshot.participants.filter(
        (p) => p.active || this.journey()?.participantIds.includes(p.id),
      ) ?? [],
  );
  readonly existing = computed(
    () =>
      this.journey()?.predictions.some((p) => p.participantId === this.participantId()) ?? false,
  );
  readonly signs = ['1', 'X', '2', '1X', '12', 'X2'];
  readonly goals = ['0', '1', '2', 'M'];
  predictions: string[] = Array<string>(14).fill('');
  plenoHome = '';
  plenoAway = '';
  pasted = '';
  name = '';
  surname = '';
  constructor() {
    const injector = inject(Injector);
    effect(() => {
      if (this.error() || this.notice()) {
        afterNextRender(() => this.feedback()?.nativeElement.focus(), { injector });
      }
    });
    void this.reload();
    const document = inject(DOCUMENT);
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || this.busy() || this.loading()) return;
      try {
        const latest = await this.api.load();
        // Only refresh sports when the private revision is unchanged; retain unsaved inputs.
        if (latest.revision === this.data()?.revision) {
          this.data.set(latest);
          if (this.classificationJourney()?.fixtureSignature !== this.classificationSignature)
            this.classificationConfirmed = false;
          this.refreshSelection();
        } else
          this.error.set(
            'Otra sesión ha cambiado las quinielas o las personas. Recarga antes de guardar.',
          );
      } catch {
        this.error.set('No se pudo refrescar el panel. Tus cambios sin guardar se conservan.');
      }
    };
    const timer = setInterval(() => void refresh(), 5 * 60 * 1000);
    const onVisible = () => void refresh();
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    });
  }

  selectTab(tab: 'predictions' | 'people' | 'journeys' | 'competitions' | 'results'): void {
    if (this.busy()) return;
    this.error.set('');
    this.notice.set('');
    this.removal.set('');
    this.tab.set(tab);
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await this.api.load());
      this.loadCompetitionSettings();
      if (!this.journeyId())
        this.journeyId.set(
          this.availableJourneys().find((j) => j.id === this.data()?.snapshot.currentJourneyId)
            ?.id ??
            this.availableJourneys()[0]?.id ??
            '',
        );
      this.loadPredictions();
      this.refreshSelection();
    } catch (error) {
      this.error.set(this.api.message(error));
    } finally {
      this.loading.set(false);
    }
  }
  selectJourney(id: string): void {
    this.journeyId.set(id);
    this.loadPredictions();
  }
  selectParticipant(id: string): void {
    this.participantId.set(id);
    this.loadPredictions();
  }
  loadPredictions(): void {
    const journey = this.journey();
    this.predictions =
      journey?.fixtures.map(
        (f) =>
          journey.predictions.find(
            (p) => p.participantId === this.participantId() && p.fixtureId === f.id,
          )?.sign ?? '',
      ) ?? Array<string>(14).fill('');
    const pleno = journey?.pleno.predictions.find((p) => p.participantId === this.participantId());
    this.plenoHome = pleno?.home ?? '';
    this.plenoAway = pleno?.away ?? '';
    this.pasted = '';
    this.notice.set('');
  }
  pasteSigns(): void {
    const text = this.pasted.toUpperCase().trim();
    const values = /^[1X2]{14}$/.test(text) ? [...text] : text.split(/[\s,;|]+/);
    if (values.length !== 14 || values.some((s) => !this.signs.includes(s))) {
      this.error.set('Pega exactamente 14 signos separados por espacios: 1, X, 2, 1X, 12 o X2.');
      return;
    }
    if (values.filter((s) => s.length === 2).length > 2) {
      this.error.set('Solo se permiten dos dobles por participante.');
      return;
    }
    this.predictions = values;
    this.error.set('');
  }
  async commit(command: AdminCommand, success: string): Promise<boolean> {
    const data = this.data();
    if (!data || this.busy()) return false;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.save(command, data.revision);
      this.data.set(await this.api.load());
      this.notice.set(success);
      // The public store only ever receives the server's redacted response.
      void this.store.load();
      return true;
    } catch (error) {
      this.error.set(this.api.message(error));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
  async addPerson(): Promise<void> {
    if (
      await this.commit(
        { type: 'add-participant', name: this.name, surname: this.surname },
        'Persona añadida al grupo.',
      )
    ) {
      this.name = '';
      this.surname = '';
    }
  }
  async setActive(person: Participant, active: boolean): Promise<void> {
    if (
      await this.commit(
        { type: 'set-active', participantId: person.id, active },
        active
          ? 'Persona reincorporada al grupo.'
          : 'Persona dada de baja. Su histórico se conserva.',
      )
    )
      this.removal.set('');
  }
  async savePredictions(): Promise<void> {
    await this.commit(
      {
        type: 'save-predictions',
        journeyId: this.journeyId(),
        participantId: this.participantId(),
        signs: this.predictions,
        pleno: { home: this.plenoHome, away: this.plenoAway },
      },
      'Quiniela guardada.',
    );
  }
  loadCompetitionSettings(): void {
    this.filterEnabled = this.data()?.competitionSettings?.enabled ?? false;
    this.enabledCompetitionIds = [...(this.data()?.competitionSettings?.enabledIds ?? [])];
    if (this.classificationId()) this.selectClassification(this.classificationId());
  }
  toggleCompetition(id: string, checked: boolean, classification = false): void {
    const ids = classification ? this.classifiedCompetitionIds : this.enabledCompetitionIds;
    const next = checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id);
    if (classification) {
      this.classifiedCompetitionIds = next;
      this.classificationConfirmed = false;
    } else this.enabledCompetitionIds = next;
  }
  selectClassification(id: string): void {
    this.classificationId.set(id);
    this.classificationSignature = this.classificationJourney()?.fixtureSignature ?? '';
    this.classifiedCompetitionIds = [
      ...(this.classificationJourney()?.participation?.competitionIds ?? []),
    ];
    this.classificationConfirmed = false;
  }
  classifyJourney(id: string): void {
    this.selectTab('competitions');
    this.selectClassification(id);
  }
  private refreshSelection(): void {
    if (!this.availableJourneys().some((j) => j.id === this.journeyId())) {
      this.journeyId.set(this.availableJourneys()[0]?.id ?? '');
      const notice = this.notice();
      this.loadPredictions();
      this.notice.set(notice);
    }
  }
  async saveCompetitions(): Promise<void> {
    if (
      await this.commit(
        {
          type: 'set-competitions',
          enabled: this.filterEnabled,
          enabledIds: this.enabledCompetitionIds,
        },
        'Configuración guardada. Los boletos mixtos requieren todas sus competiciones habilitadas.',
      )
    ) {
      this.loadCompetitionSettings();
      this.refreshSelection();
    }
  }
  async saveClassification(): Promise<void> {
    const journey = this.classificationJourney();
    if (!journey?.fixtureSignature) return;
    if (
      await this.commit(
        {
          type: 'classify-journey',
          journeyId: journey.id,
          competitionIds: this.classifiedCompetitionIds,
          fixtureSignature: this.classificationSignature,
          confirmed: this.classificationConfirmed,
        },
        'Competiciones del boleto confirmadas. Se ha aplicado la configuración del grupo.',
      )
    ) {
      this.classificationConfirmed = false;
      this.refreshSelection();
    }
  }
  doubles(): number {
    return this.predictions.filter((s) => s.length === 2).length;
  }
  doubleDisabled(index: number, sign: string): boolean {
    return sign.length === 2 && this.predictions[index].length !== 2 && this.doubles() >= 2;
  }
  complete(id: string): boolean {
    const j = this.journey();
    return (
      !!j &&
      j.fixtures.every((f) =>
        j.predictions.some((p) => p.fixtureId === f.id && p.participantId === id),
      ) &&
      j.pleno.predictions.some((p) => p.participantId === id)
    );
  }
  async retrySync(): Promise<void> {
    await this.commit(
      { type: 'sync' },
      'Sincronización solicitada. Revisa el estado de las fuentes.',
    );
    if (!this.journeyId()) this.journeyId.set(this.data()?.snapshot.currentJourneyId ?? '');
  }
  async createPlayedJourney(command: AdminCommand): Promise<void> {
    const previous = new Set(this.data()?.snapshot.journeys.map((j) => j.id));
    if (await this.commit(command, 'Jornada guardada. Ya puedes cargar las quinielas del grupo.')) {
      const created = this.data()?.snapshot.journeys.find((j) => !previous.has(j.id));
      if (created) this.selectJourney(created.id);
      this.tab.set('predictions');
      this.notice.set('Jornada guardada. Ya puedes cargar las quinielas del grupo.');
    }
  }
  selectResults(id: string): void {
    this.resultId.set(id);
    const overrides = this.resultJourney()?.resultOverrides;
    this.resultSigns =
      this.resultJourney()?.fixtures.map(
        (f) => overrides?.results.find((r) => r.fixtureId === f.id)?.sign ?? '',
      ) ?? Array<string>(14).fill('');
    this.resultHome = overrides?.pleno?.home ?? '';
    this.resultAway = overrides?.pleno?.away ?? '';
    this.resultNote = '';
  }
  async saveResults(): Promise<void> {
    await this.commit(
      {
        type: 'correct-results',
        journeyId: this.resultId(),
        signs: this.resultSigns,
        pleno: { home: this.resultHome, away: this.resultAway },
        note: this.resultNote,
      },
      'Correcciones guardadas. Los campos vacíos vuelven a usar el resultado de OddsPapi.',
    );
  }
  async logout(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.auth.logout();
      this.data.set(null);
      await this.router.navigateByUrl('/jornadas');
    } catch (error) {
      this.error.set(this.api.message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
