import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';
import { AdminService } from './admin-service';

describe('AdminService: errores de acceso', () => {
  const expire = vi.fn();
  const navigateByUrl = vi.fn().mockResolvedValue(true);
  let service: AdminService;
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: AuthService, useValue: { expire } },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    service = TestBed.inject(AdminService);
  });
  it('muestra el rechazo de origen sin convertirlo en una sesión caducada', () => {
    const message = service.message(
      new HttpErrorResponse({
        status: 403,
        error: { message: 'Solicitud de otro origen rechazada.' },
      }),
    );
    expect(message).toBe('Solicitud de otro origen rechazada.');
    expect(expire).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
  it('mantiene el error de credenciales al entrar', () => {
    expect(
      service.message(
        new HttpErrorResponse({
          status: 401,
          error: { message: 'Usuario o contraseña incorrectos.' },
        }),
      ),
    ).toBe('Usuario o contraseña incorrectos.');
    expect(expire).not.toHaveBeenCalled();
  });
  it('solicita volver a acceder cuando el servidor identifica una sesión ausente o caducada', () => {
    expect(
      service.message(
        new HttpErrorResponse({
          status: 403,
          error: { code: 'SESSION_REQUIRED', message: 'Necesitas acceder como administrador.' },
        }),
      ),
    ).toBe('La sesión ha caducado. Vuelve a acceder.');
    expect(expire).toHaveBeenCalledOnce();
    expect(navigateByUrl).toHaveBeenCalledWith('/acceso');
  });
});
