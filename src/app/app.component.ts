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
      &copy; {{ year }} <strong>Dona Perdana</strong> &nbsp;·&nbsp; SIDLP SM Bukit Rimbang Bukit Baling
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
    }
    .footer strong { color: rgba(255,255,255,.8) }
  `],
})
export class AppComponent {
  readonly year = new Date().getFullYear();
}
