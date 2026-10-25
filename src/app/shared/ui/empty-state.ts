import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
  selector: 'mq-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="empty-state" role="status">
    <h2>{{ title() }}</h2>
    <p>{{ message() }}</p>
    <ng-content />
  </div>`,
})
export class MqEmptyState {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
}
