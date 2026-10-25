import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'mq-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<div class="empty-state" role="status"><span class="spinner" aria-hidden="true"></span><p>Cargando las quinielas…</p></div>',
})
export class MqLoadingState {}
