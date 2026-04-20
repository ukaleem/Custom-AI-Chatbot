import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';

export interface AdminSession {
  accessToken: string;
  apiKey: string;
  tenant: { id: string; slug: string; name: string; plan: string; botConfig: Record<string, unknown> };
}

const SESSION_KEY = 'cac_admin_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly session = signal<AdminSession | null>(this.loadSession());

  login(slug: string, password: string) {
    return this.api.post<AdminSession>('admin/login', { slug, password }).pipe(
      tap((s) => {
        localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        this.session.set(s);
      }),
    );
  }

  logout() {
    localStorage.removeItem(SESSION_KEY);
    this.session.set(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null { return this.session()?.accessToken ?? null; }
  get apiKey(): string | null { return this.session()?.apiKey ?? null; }
  get isLoggedIn(): boolean { return !!this.token; }

  private loadSession(): AdminSession | null {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null'); }
    catch { return null; }
  }
}
