import { Component, inject, input, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, LahanInfo } from '@core/services/api.service';

type ScanState = 'loading' | 'registered' | 'unregistered' | 'error';

const STATUS_LABEL: Record<string, string> = {
  kemitraan: '✓ Kemitraan',
  verifikasi: '⏳ Verifikasi',
  ilegal: '🚨 Ilegal',
  baru: '🔵 Baru',
  ditunda: '⏸ Ditunda',
};

const STATUS_CLASS: Record<string, string> = {
  kemitraan: 'badge-km',
  verifikasi: 'badge-vf',
  ilegal: 'badge-il',
  baru: 'badge-baru',
  ditunda: 'badge-ditunda',
};

@Component({
  selector: 'app-scan',
  standalone: true,
  template: `
    <div class="page">
      <!-- Header -->
      <div class="hero">
        <div class="hero-sub">BBKSDA Riau</div>
        <div class="hero-title">Pemetaan Partisipatif</div>
        <div class="hero-sub2">SM Bukit Rimbang Bukit Baling</div>
      </div>

      <!-- Loading -->
      @if (state() === 'loading') {
        <div class="loading-card">
          <div class="spinner"></div>
          <p>Memuat data lahan...</p>
        </div>
      }

      <!-- Kondisi A: Terdaftar -->
      @if (state() === 'registered' && lahan()) {
        <div class="card">
          <div class="card-header">
            <span class="card-name">{{ lahan()!.nama }}</span>
            <span class="badge" [class]="statusClass()">
              {{ statusLabel() }}
            </span>
          </div>
          <div class="grid2">
            <div class="stat"><div class="stat-l">Luas</div><div class="stat-v">{{ lahan()!.luasHa }} Ha</div></div>
            <div class="stat"><div class="stat-l">Tanaman</div><div class="stat-v">{{ lahan()!.jenisTanaman }}</div></div>
            <div class="stat"><div class="stat-l">Zona</div><div class="stat-v">{{ lahan()!.zonaNama ?? '—' }}</div></div>
            <div class="stat"><div class="stat-l">ID</div><div class="stat-v mono">{{ lahan()!.lahanId }}</div></div>
          </div>
          <div class="meta">📅 {{ formatDate(lahan()!.updatedAt) }}</div>
          <button class="btn btn-primary" (click)="goToForm()">
            Perbarui Data Lahan →
          </button>
        </div>
        <div class="info-box info-green">
          ✅ Lahan terdata dalam Kemitraan Konservasi SM BRBB
        </div>
      }

      <!-- Kondisi B: Belum Terdaftar -->
      @if (state() === 'unregistered') {
        <div class="card card-center">
          <div class="empty-icon">📋</div>
          <div class="empty-title">Lahan Belum Terdaftar</div>
          <div class="empty-desc">
            QR Code ini belum memiliki data.<br>
            Silakan isi formulir pendataan.
          </div>
          <button class="btn btn-success" (click)="goToForm()">
            Daftarkan Lahan Ini →
          </button>
        </div>
        <div class="info-box info-blue">
          🛡️ Data akan diverifikasi petugas BBKSDA Riau
        </div>
        <div class="token-chip">{{ token() }}</div>
      }

      <!-- Error -->
      @if (state() === 'error') {
        <div class="card card-center">
          <div class="empty-icon">❌</div>
          <div class="empty-title">Token Tidak Valid</div>
          <div class="empty-desc">QR Code tidak dikenali oleh sistem.</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 400px; margin: 0 auto; padding: 12px }
    .hero { text-align: center; padding: 16px 0 20px }
    .hero-sub { font-size: 11px; color: #9ca3af; font-weight: 500 }
    .hero-title { font-size: 22px; font-weight: 800; color: #1a4d2e; margin: 4px 0 }
    .hero-sub2 { font-size: 12px; color: #6b7280 }
    .loading-card { text-align: center; padding: 48px; color: #9ca3af }
    .spinner {
      width: 32px; height: 32px; border: 3px solid #e5e7eb;
      border-top-color: #22c55e; border-radius: 50%;
      animation: spin .8s linear infinite; margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg) } }
    .card {
      background: white; border-radius: 12px;
      border: 1px solid #e5e7eb; padding: 14px; margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .card-center { text-align: center; padding: 28px 14px }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px }
    .card-name { font-size: 15px; font-weight: 700; color: #1f2937 }
    .badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700 }
    .badge-km  { background: #dcfce7; color: #15803d }
    .badge-vf  { background: #fef9c3; color: #92400e }
    .badge-il  { background: #fee2e2; color: #991b1b }
    .badge-baru { background: #eff6ff; color: #1d4ed8 }
    .badge-ditunda { background: #f3f4f6; color: #4b5563 }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px }
    .stat { background: #f9fafb; border-radius: 6px; padding: 7px 10px }
    .stat-l { font-size: 9px; color: #9ca3af; font-weight: 500; margin-bottom: 2px }
    .stat-v { font-size: 13px; font-weight: 700; color: #1f2937 }
    .mono { font-family: monospace; font-size: 10px !important }
    .meta { font-size: 11px; color: #9ca3af; background: #f9fafb; border-radius: 5px; padding: 5px 8px; margin-bottom: 12px }
    .btn { border-radius: 8px; padding: 11px; font-size: 13px; font-weight: 700; width: 100%; border: none; cursor: pointer }
    .btn-primary { background: #1a4d2e; color: white }
    .btn-success { background: #22c55e; color: white }
    .empty-icon { font-size: 48px; margin-bottom: 12px }
    .empty-title { font-size: 17px; font-weight: 800; color: #1f2937; margin-bottom: 8px }
    .empty-desc { font-size: 13px; color: #6b7280; line-height: 1.6; margin-bottom: 20px }
    .info-box { border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 12px; line-height: 1.5 }
    .info-green { background: #f0fdf4; color: #166534; border-left: 3px solid #22c55e }
    .info-blue  { background: #eff6ff; color: #1e40af; border-left: 3px solid #3b82f6; text-align: center }
    .token-chip {
      text-align: center; font-family: monospace; font-size: 11px;
      color: #9ca3af; background: #f9fafb; border-radius: 5px;
      padding: 4px 10px; display: inline-block; margin: 0 auto; display: block;
    }
  `],
})
export class ScanComponent implements OnInit {
  private readonly api    = inject(ApiService);
  private readonly router = inject(Router);

  // Route param via withComponentInputBinding()
  readonly token = input.required<string>();

  readonly state = signal<ScanState>('loading');
  readonly lahan = signal<LahanInfo | null>(null);

  readonly statusLabel = computed(() =>
    STATUS_LABEL[this.lahan()?.status ?? ''] ?? this.lahan()?.status ?? ''
  );
  readonly statusClass = computed(() =>
    STATUS_CLASS[this.lahan()?.status ?? ''] ?? ''
  );

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.api.getByToken(this.token());
      if (res.registered && res.lahan) {
        this.lahan.set(res.lahan);
        this.state.set('registered');
      } else {
        this.state.set('unregistered');
      }
    } catch {
      this.state.set('error');
    }
  }

  goToForm(): void {
    this.router.navigate(['/form', this.token()]);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
}
