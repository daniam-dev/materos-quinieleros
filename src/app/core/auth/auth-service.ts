import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface AdminUser {
  readonly id: string;
  readonly name: string;
  readonly role: 'admin';
}
interface Session {
  readonly configured: boolean;
  readonly user: AdminUser | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly current = signal<AdminUser | null>(null);
  readonly user = this.current.asReadonly();
  readonly isAdmin = computed(() => this.current()?.role === 'admin');
  readonly available = signal(false);
  readonly failed = signal(false);
  readonly ready = this.refresh();

  async refresh(): Promise<void> {
    try {
      const session = await firstValueFrom(this.http.get<Session>('/api/auth'));
      this.current.set(session.user);
      this.available.set(session.configured);
      this.failed.set(false);
    } catch {
      this.current.set(null);
      this.failed.set(true);
    }
  }
  async login(username: string, password: string): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<Session>('/api/auth', { username, password }),
    );
    this.current.set(session.user);
  }
  async logout(): Promise<void> {
    await firstValueFrom(this.http.delete('/api/auth'));
    this.current.set(null);
  }
  expire(): void {
    this.current.set(null);
  }
}
