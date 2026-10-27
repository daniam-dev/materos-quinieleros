import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { QuinielaStore } from '../../core/data/quiniela-store';
import { isPublished, journeyRanking, journeyState, publishedResults } from '../../domain/scoring';
import { MqPageHeader } from '../../shared/ui/page-header';
import { MqButton } from '../../shared/ui/button';
import { MqCard } from '../../shared/ui/card';
import { MqStatusIndicator } from '../../shared/ui/status-indicator';
import { MqEmptyState } from '../../shared/ui/empty-state';
import { MqDialog } from '../../shared/ui/dialog';
import { ComparisonTable, FixtureFilter } from './comparison-table';
import { Pleno } from './pleno';

@Component({
  selector: 'mq-journeys-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    SelectModule,
    MqPageHeader,
    MqButton,
    MqCard,
    MqStatusIndicator,
    MqEmptyState,
    MqDialog,
    ComparisonTable,
    Pleno,
  ],
  templateUrl: './journeys-page.html',
})
export class JourneysPage {
  readonly store = inject(QuinielaStore);
  readonly selectedId = signal('current');
  readonly filter = signal<FixtureFilter>('all');
  readonly participantId = signal('daniel-arroyo');
  readonly globalView = signal(false);
  readonly rulesVisible = signal(false);
  readonly filters: readonly { value: FixtureFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'resolved', label: 'Resueltos' },
    { value: 'pending', label: 'Pendientes' },
  ];
  readonly competitionLabels = {
    league: 'Liga',
    europe: 'Champions / Europa League',
    mixed: 'Boleto SELAE',
  } as const;
  readonly journeys = computed(() =>
    [...(this.store.snapshot()?.journeys ?? [])].sort(
      (a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt) || b.number - a.number,
    ),
  );
  readonly journey = computed(() => {
    const id =
      this.selectedId() === 'current' ? this.store.snapshot()?.currentJourneyId : this.selectedId();
    return this.journeys().find((j) => j.id === id);
  });
  readonly options = computed(() => [
    { id: 'current', label: 'Jornada actual' },
    ...this.journeys().map((j) => ({
      id: j.id,
      label: `Jornada ${j.number} · ${this.competitionLabels[j.competition]} · ${j.seasonId}`,
    })),
  ]);
  readonly participants = computed(
    () =>
      this.store
        .snapshot()
        ?.participants.filter((p) => this.journey()?.participantIds.includes(p.id)) ?? [],
  );
  readonly selectedParticipant = computed(
    () =>
      this.participants().find((p) => p.id === this.participantId())?.id ??
      this.participants()[0]?.id ??
      '',
  );
  readonly asOf = computed(() => this.store.snapshot()?.asOf ?? '');
  readonly published = computed(() => {
    const j = this.journey();
    return !!j && isPublished(j, this.asOf());
  });
  readonly state = computed(() => {
    const j = this.journey();
    return j ? journeyState(j, this.asOf()) : 'open';
  });
  readonly officialCount = computed(() => {
    const j = this.journey();
    return j ? publishedResults(j, this.asOf()).length : 0;
  });
  readonly top = computed(() => {
    const j = this.journey();
    return j ? journeyRanking(j, this.participants(), this.asOf()).slice(0, 3) : [];
  });
  readonly dateLabel = computed(() => {
    const j = this.journey();
    if (!j) return '';
    const formatter = new Intl.DateTimeFormat('es', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Madrid',
    });
    const start = formatter.format(new Date(j.startsAt));
    const end = formatter.format(new Date(j.endsAt));
    return start === end ? start : `${start} — ${end}`;
  });
  readonly closeLabel = computed(() => {
    const j = this.journey();
    return j?.closesAt
      ? new Intl.DateTimeFormat('es', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Madrid',
        }).format(new Date(j.closesAt))
      : 'Pendiente de horarios oficiales';
  });
  selectJourney(id: string): void {
    this.selectedId.set(id);
    this.filter.set('all');
  }
}
