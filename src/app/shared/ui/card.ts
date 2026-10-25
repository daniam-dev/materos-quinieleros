import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'mq-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mq-card' },
  template: '<ng-content />',
})
export class MqCard {}
