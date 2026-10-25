import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'mq-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button
    type="button"
    class="mq-button"
    [class]="'mq-button mq-button--' + variant()"
    [disabled]="disabled() || loading()"
    [attr.aria-busy]="loading()"
    [attr.aria-pressed]="pressed()"
    (click)="activated.emit()"
  >
    @if (loading()) {
      <span class="spinner" aria-hidden="true"></span>
    }
    <ng-content />
  </button>`,
})
export class MqButton {
  readonly variant = input<'primary' | 'secondary' | 'danger' | 'quiet'>('secondary');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly pressed = input<boolean | null>(null);
  readonly activated = output<void>();
}
