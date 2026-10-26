import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth-service';
import { AdminService } from '../../core/data/admin-service';
import { MqPageHeader } from '../../shared/ui/page-header';

@Component({
  selector: 'mq-login-page',
  imports: [FormsModule, MqPageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<mq-page-header title="Acceder"
      ><span metadata>Acceso de Daniel Arroyo</span></mq-page-header
    >
    <div class="access-form">
      @if (auth.failed()) {
        <p role="alert">No se ha podido comprobar el acceso. Vuelve a intentarlo.</p>
        <button class="mq-button" (click)="auth.refresh()">Reintentar</button>
      } @else if (!auth.available()) {
        <p role="status">El acceso de administrador todavía no está disponible.</p>
      } @else {
        <form (ngSubmit)="login()" class="admin-form">
          <label for="username">Usuario</label>
          <input
            id="username"
            name="username"
            autocomplete="username"
            required
            [(ngModel)]="username"
            [disabled]="busy()"
          />
          <label for="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            maxlength="256"
            [(ngModel)]="password"
            [disabled]="busy()"
          />
          @if (error()) {
            <p role="alert" class="form-error">{{ error() }}</p>
          }
          <button
            type="submit"
            class="mq-button mq-button--primary"
            [disabled]="busy() || !username || !password"
            [attr.aria-busy]="busy()"
          >
            {{ busy() ? 'Accediendo…' : 'Acceder' }}
          </button>
        </form>
      }
    </div>`,
})
export class LoginPage {
  readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  username = 'daniel-arroyo';
  password = '';
  async login(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.username.trim(), this.password);
      this.password = '';
      await this.router.navigateByUrl('/administracion');
    } catch (error) {
      this.error.set(this.admin.message(error));
    } finally {
      this.busy.set(false);
    }
  }
}
