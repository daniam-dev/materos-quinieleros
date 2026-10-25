import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Journey, Participant } from '../../domain/models';
import { evaluatePleno } from '../../domain/scoring';
import { MqPredictionMark } from '../../shared/ui/prediction-mark';
import { MqBadge } from '../../shared/ui/badge';
@Component({
  selector: 'mq-pleno',
  imports: [MqPredictionMark, MqBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section aria-labelledby="pleno-title">
    <div class="section-heading">
      <h2 id="pleno-title">Pleno al 15</h2>
      <mq-badge>{{ official() ? 'Resultado oficial' : 'Pendiente' }}</mq-badge>
    </div>
    <p class="pleno-fixture">
      {{ journey().pleno.fixture.home }} <span>—</span> {{ journey().pleno.fixture.away }}
    </p>
    @if (official(); as result) {
      <p class="muted">Oficial: {{ result.home }} – {{ result.away }}</p>
    }
    <div class="pleno-predictions">
      @for (row of rows(); track row.participant.id) {
        <div>
          <span class="pleno-person">{{ row.participant.name }}</span
          ><mq-prediction-mark [value]="row.value" [state]="row.state" />
        </div>
      }
    </div>
    <p class="fine-print">
      M = 3 o más goles. Se evalúa por separado; no suma al porcentaje de los 14 encuentros.
    </p>
  </section>`,
})
export class Pleno {
  readonly journey = input.required<Journey>();
  readonly participants = input.required<readonly Participant[]>();
  readonly asOf = input.required<string>();
  readonly official = computed(() => {
    const result = this.journey().pleno.official;
    return result && Date.parse(result.publishedAt) <= Date.parse(this.asOf()) ? result : null;
  });
  readonly rows = computed(() =>
    this.participants().map((participant) => {
      const prediction = this.journey().pleno.predictions.find(
        (p) => p.participantId === participant.id,
      );
      return {
        participant,
        value: prediction ? `${prediction.home} – ${prediction.away}` : '—',
        state: evaluatePleno(this.journey(), prediction, this.asOf()),
      };
    }),
  );
}
