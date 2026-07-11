import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-logo">🌿</div>
        <h1>SIDLP Scan-Me</h1>
        <p>SM Bukit Rimbang Bukit Baling · BBKSDA Riau</p>

        <form (ngSubmit)="onSubmit()">
          <label>
            <span>Email</span>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="petugas@bbksdariau.id"
              required
              [disabled]="loading()"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              placeholder="••••••••"
              required
              [disabled]="loading()"
            />
          </label>

          @if (errorMsg()) {
            <div class="error-box">{{ errorMsg() }}</div>
          }

          <button type="submit" [disabled]="loading() || !email || !password">
            @if (loading()) { Memproses... } @else { Masuk ke Dashboard }
          </button>
        </form>

        <div class="login-footer">
          BBKSDA Riau · Sistem Informasi Data Lahan Partisipatif
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrap {
      min-height: 100vh;
      background: #f0fdf4;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-card {
      background: white;
      border-radius: 16px;
      padding: 40px 36px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 24px rgba(0,0,0,.1);
      text-align: center;
    }
    .login-logo { font-size: 48px; margin-bottom: 12px }
    h1 { font-size: 22px; font-weight: 800; color: #1a4d2e; margin-bottom: 4px }
    p { font-size: 12px; color: #9ca3af; margin-bottom: 28px }
    form { display: flex; flex-direction: column; gap: 14px; text-align: left }
    label { display: flex; flex-direction: column; gap: 5px }
    label span { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .5px }
    input {
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color .15s;
    }
    input:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.12) }
    button {
      background: #1a4d2e;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 4px;
      transition: background .15s;
    }
    button:hover:not(:disabled) { background: #2d7a4f }
    button:disabled { background: #9ca3af; cursor: not-allowed }
    .error-box {
      background: #fee2e2;
      color: #991b1b;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 13px;
    }
    .login-footer {
      margin-top: 24px;
      font-size: 11px;
      color: #9ca3af;
    }
  `],
})
export class LoginComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  email    = '';
  password = '';

  readonly loading  = signal(false);
  readonly errorMsg = signal('');

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.errorMsg.set('');

    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigate(['/dashboard/monitoring']);
    } catch (err: unknown) {
      this.errorMsg.set('Email atau password salah. Silakan coba lagi.');
    } finally {
      this.loading.set(false);
    }
  }
}
