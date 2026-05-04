import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SaSession {
  accessToken: string;
  email: string;
  name: string;
}

const SA_SESSION_KEY = 'sa_jwt_session';

@Injectable({ providedIn: 'root' })
export class SaAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  readonly session = signal<SaSession | null>(this.load());

  login(email: string, password: string) {
    return this.http.post<SaSession>(`${this.base}/super-admin/login`, { email, password }).pipe(
      tap(s => {
        sessionStorage.setItem(SA_SESSION_KEY, JSON.stringify(s));
        this.session.set(s);
      }),
    );
  }

  logout() {
    sessionStorage.removeItem(SA_SESSION_KEY);
    this.session.set(null);
    this.router.navigate(['/sa/login']);
  }

  get token(): string | null { return this.session()?.accessToken ?? null; }
  get isLoggedIn(): boolean { return !!this.token; }

  private load(): SaSession | null {
    try { return JSON.parse(sessionStorage.getItem(SA_SESSION_KEY) ?? 'null'); }
    catch { return null; }
  }
}
