import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar />
    <main>
      <router-outlet />
    </main>
    <footer class="footer">
      &copy; {{ year }} <strong>bbksda_riau</strong>
      &nbsp;&middot;&nbsp; <span class="dev">adont</span>
      &nbsp;&middot;&nbsp; SIDLP SM Bukit Rimbang Bukit Baling
    </footer>

    @if (showInstallBanner()) {
      <div class="install-banner">
        <div class="install-banner__icon">🌿</div>
        <div class="install-banner__text">
          <strong>Install SIDLP</strong>
          <span>Akses lebih cepat, bisa offline</span>
        </div>
        <button class="install-banner__btn" (click)="installPwa()">Install</button>
        <button class="install-banner__close" (click)="dismissBanner()">✕</button>
      </div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    main {
      flex: 1;
      overflow-y: auto;
      background: #f9fafb;
    }
    .footer {
      background: #1a4d2e;
      color: rgba(255,255,255,.5);
      text-align: center;
      font-size: 11px;
      padding: 14px 20px;
      flex-shrink: 0;
      position: relative;
    }
    .footer strong { color: rgba(255,255,255,.9); font-size: 13px }
    .dev { color: rgba(255,255,255,.2); font-size: 7px }

    /* PWA Install Banner */
    .install-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #fff;
      border-top: 3px solid #1a4d2e;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 -4px 20px rgba(0,0,0,.15);
      z-index: 9999;
      animation: slideUp .3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .install-banner__icon { font-size: 28px; flex-shrink: 0; }
    .install-banner__text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .install-banner__text strong { font-size: 14px; color: #1a4d2e; }
    .install-banner__text span   { font-size: 12px; color: #6b7280; }
    .install-banner__btn {
      background: #1a4d2e;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
    }
    .install-banner__close {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      flex-shrink: 0;
    }
  `],
})
export class AppComponent implements OnInit {
  readonly year = new Date().getFullYear();
  readonly showInstallBanner = signal(false);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  ngOnInit(): void {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.showInstallBanner.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.showInstallBanner.set(false);
      this.deferredPrompt = null;
    });
  }

  async installPwa(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.showInstallBanner.set(false);
    }
    this.deferredPrompt = null;
  }

  dismissBanner(): void {
    this.showInstallBanner.set(false);
  }
}

// Extend Window interface for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
