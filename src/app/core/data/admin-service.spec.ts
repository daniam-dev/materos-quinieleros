import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { expire } },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    });
    service = TestBed.inject(AdminService);
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('envía la revisión privada sin activar las precondiciones HTTP del proxy', async () => {
    const saved = service.save({ type: 'sync' }, 'initial');
    const request = TestBed.inject(HttpTestingController).expectOne('/api/admin');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('X-MQ-Revision')).toBe('initial');
    expect(request.request.headers.has('If-Match')).toBe(false);
    expect(request.request.body).toEqual({ type: 'sync' });
    request.flush({ saved: true });
    await saved;
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
