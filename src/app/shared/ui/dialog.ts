import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
@Component({
  selector: 'mq-dialog',
  imports: [DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p-dialog
    [header]="title()"
    [(visible)]="visible"
    [modal]="true"
    [draggable]="false"
    [resizable]="false"
    [dismissableMask]="true"
    [style]="{ width: 'min(36rem, calc(100vw - 2rem))' }"
    [closeButtonProps]="{ ariaLabel: 'Cerrar explicación' }"
    ><div class="dialog-prose"><ng-content /></div
  ></p-dialog>`,
})
export class MqDialog {
  readonly title = input.required<string>();
  readonly visible = model(false);
}
