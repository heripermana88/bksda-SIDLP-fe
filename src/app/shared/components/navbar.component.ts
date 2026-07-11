import { Component, inject, computed } from '@angular/core';
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
        <div class="nav-links">
          <a routerLink="/dashboard/monitoring" routerLinkActive="active">Dashboard</a>
          <a routerLink="/dashboard/peta" routerLinkActive="active">Peta GIS</a>
          <a routerLink="/dashboard/qr" routerLinkActive="active">QR Code</a>
        </div>

        @if (offlineQueue() > 0) {
          <div class="offline-badge" title="{{ offlineQueue() }} laporan menunggu kirim">
            📵 {{ offlineQueue() }}
          </div>
        }

        <div class="nav-user">
          <span class="nav-name">{{ userName() }}</span>
          <button class="nav-logout" (click)="logout()">Keluar</button>
        </div>
      }
    </nav>
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
    .nav-brand { display: flex; align-items: center; gap: 8px }
    .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e }
    .nav-title { color: white; font-size: 13px; font-weight: 700 }
    .nav-links { display: flex; gap: 20px; margin-left: auto }
    .nav-links a {
      color: rgba(255,255,255,.6);
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: color .15s;
    }
    .nav-links a.active { color: #22c55e }
    .offline-badge {
      background: #374151;
      color: #d1d5db;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    .nav-user { display: flex; align-items: center; gap: 12px; margin-left: 8px }
    .nav-name { color: rgba(255,255,255,.8); font-size: 12px }
    .nav-logout {
      background: transparent;
      border: 1px solid rgba(255,255,255,.3);
      color: rgba(255,255,255,.7);
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 11px;
      cursor: pointer;
      transition: all .15s;
    }
    .nav-logout:hover {
      background: rgba(255,255,255,.1);
      color: white;
    }
  `],
})
export class NavbarComponent {
  private readonly auth    = inject(AuthService);
  private readonly offline = inject(OfflineService);

  readonly isLoggedIn  = this.auth.isLoggedIn;
  readonly userName    = computed(() => this.auth.currentUser()?.name ?? '');
  readonly offlineQueue = this.offline.queueSize;

  logout(): void {
    this.auth.logout();
  }
}
