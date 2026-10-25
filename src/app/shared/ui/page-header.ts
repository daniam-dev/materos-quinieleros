import { ChangeDetectionStrategy, Component, input } from '@angular/core';
@Component({
  selector: 'mq-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<header class="page-heading">
    <div>
      <h1>{{ title() }}</h1>
      <div class="page-meta"><ng-content select="[metadata]" /></div>
    </div>
    <div class="page-heading-actions"><ng-content /></div>
  </header>`,
})
export class MqPageHeader {
  readonly title = input.required<string>();
}
