import { Component } from '@angular/core';
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

  `],
})
export class AppComponent {
  readonly year = new Date().getFullYear();
}
