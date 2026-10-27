import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PredictionState } from '../../domain/scoring';
@Component({
  selector: 'mq-prediction-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    [class]="'prediction-mark prediction-mark--' + state()"
    [attr.aria-label]="description()"
    ><span aria-hidden="true">{{ value() }}</span>
    @if (state() === 'hit') {
      <svg aria-hidden="true" viewBox="0 0 12 12"><path d="m2 6 2.5 2.5L10 3" /></svg>
    } @else if (state() === 'miss') {
      <svg aria-hidden="true" viewBox="0 0 12 12"><path d="m3 3 6 6m0-6-6 6" /></svg>
    }
    @if (state() === 'provisional-hit' || state() === 'provisional-miss') {
      <small aria-hidden="true">prov.</small>
    }
    <span class="sr-only">{{ description() }}</span></span
  >`,
})
export class MqPredictionMark {
  readonly value = input.required<string>();
  readonly state = input.required<PredictionState>();
  readonly description = computed(
    () =>
      `${this.value()}, ${{ hit: 'acierto confirmado', miss: 'fallo confirmado', 'provisional-hit': 'acierto provisional', 'provisional-miss': 'fallo provisional', pending: 'pendiente de signo oficial', missing: 'sin apuesta registrada', hidden: 'oculto hasta el cierre' }[this.state()]}`,
  );
}
