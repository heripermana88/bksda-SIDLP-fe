import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { OfflineService } from '@core/services/offline.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="nav">
      <div class="nav-brand">
        <span class="nav-dot"></span>
        <span class="nav-title">🌿 SIDLP SM BRBB</span>
      </div>

      @if (isLoggedIn()) {
        <!-- Desktop links -->
        <div class="nav-links">
          <a routerLink="/dashboard/monitoring" routerLinkActive="active">Dashboard</a>
          <a routerLink="/dashboard/peta" routerLinkActive="active">Peta GIS</a>
          <a routerLink="/dashboard/qr" routerLinkActive="active">QR Code</a>
        </div>

        @if (offlineQueue() > 0) {
          <div class="offline-badge">📵 {{ offlineQueue() }}</div>
        }

        <div class="nav-user">
          <span class="nav-name">{{ userName() }}</span>
          <button class="nav-logout" (click)="logout()">Keluar</button>
        </div>

        <!-- Hamburger (mobile only) -->
        <button class="hamburger" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">
          {{ menuOpen() ? '✕' : '☰' }}
        </button>
      }
    </nav>

    <!-- Mobile dropdown -->
    @if (isLoggedIn() && menuOpen()) {
      <div class="mobile-menu">
        <a routerLink="/dashboard/monitoring" routerLinkActive="active" (click)="menuOpen.set(false)">Dashboard</a>
        <a routerLink="/dashboard/peta"       routerLinkActive="active" (click)="menuOpen.set(false)">Peta GIS</a>
        <a routerLink="/dashboard/qr"         routerLinkActive="active" (click)="menuOpen.set(false)">QR Code</a>
        <div class="mobile-divider"></div>
        <div class="mobile-user">{{ userName() }}</div>
        <button class="mobile-logout" (click)="logout()">Keluar</button>
      </div>
    }
  `,
  styles: [`
    .nav {
      background: #1a4d2e;
      padding: 0 20px;
      height: 48px;
      display: flex;
      align-items: center;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .nav-brand { display: flex; align-items: center; gap: 8px; flex-shrink: 0 }
    .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e }
    .nav-title { color: white; font-size: 13px; font-weight: 700 }
    .nav-links { display: flex; gap: 20px; margin-left: auto }
    .nav-links a {
      color: rgba(255,255,255,.6); font-size: 13px; font-weight: 500;
      text-decoration: none; transition: color .15s; white-space: nowrap;
    }
    .nav-links a.active { color: #22c55e }
    .offline-badge {
      background: #374151; color: #d1d5db; font-size: 11px;
      padding: 2px 8px; border-radius: 12px; font-weight: 600; flex-shrink: 0;
    }
    .nav-user { display: flex; align-items: center; gap: 12px; margin-left: 8px; flex-shrink: 0 }
    .nav-name { color: rgba(255,255,255,.8); font-size: 12px; white-space: nowrap }
    .nav-logout {
      background: transparent; border: 1px solid rgba(255,255,255,.3);
      color: rgba(255,255,255,.7); padding: 4px 10px; border-radius: 5px;
      font-size: 11px; cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .nav-logout:hover { background: rgba(255,255,255,.1); color: white }
    .hamburger {
      display: none; background: transparent; border: none; color: white;
      font-size: 18px; cursor: pointer; margin-left: auto; padding: 4px 8px;
    }
    .mobile-menu {
      display: none;
      position: sticky; top: 48px; z-index: 999;
      background: #1a4d2e; flex-direction: column;
      padding: 8px 0; border-top: 1px solid rgba(255,255,255,.1);
    }
    .mobile-menu a {
      color: rgba(255,255,255,.7); font-size: 14px; font-weight: 500;
      text-decoration: none; padding: 12px 20px; display: block;
    }
    .mobile-menu a.active { color: #22c55e }
    .mobile-divider { height: 1px; background: rgba(255,255,255,.1); margin: 6px 0 }
    .mobile-user { color: rgba(255,255,255,.5); font-size: 12px; padding: 8px 20px }
    .mobile-logout {
      background: transparent; border: none; color: rgba(255,255,255,.7);
      font-size: 14px; padding: 12px 20px; text-align: left; cursor: pointer; width: 100%;
    }
    @media (max-width: 640px) {
      .nav-links { display: none }
      .nav-user   { display: none }
      .offline-badge { display: none }
      .hamburger  { display: block }
      .mobile-menu { display: flex }
    }
  `],
})
export class NavbarComponent {
  private readonly auth    = inject(AuthService);
  private readonly offline = inject(OfflineService);

  readonly isLoggedIn   = this.auth.isLoggedIn;
  readonly userName     = computed(() => this.auth.currentUser()?.name ?? '');
  readonly offlineQueue = this.offline.queueSize;
  readonly menuOpen     = signal(false);

  logout(): void {
    this.auth.logout();
  }
}
