import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Journey, Participant } from '../../domain/models';
import { displayPrediction, publishedResults } from '../../domain/scoring';
import { MadridDatePipe } from '../../shared/ui/madrid-date';
import { MqPredictionMark } from '../../shared/ui/prediction-mark';

export type FixtureFilter = 'all' | 'resolved' | 'pending';
@Component({
  selector: 'mq-comparison-table',
  imports: [MqPredictionMark, MadridDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comparison-table.html',
})
export class ComparisonTable {
  readonly journey = input.required<Journey>();
  readonly participants = input.required<readonly Participant[]>();
  readonly asOf = input.required<string>();
  readonly filter = input<FixtureFilter>('all');
  readonly selectedParticipant = input.required<string>();
  readonly global = input(false);
  readonly rows = computed(() => {
    const journey = this.journey();
    const officials = new Map(publishedResults(journey, this.asOf()).map((r) => [r.fixtureId, r]));
    const predictions = new Map(
      journey.predictions.map((p) => [`${p.fixtureId}:${p.participantId}`, p]),
    );
    return journey.fixtures
      .filter(
        (fixture) =>
          this.filter() === 'all' ||
          (this.filter() === 'resolved' ? officials.has(fixture.id) : !officials.has(fixture.id)),
      )
      .map((fixture) => ({
        fixture,
        official: officials.get(fixture.id),
        status:
          fixture.status === 'suspended'
            ? 'Suspendido'
            : fixture.status === 'cancelled'
              ? 'Cancelado'
              : fixture.status === 'live'
                ? 'En juego'
                : fixture.status === 'postponed'
                  ? 'Aplazado'
                  : fixture.status === 'finished'
                    ? 'Final'
                    : fixture.kickoff
                      ? new Intl.DateTimeFormat('es', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Madrid',
                        }).format(new Date(fixture.kickoff))
                      : 'Horario pendiente',
        cells: this.participants().map((participant) => {
          const prediction = predictions.get(`${fixture.id}:${participant.id}`);
          return {
            participant,
            value: prediction?.sign ?? '—',
            state: displayPrediction(journey, prediction, this.asOf()),
          };
        }),
      }));
  });
}
