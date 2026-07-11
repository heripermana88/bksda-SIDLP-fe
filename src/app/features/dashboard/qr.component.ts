// ============================================================
// QrComponent — Manajemen QR Code Token
// Generate batch, tampilkan grid, print
// ============================================================

import {
  Component, inject, signal, computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';

interface QrItem {
  token: string;
  scanUrl: string;
  qrDataUrl: string;
  selected: boolean;
}

interface QrListItem {
  token: string;
  isUsed: boolean;
  createdAt: string;
  selected?: boolean;
}

@Component({
  selector: 'app-qr',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="qr-page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Manajemen QR Code</h1>
          <p class="page-sub">Generate token untuk dipasang di titik lahan</p>
        </div>
        <div class="header-actions">
          @if (generated().length > 0) {
            <button class="btn btn-outline" (click)="clearGenerated()">Bersihkan</button>
            <button class="btn btn-print" (click)="printQr()">🖨️ Print Semua</button>
          }
        </div>
      </div>

      <!-- Generate Panel -->
      <div class="gen-card">
        <div class="gen-title">Generate Token Baru</div>
        <div class="gen-row">
          <div class="field">
            <label>Jumlah Token</label>
            <input
              type="number"
              [(ngModel)]="genCount"
              min="1" max="50"
              class="input-num"
              placeholder="1–50"
            />
          </div>
          <div class="field">
            <label>Prefix Token</label>
            <input
              type="text"
              [(ngModel)]="genPrefix"
              class="input-text"
              placeholder="SMBRBB"
              maxlength="10"
            />
          </div>
          <button
            class="btn btn-primary gen-btn"
            [disabled]="generating()"
            (click)="generate()"
          >
            @if (generating()) {
              <span class="spin">⏳</span> Generating...
            } @else {
              ✦ Generate {{ genCount }} Token
            }
          </button>
        </div>
        @if (genError()) {
          <div class="gen-error">{{ genError() }}</div>
        }
      </div>

      <!-- Generated QR Grid -->
      @if (generated().length > 0) {
        <div class="section-label">
          ✅ {{ generated().length }} Token Berhasil Dibuat
          <span class="section-sub">— Klik kartu untuk pilih, lalu print</span>
        </div>
        <div class="qr-grid" id="print-area">
          @for (item of generated(); track item.token) {
            <div
              class="qr-card"
              [class.selected]="item.selected"
              (click)="toggleSelect(item)"
            >
              <img [src]="item.qrDataUrl" [alt]="item.token" class="qr-img" />
              <div class="qr-token">{{ item.token }}</div>
              <div class="qr-url">{{ item.scanUrl }}</div>
              @if (item.selected) {
                <div class="qr-check">✓</div>
              }
            </div>
          }
        </div>
      }

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Token List -->
      <div class="section-label">
        Riwayat Token
        <button class="btn-refresh" (click)="loadList()">↻ Refresh</button>
        @if (selectedFromList().length > 0) {
          <button class="btn btn-print reprint-btn" (click)="reprintSelected()" [disabled]="reprinting()">
            {{ reprinting() ? '⏳ Menyiapkan...' : '🖨️ Print ' + selectedFromList().length + ' Token' }}
          </button>
        }
      </div>

      @if (listLoading()) {
        <div class="list-loading">Memuat daftar token...</div>
      } @else if (tokenList().length === 0) {
        <div class="list-empty">Belum ada token yang dibuat.</div>
      } @else {
        <div class="list-table">
          <div class="list-head">
            <span></span>
            <span>Token</span>
            <span>Status</span>
            <span>Dibuat</span>
          </div>
          @for (item of tokenList(); track item.token) {
            <div class="list-row" [class.row-used]="item.isUsed">
              <span class="cb-wrap">
                @if (!item.isUsed) {
                  <input
                    type="checkbox"
                    [checked]="item.selected"
                    (change)="toggleListSelect(item)"
                    (click)="$event.stopPropagation()"
                  />
                }
              </span>
              <span class="mono">{{ item.token }}</span>
              <span class="badge" [class]="item.isUsed ? 'badge-used' : 'badge-free'">
                {{ item.isUsed ? 'Terpakai' : 'Tersedia' }}
              </span>
              <span class="date-cell">{{ formatDate(item.createdAt) }}</span>
            </div>
          }
        </div>
        <div class="list-footer">
          <span class="list-total">Total: {{ listTotal() }} token</span>
          @if (availableCount() > 0) {
            <button class="btn-select-all" (click)="selectAllAvailable()">
              Pilih semua yang tersedia ({{ availableCount() }})
            </button>
          }
        </div>
      }

      <!-- Hidden print area untuk reprint dari riwayat -->
      @if (reprintItems().length > 0) {
        <div id="reprint-area" class="reprint-area">
          @for (item of reprintItems(); track item.token) {
            <div class="qr-card">
              <img [src]="item.qrDataUrl" [alt]="item.token" class="qr-img" />
              <div class="qr-token">{{ item.token }}</div>
              <div class="qr-url">{{ item.scanUrl }}</div>
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .qr-page { padding: 20px; max-width: 1200px; margin: 0 auto }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 12px; flex-wrap: wrap }
    .page-title { font-size: 20px; font-weight: 800; color: #1f2937; margin-bottom: 2px }
    .page-sub { font-size: 13px; color: #6b7280 }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap }

    /* Buttons */
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: opacity .15s }
    .btn:disabled { opacity: .5; cursor: not-allowed }
    .btn-primary { background: #1a4d2e; color: white }
    .btn-primary:not(:disabled):hover { background: #2d7a4f }
    .btn-outline { background: white; color: #374151; border: 1.5px solid #d1d5db }
    .btn-outline:hover { border-color: #9ca3af }
    .btn-print { background: #1d4ed8; color: white }
    .btn-print:hover { background: #1e40af }
    .btn-refresh { background: none; border: none; cursor: pointer; color: #6b7280; font-size: 13px; margin-left: 8px; padding: 2px 6px; border-radius: 4px }
    .btn-refresh:hover { background: #f3f4f6; color: #374151 }

    /* Generate Panel */
    .gen-card {
      background: white; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 20px; margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .gen-title { font-size: 14px; font-weight: 700; color: #374151; margin-bottom: 14px }
    .gen-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap }
    .field { display: flex; flex-direction: column; gap: 5px }
    .field label { font-size: 12px; font-weight: 600; color: #6b7280 }
    .input-num { width: 100px; padding: 8px 12px; border: 1.5px solid #d1d5db; border-radius: 7px; font-size: 14px; font-weight: 600 }
    .input-text { width: 140px; padding: 8px 12px; border: 1.5px solid #d1d5db; border-radius: 7px; font-size: 14px }
    .input-num:focus, .input-text:focus { outline: none; border-color: #1a4d2e }
    .gen-btn { align-self: flex-end; white-space: nowrap }
    .gen-error { margin-top: 10px; padding: 8px 12px; background: #fef2f2; color: #b91c1c; border-radius: 6px; font-size: 13px }
    .spin { display: inline-block; animation: spin .8s linear infinite }
    @keyframes spin { to { transform: rotate(360deg) } }

    /* Section Label */
    .section-label { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 14px; display: flex; align-items: center }
    .section-sub { font-size: 12px; color: #9ca3af; font-weight: 400; margin-left: 6px }

    /* QR Grid */
    .qr-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .qr-card {
      background: white; border: 2px solid #e5e7eb; border-radius: 12px;
      padding: 16px; text-align: center; cursor: pointer;
      transition: border-color .15s, box-shadow .15s;
      position: relative;
    }
    .qr-card:hover { border-color: #1a4d2e; box-shadow: 0 2px 8px rgba(26,77,46,.15) }
    .qr-card.selected { border-color: #22c55e; box-shadow: 0 2px 8px rgba(34,197,94,.2) }
    .qr-img { width: 100%; max-width: 160px; margin: 0 auto 10px; border-radius: 6px }
    .qr-token { font-family: monospace; font-size: 11px; font-weight: 700; color: #1a4d2e; margin-bottom: 4px }
    .qr-url { font-size: 9px; color: #9ca3af; word-break: break-all }
    .qr-check {
      position: absolute; top: 8px; right: 10px;
      width: 22px; height: 22px; border-radius: 50%;
      background: #22c55e; color: white; font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    /* Divider */
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 8px 0 24px }

    /* Token List */
    .list-loading, .list-empty { color: #9ca3af; font-size: 13px; padding: 20px 0 }
    .list-table { background: white; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 10px }
    .list-head {
      display: grid; grid-template-columns: 28px 1fr 100px 160px;
      padding: 10px 16px; background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase;
    }
    .list-row {
      display: grid; grid-template-columns: 28px 1fr 100px 160px;
      padding: 10px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px;
      align-items: center;
    }
    .list-row:last-child { border-bottom: none }
    .list-row:hover { background: #f9fafb }
    .list-row.row-used { opacity: .6 }
    .cb-wrap { display: flex; align-items: center }
    .cb-wrap input[type=checkbox] { width: 15px; height: 15px; cursor: pointer; accent-color: #1a4d2e }
    .mono { font-family: monospace; font-size: 12px; font-weight: 600; color: #1a4d2e }
    .badge { padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-block }
    .badge-free { background: #dcfce7; color: #15803d }
    .badge-used { background: #f3f4f6; color: #6b7280 }
    .date-cell { font-size: 12px; color: #6b7280 }
    .list-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px }
    .list-total { font-size: 12px; color: #9ca3af }
    .btn-select-all { background: none; border: none; font-size: 12px; color: #1a4d2e; cursor: pointer; text-decoration: underline; padding: 0 }
    .reprint-btn { margin-left: 12px; padding: 5px 14px; font-size: 12px }

    /* Reprint area — hidden on screen, shown on print */
    .reprint-area { display: none }

    /* Print styles */
    @media print {
      .qr-page > *:not(#print-area):not(.reprint-area) { display: none !important }
      #print-area, .reprint-area {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px; margin: 0;
         }
      .qr-card { border: 1px solid #ccc; break-inside: avoid; cursor: default }
      .qr-check { display: none !important }
    }
  `],
})
export class QrComponent {
  private readonly api = inject(ApiService);

  genCount  = 5;
  genPrefix = 'SMBRBB';

  readonly generating   = signal(false);
  readonly genError     = signal('');
  readonly generated    = signal<QrItem[]>([]);
  readonly listLoading  = signal(false);
  readonly tokenList    = signal<QrListItem[]>([]);
  readonly listTotal    = signal(0);
  readonly reprinting   = signal(false);
  readonly reprintItems = signal<QrItem[]>([]);

  readonly selectedCount = computed(() =>
    this.generated().filter(x => x.selected).length
  );

  readonly selectedFromList = computed(() =>
    this.tokenList().filter(x => !x.isUsed && x.selected)
  );

  readonly availableCount = computed(() =>
    this.tokenList().filter(x => !x.isUsed).length
  );

  constructor() { this.loadList(); }

  async generate(): Promise<void> {
    if (this.genCount < 1 || this.genCount > 50) {
      this.genError.set('Jumlah token harus antara 1-50');
      return;
    }
    this.generating.set(true);
    this.genError.set('');
    try {
      const res = await this.api.generateQr(this.genCount, window.location.origin);
      this.generated.set(res.tokens.map(t => ({ ...t, selected: true })));
      await this.loadList();
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      this.genError.set(e?.error?.message ?? 'Gagal generate token');
    } finally {
      this.generating.set(false);
    }
  }

  async loadList(): Promise<void> {
    this.listLoading.set(true);
    try {
      const res = await this.api.listQr({ limit: 100 });
      this.tokenList.set(res.data);
      this.listTotal.set(res.total);
    } catch { /* ignore */ } finally {
      this.listLoading.set(false);
    }
  }

  toggleSelect(item: QrItem): void {
    this.generated.update(list =>
      list.map(x => x.token === item.token ? { ...x, selected: !x.selected } : x)
    );
  }

  toggleListSelect(item: QrListItem): void {
    this.tokenList.update(list =>
      list.map(x => x.token === item.token ? { ...x, selected: !x.selected } : x)
    );
  }

  selectAllAvailable(): void {
    this.tokenList.update(list =>
      list.map(x => x.isUsed ? x : { ...x, selected: true })
    );
  }

  async reprintSelected(): Promise<void> {
    const tokens = this.selectedFromList();
    if (!tokens.length) return;
    this.reprinting.set(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qrMod = await import('qrcode');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const QRCode = (qrMod as any).default ?? qrMod;
      const items: QrItem[] = await Promise.all(
        tokens.map(async t => {
          const scanUrl   = `${window.location.origin}/scan/${t.token}`;
          const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 300, margin: 2 });
          return { token: t.token, scanUrl, qrDataUrl, selected: true };
        })
      );
      this.reprintItems.set(items);
      setTimeout(() => window.print(), 100);
    } finally {
      this.reprinting.set(false);
    }
  }

  clearGenerated(): void { this.generated.set([]); }
  printQr(): void { window.print(); }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
