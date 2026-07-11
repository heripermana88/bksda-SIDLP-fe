// ============================================================
// DetailModalComponent — Modal detail laporan lahan
// Menampilkan info lengkap + foto + update status
// ============================================================

import {
  Component, input, output, inject, signal, computed, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, LahanInfo } from '@core/services/api.service';

@Component({
  selector: 'app-detail-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="backdrop" (click)="onClose()"></div>

    <!-- Panel -->
    <div class="panel" role="dialog" aria-modal="true">

      <!-- Header -->
      <div class="panel-header">
        <div>
          <div class="panel-id">{{ laporan().lahanId }}</div>
          <div class="panel-title">{{ laporan().nama }}</div>
        </div>
        <div class="header-right">
          <span class="badge" [class]="'badge-' + laporan().status">
            {{ statusLabel(laporan().status) }}
          </span>
          <button class="close-btn" (click)="onClose()">✕</button>
        </div>
      </div>

      <div class="panel-body">

        <!-- ── Identitas ─────────────────────────────────── -->
        <section class="section">
          <div class="section-title">👤 Identitas Penggarap</div>
          <div class="grid2">
            <div class="field">
              <div class="field-lbl">Nama Lengkap</div>
              <div class="field-val">{{ laporan().nama }}</div>
            </div>
            <div class="field">
              <div class="field-lbl">NIK</div>
              <div class="field-val mono">{{ laporan().nik }}</div>
            </div>
            <div class="field">
              <div class="field-lbl">Dusun</div>
              <div class="field-val">{{ laporan().dusun }}</div>
            </div>
            <div class="field">
              <div class="field-lbl">Kelompok Tani</div>
              <div class="field-val">{{ laporan().kelompokTani ?? '—' }}</div>
            </div>
            <div class="field">
              <div class="field-lbl">Nomor HP</div>
              <div class="field-val">{{ laporan().nomorHp ?? '—' }}</div>
            </div>
            <div class="field">
              <div class="field-lbl">Tanggal Submit</div>
              <div class="field-val">{{ formatDate(laporan().createdAt) }}</div>
            </div>
          </div>
        </section>

        <!-- ── Data Lahan ─────────────────────────────────── -->
        <section class="section">
          <div class="section-title">🌿 Data Lahan</div>
          <div class="grid2">
            <div class="field">
              <div class="field-lbl">Luas</div>
              <div class="field-val"><strong>{{ laporan().luasHa }} Ha</strong></div>
            </div>
            <div class="field">
              <div class="field-lbl">Jenis Tanaman</div>
              <div class="field-val">{{ laporan().jenisTanaman }}</div>
            </div>
            <div class="field">
              <div class="field-lbl">Tahun Garap</div>
              <div class="field-val">{{ laporan().tahunGarap }}</div>
            </div>
            <div class="field">
              <div class="field-lbl">Status Lahan (Klaim)</div>
              <div class="field-val">{{ laporan().statusLahan }}</div>
            </div>
          </div>
        </section>

        <!-- ── Zona & GPS ─────────────────────────────────── -->
        <section class="section">
          <div class="section-title">📍 Zona & Koordinat GPS</div>
          <div class="grid2">
            <div class="field">
              <div class="field-lbl">Zona Kawasan</div>
              <div class="field-val">
                @if (laporan().zonaTipe) {
                  <span class="zona-badge" [class]="'zona-' + laporan().zonaTipe">
                    {{ zonaLabel(laporan().zonaTipe!) }}
                  </span>
                } @else {
                  <span style="color:#9ca3af">Di luar kawasan</span>
                }
              </div>
            </div>
            <div class="field">
              <div class="field-lbl">Nama Zona</div>
              <div class="field-val">{{ laporan().zonaNama ?? '—' }}</div>
            </div>
          </div>
        </section>

        <!-- ── Foto ───────────────────────────────────────── -->
        @if (laporan().fotoPanoramaUrl || laporan().fotoDetailUrl) {
          <section class="section">
            <div class="section-title">📸 Foto Lapangan</div>
            <div class="foto-grid">
              @if (laporan().fotoPanoramaUrl) {
                <div class="foto-wrap">
                  <div class="foto-lbl">Panorama</div>
                  @if (fotoPanorama()) {
                    <img [src]="fotoPanorama()!" class="foto-img" alt="Foto panorama" loading="lazy" />
                  } @else {
                    <div class="foto-loading">{{ loadingFoto() ? 'Memuat...' : 'Gagal memuat' }}</div>
                  }
                </div>
              }
              @if (laporan().fotoDetailUrl) {
                <div class="foto-wrap">
                  <div class="foto-lbl">Detail Lahan</div>
                  @if (fotoDetail()) {
                    <img [src]="fotoDetail()!" class="foto-img" alt="Foto detail" loading="lazy" />
                  } @else {
                    <div class="foto-loading">{{ loadingFoto() ? 'Memuat...' : 'Gagal memuat' }}</div>
                  }
                </div>
              }
            </div>
          </section>
        }

        <!-- ── Verifikasi ─────────────────────────────────── -->
        <section class="section">
          <div class="section-title">✅ Verifikasi Laporan</div>
          <div class="verif-form">
            <div class="field">
              <div class="field-lbl">Ubah Status</div>
              <select [(ngModel)]="newStatus" class="select-status">
                <option value="">— Pilih status —</option>
                <option value="kemitraan">✓ Kemitraan</option>
                <option value="verifikasi">⏳ Perlu Verifikasi Lapangan</option>
                <option value="ilegal">🚨 Ilegal</option>
                <option value="ditunda">⏸ Ditunda</option>
              </select>
            </div>
            <div class="field">
              <div class="field-lbl">Catatan Verifikasi</div>
              <textarea
                [(ngModel)]="catatan"
                class="textarea-catatan"
                rows="3"
                placeholder="Opsional — catatan untuk petugas atau arsip"
              ></textarea>
            </div>
            <div class="verif-actions">
              <button class="btn-cancel" (click)="onClose()">Tutup</button>
              <button
                class="btn-save"
                [disabled]="!newStatus || saving()"
                (click)="saveStatus()"
              >
                {{ saving() ? 'Menyimpan...' : 'Simpan Status' }}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0; top: 48px; background: rgba(0,0,0,.45);
      z-index: 100; backdrop-filter: blur(2px);
    }
    .panel {
      position: fixed; top: 48px; right: 0; bottom: 0;
      width: min(560px, 100vw);
      max-width: 100vw;
      box-sizing: border-box;
      background: #f9fafb; z-index: 101; overflow-y: auto; overflow-x: hidden;
      box-shadow: -4px 0 24px rgba(0,0,0,.15);
      display: flex; flex-direction: column;
    }
    .panel-header {
      background: #1a4d2e; color: white;
      padding: 16px 20px;
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; flex-shrink: 0;
    }
    .panel-id { font-size: 10px; opacity: .7; font-family: monospace; margin-bottom: 3px }
    .panel-title { font-size: 18px; font-weight: 800 }
    .header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0 }
    .close-btn {
      background: rgba(255,255,255,.15); border: none; color: white;
      width: 30px; height: 30px; border-radius: 6px; cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .close-btn:hover { background: rgba(255,255,255,.25) }

    .panel-body { padding: 16px; flex: 1; min-width: 0; box-sizing: border-box }

    .section {
      background: white; border-radius: 10px; padding: 14px 16px;
      margin-bottom: 12px; border: 1px solid #e5e7eb;
    }
    .section-title {
      font-size: 11px; font-weight: 800; text-transform: uppercase;
      letter-spacing: .5px; color: #6b7280; margin-bottom: 12px;
    }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; min-width: 0 }
    .grid2 > * { min-width: 0; overflow-wrap: break-word }
    .field-lbl { font-size: 10px; color: #9ca3af; margin-bottom: 2px; text-transform: uppercase; letter-spacing: .4px }
    .field-val { font-size: 13px; color: #1f2937; font-weight: 500 }
    .mono { font-family: monospace; font-size: 12px; letter-spacing: .5px }

    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700 }
    .badge-kemitraan { background: #dcfce7; color: #15803d }
    .badge-verifikasi { background: #fef9c3; color: #92400e }
    .badge-ilegal     { background: #fee2e2; color: #991b1b }
    .badge-baru       { background: #eff6ff; color: #1d4ed8 }
    .badge-ditunda    { background: #f3f4f6; color: #4b5563 }

    .zona-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700 }
    .zona-inti         { background: #fee2e2; color: #991b1b }
    .zona-penyangga    { background: #ffedd5; color: #9a3412 }
    .zona-kemitraan    { background: #dcfce7; color: #15803d }
    .zona-rehabilitasi { background: #f3e8ff; color: #6b21a8 }

    .foto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px }
    .foto-lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 6px }
    .foto-img { width: 100%; border-radius: 8px; aspect-ratio: 4/3; object-fit: cover; border: 1px solid #e5e7eb }
    .foto-loading {
      width: 100%; aspect-ratio: 4/3; background: #f3f4f6; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #9ca3af;
    }

    .verif-form { display: flex; flex-direction: column; gap: 12px }
    .select-status {
      width: 100%; padding: 8px 12px; border: 1px solid #d1d5db;
      border-radius: 8px; font-size: 13px; background: #f9fafb; color: #1f2937;
    }
    .textarea-catatan {
      width: 100%; padding: 8px 12px; border: 1px solid #d1d5db;
      border-radius: 8px; font-size: 13px; resize: vertical; font-family: inherit;
      box-sizing: border-box;
    }
    .verif-actions { display: flex; gap: 10px; justify-content: flex-end }
    .btn-cancel {
      padding: 8px 18px; border: 1px solid #d1d5db; border-radius: 8px;
      background: white; color: #4b5563; font-size: 13px; cursor: pointer;
    }
    .btn-save {
      padding: 8px 20px; border: none; border-radius: 8px;
      background: #1a4d2e; color: white; font-size: 13px; font-weight: 700;
      cursor: pointer;
    }
    .btn-save:disabled { background: #9ca3af; cursor: not-allowed }
    .btn-save:hover:not(:disabled) { background: #2d7a4f }

    @media (max-width: 480px) {
      .panel { top: 48px; width: 100vw }
      .panel-header { padding: 12px 14px }
      .panel-title { font-size: 15px }
      .panel-body { padding: 10px }
      .grid2 { grid-template-columns: 1fr }
      .foto-grid { grid-template-columns: 1fr }
      .verif-actions { flex-direction: column }
      .btn-cancel, .btn-save { width: 100%; text-align: center }
    }
  `],
})
export class DetailModalComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly laporan = input.required<LahanInfo>();
  readonly close   = output<void>();
  readonly statusChanged = output<{ id: string; status: string }>();

  readonly fotoPanorama = signal<string | null>(null);
  readonly fotoDetail   = signal<string | null>(null);
  readonly loadingFoto  = signal(false);
  readonly saving       = signal(false);

  newStatus = '';
  catatan   = '';

  async ngOnInit(): Promise<void> {
    await this.loadFotos();
  }

  private async loadFotos(): Promise<void> {
    const l = this.laporan();
    if (!l.fotoPanoramaUrl && !l.fotoDetailUrl) return;

    this.loadingFoto.set(true);
    try {
      // MinIO bucket sudah public — gunakan URL langsung
      if (l.fotoPanoramaUrl) this.fotoPanorama.set(l.fotoPanoramaUrl);
      if (l.fotoDetailUrl)   this.fotoDetail.set(l.fotoDetailUrl);
    } catch {
      // foto gagal dimuat — tampilkan placeholder
    } finally {
      this.loadingFoto.set(false);
    }
  }

  async saveStatus(): Promise<void> {
    if (!this.newStatus || this.saving()) return;
    this.saving.set(true);
    try {
      await this.api.updateStatus(
        this.laporan().lahanId,
        this.newStatus,
        this.catatan || undefined
      );
      this.statusChanged.emit({ id: this.laporan().lahanId, status: this.newStatus });
      this.close.emit();
    } finally {
      this.saving.set(false);
    }
  }

  onClose(): void { this.close.emit(); }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
       kemitraan: '✓ Kemitraan', verifikasi: '⏳ Verifikasi',
      ilegal: '🚨 Ilegal', baru: '🔵 Baru', ditunda: '⏸ Ditunda',
    };
    return m[s] ?? s;
  }

  zonaLabel(z: string): string {
    const m: Record<string, string> = {
      inti: '⚠️ Zona Inti', penyangga: '🟠 Penyangga',
      kemitraan: '🟢 Kemitraan', rehabilitasi: '🟣 Rehabilitasi',
    };
    return m[z] ?? z;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
