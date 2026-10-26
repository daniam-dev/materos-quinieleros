import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { AdminCommand, AdminService, AdminSnapshot } from '../../core/data/admin-service';
import { QuinielaStore } from '../../core/data/quiniela-store';
import { MqPageHeader } from '../../shared/ui/page-header';
import { MqButton } from '../../shared/ui/button';
import { MqLoadingState } from '../../shared/ui/loading-state';
import { MqEmptyState } from '../../shared/ui/empty-state';
import { Participant } from '../../domain/models';

@Component({
  selector: 'mq-admin-page',
  imports: [FormsModule, MqPageHeader, MqButton, MqLoadingState, MqEmptyState],
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
  readonly tab = signal<'predictions' | 'people' | 'journeys'>('predictions');
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
    () => this.journey()?.participantIds.includes(this.participantId()) ?? false,
  );
  readonly signs = ['1', 'X', '2'];
  readonly goals = ['0', '1', '2', 'M'];
  predictions: string[] = Array<string>(14).fill('');
  plenoHome = '';
  plenoAway = '';
  pasted = '';
  name = '';
  surname = '';
  number: number | null = null;
  competition: 'league' | 'europe' = 'league';
  closesAt = '';
  fixtures = Array.from({ length: 15 }, () => ({ home: '', away: '', kickoff: '' }));
  constructor() {
    const injector = inject(Injector);
    effect(() => {
      if (this.error() || this.notice()) {
        afterNextRender(() => this.feedback()?.nativeElement.focus(), { injector });
      }
    });
    void this.reload();
  }

  selectTab(tab: 'predictions' | 'people' | 'journeys'): void {
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
      if (!this.journeyId())
        this.journeyId.set(
          this.data()?.snapshot.currentJourneyId ?? this.data()?.snapshot.journeys[0]?.id ?? '',
        );
      this.loadPredictions();
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
    const value = this.pasted.toUpperCase().replace(/[\s,;|-]/g, '');
    if (!/^[1X2]{14}$/.test(value)) {
      this.error.set('Pega exactamente 14 signos: 1, X o 2.');
      return;
    }
    this.predictions = [...value];
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
  async createJourney(): Promise<void> {
    const iso = (value: string) => new Date(value).toISOString();
    try {
      if (
        await this.commit(
          {
            type: 'create-journey',
            number: this.number ?? 0,
            competition: this.competition,
            closesAt: iso(this.closesAt),
            fixtures: this.fixtures.map((f) => ({ ...f, kickoff: iso(f.kickoff) })),
          },
          'Jornada creada. Ya puedes cargar las quinielas.',
        )
      ) {
        this.journeyId.set(this.data()?.snapshot.journeys.at(-1)?.id ?? '');
        this.number = null;
        this.closesAt = '';
        this.fixtures = Array.from({ length: 15 }, () => ({ home: '', away: '', kickoff: '' }));
        this.loadPredictions();
        this.tab.set('predictions');
        this.notice.set('Jornada creada. Ya puedes cargar las quinielas.');
      }
    } catch {
      this.error.set('Revisa las fechas de cierre y de los encuentros.');
    }
  }
  async setCurrent(id: string | null): Promise<void> {
    await this.commit({ type: 'set-current', journeyId: id }, 'Jornada actual actualizada.');
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
