import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
  selector: 'mq-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="mq-badge"
    [class.mq-badge--accent]="tone() === 'accent'"
    [class.mq-badge--warning]="tone() === 'warning'"
    ><ng-content
  /></span>`,
})
export class MqBadge {
  readonly tone = input<'neutral' | 'accent' | 'warning'>('neutral');
}
