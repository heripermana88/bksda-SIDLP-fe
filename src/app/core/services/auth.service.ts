// ============================================================
// AuthService — JWT token management (memory + signal)
// Access token disimpan di memory (bukan localStorage)
// Refresh token dikirim via body untuk MVP
// ============================================================

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';

const AUTH_BASE = `${environment.apiBase || '/api'}/auth`;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

const SESSION_KEY = 'sidlp_session';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  // ── Signals ───────────────────────────────────────────────
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user        = signal<AuthUser | null>(null);
  private _refreshToken: string | null = null;
  private _refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn  = computed(() => this._accessToken() !== null);
  readonly isAdmin     = computed(
    () => this._user()?.role === 'admin' || this._user()?.role === 'superadmin'
  );

  constructor() {
    // Restore session dari sessionStorage saat app load / refresh
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const session: StoredSession = JSON.parse(raw);
        if (session.accessToken && session.user) {
          this._accessToken.set(session.accessToken);
          this._user.set(session.user);
          this._refreshToken = session.refreshToken ?? null;
        }
      }
    } catch { /* ignore parse error */ }
  }

  // ── Login ──────────────────────────────────────────────────
  async login(email: string, password: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await firstValueFrom(
      this.http.post<any>(`${AUTH_BASE}/login`, { email, password })
    );

    if (!raw) throw new Error('Login gagal');

    const accessToken: string  = raw['accessToken']  ?? raw['access_token'];
    const refreshToken: string = raw['refreshToken']  ?? raw['refresh_token'];
    const expiresIn: number    = raw['expiresIn']     ?? raw['expires_in'] ?? 900;
    const user: AuthUser       = raw['user'] ?? raw['User'];

    if (!accessToken) throw new Error('Token tidak ditemukan dalam response');

    this._accessToken.set(accessToken);
    this._user.set(user);
    this._refreshToken = refreshToken ?? null;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken, refreshToken, user }));
    this._scheduleRefresh(expiresIn);
  }

  // ── Logout ─────────────────────────────────────────────────
  async logout(): Promise<void> {
    if (this._refreshToken) {
      try {
        await firstValueFrom(
          this.http.post(`${AUTH_BASE}/logout`, { refreshToken: this._refreshToken })
        );
      } catch { /* ignore */ }
    }
    this._clearSession();
    await this.router.navigate(['/login']);
  }

  // ── Refresh ────────────────────────────────────────────────
  async refreshAccessToken(): Promise<string | null> {
    if (!this._refreshToken) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await firstValueFrom(
        this.http.post<any>(`${AUTH_BASE}/refresh`, { refreshToken: this._refreshToken })
      );
      if (!raw) return null;
      const accessToken: string = raw['accessToken'] ?? raw['access_token'];
      const expiresIn: number   = raw['expiresIn']   ?? raw['expires_in'] ?? 900;
      this._accessToken.set(accessToken);
      // Update sessionStorage dengan access token baru
      const user = this._user();
      if (user && this._refreshToken) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          accessToken, refreshToken: this._refreshToken, user
        }));
      }
      this._scheduleRefresh(expiresIn);
      return accessToken;
    } catch {
      this._clearSession();
      return null;
    }
  }

  // ── Internal ───────────────────────────────────────────────
  private _scheduleRefresh(expiresInSec: number): void {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    // Refresh 60 detik sebelum expired
    const delayMs = Math.max((expiresInSec - 60) * 1000, 0);
    this._refreshTimer = setTimeout(() => this.refreshAccessToken(), delayMs);
  }

  private _clearSession(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._refreshToken = null;
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = null;
    sessionStorage.removeItem(SESSION_KEY);
  }
}
