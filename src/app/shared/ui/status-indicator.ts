import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { JourneyState } from '../../domain/scoring';
import { MqBadge } from './badge';
@Component({
  selector: 'mq-status-indicator',
  imports: [MqBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<mq-badge [tone]="state() === 'partial' ? 'accent' : 'neutral'"
    ><span class="status-dot" aria-hidden="true"></span>{{ label() }}</mq-badge
  >`,
})
export class MqStatusIndicator {
  readonly state = input.required<JourneyState>();
  readonly label = computed(
    () =>
      ({
        open: 'Abierta',
        closed: 'Cerrada',
        partial: 'Resultados parciales',
        complete: 'Finalizada',
      })[this.state()],
  );
}
