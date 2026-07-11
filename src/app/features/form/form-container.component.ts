// ============================================================
// FormContainerComponent — 4-step wizard pendataan lahan
// Mengelola state antar step via Signals
// ============================================================

import { Component, inject, input, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, SubmitLaporanRequest } from '@core/services/api.service';
import { OfflineService } from '@core/services/offline.service';

type Step = 1 | 2 | 3 | 4;

interface GpsResult {
  latitude: number;
  longitude: number;
  accuracyM: number;
  timestamp: string;
}

@Component({
  selector: 'app-form-container',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <!-- Progress -->
      <div class="progress-wrap">
        <div class="progress-bar">
          @for (s of [1,2,3,4]; track s) {
            <div class="progress-step"
              [class.done]="step() > s"
              [class.active]="step() === s">
            </div>
          }
        </div>
        <div class="step-label">Langkah {{ step() }}: {{ stepTitle() }}</div>
      </div>

      <!-- ── STEP 1: IDENTITAS ── -->
      @if (step() === 1) {
        <div class="form-section">
          <div class="field-group">
            <label>Nama Lengkap (sesuai KTP) *</label>
            <input [ngModel]="nama()" (ngModelChange)="nama.set($event)" type="text" placeholder="Nama lengkap..." [class.valid]="namaValid()" [class.error]="namaTouched && !namaValid()" (blur)="namaTouched = true"/>
            @if (namaTouched && !namaValid()) {
              <span class="err">⚠ Nama min. 2 kata sesuai KTP</span>
            }
          </div>
          <div class="field-group">
            <label>NIK (16 digit) *
              <span class="nik-count" [class.valid]="nikValid()" [class.error]="nikTouched && !nikValid()">
                {{ nik().length }}/16
              </span>
            </label>
            <input [ngModel]="nik()" (ngModelChange)="nik.set($event)" type="text" inputmode="numeric" maxlength="16" placeholder="16 digit NIK..." [class.valid]="nikValid()" [class.error]="nikTouched && !nikValid()" (blur)="nikTouched = true"/>
            @if (nikTouched && !nikValid()) {
              <span class="err">⚠ NIK harus tepat 16 digit angka</span>
            }
          </div>
          <div class="field-group">
            <label>Kelompok Tani</label>
            <input [ngModel]="kelompokTani()" (ngModelChange)="kelompokTani.set($event)" type="text" placeholder="Nama kelompok tani (opsional)"/>
          </div>
          <div class="field-group">
            <label>Dusun / RT RW *</label>
            <input [ngModel]="dusun()" (ngModelChange)="dusun.set($event)" type="text" placeholder="Dusun, RT/RW..." [class.valid]="dusun().length > 3" [class.error]="dusunTouched && dusun().length <= 3" (blur)="dusunTouched = true"/>
          </div>
          <div class="field-group">
            <label>Nomor HP (opsional)</label>
            <input [ngModel]="nomorHp()" (ngModelChange)="nomorHp.set($event)" type="tel" placeholder="+62..."/>
          </div>
          <button class="btn btn-primary" (click)="nextStep()" [disabled]="!step1Valid()">
            Lanjut ke Langkah 2 →
          </button>
        </div>
      }

      <!-- ── STEP 2: GPS & SPASIAL ── -->
      @if (step() === 2) {
        <div class="form-section">
          @if (!gps()) {
            <div class="gps-idle">
              <div class="gps-icon">📍</div>
              <p>Berdiri di tengah lahan sebelum menekan tombol</p>
              <button class="btn btn-blue" (click)="ambilGps()" [disabled]="gpsLoading()">
                @if (gpsLoading()) { Mengambil GPS... } @else { Ambil Koordinat GPS }
              </button>
            </div>
          }
          @if (gps() && gpsError() === null) {
            <div class="gps-ok">
              <div class="gps-ok-title">✅ GPS Berhasil Diambil</div>
              <div class="gps-coords">{{ gps()!.latitude.toFixed(4) }}°N, {{ gps()!.longitude.toFixed(4) }}°E</div>
              <div class="gps-acc">Akurasi: ±{{ gps()!.accuracyM.toFixed(0) }} meter · {{ gps()!.timestamp }}</div>
              <span class="gps-retry" (click)="resetGps()">🔄 Ambil ulang</span>
            </div>
          }
          @if (gpsError()) {
            <div class="gps-error">
              <div class="gps-error-title">⚠️ Akurasi GPS Buruk: {{ gpsError() }} m</div>
              <p>Pindah ke area terbuka, jauh dari pohon dan bangunan</p>
              <button class="btn btn-danger" (click)="ambilGps()">Coba Lagi GPS</button>
            </div>
            <div class="info-box info-red">🚫 Tombol lanjut diblokir jika akurasi &gt; 100 meter</div>
          }
          <div class="field-group">
            <label>Luas Lahan (Ha) *</label>
            <input [ngModel]="luasHa()" (ngModelChange)="luasHa.set(+$event)" type="number" step="0.1" min="0.1" placeholder="0.0"/>
          </div>
          <div class="field-group">
            <label>Jenis Tanaman *</label>
            <select [ngModel]="jenisTanaman()" (ngModelChange)="jenisTanaman.set($event)">
              <option value="">Pilih tanaman...</option>
              <option>Karet</option>
              <option>Sawit</option>
              <option>Durian</option>
              <option>Pinang</option>
              <option>Kopi</option>
              <option>Campuran</option>
              <option>Lainnya</option>
            </select>
          </div>
          <div class="field-group">
            <label>Tahun Mulai Garapan *</label>
            <input [ngModel]="tahunGarap()" (ngModelChange)="tahunGarap.set(+$event)" type="number" min="1970" max="2026" placeholder="2010"/>
          </div>
          <div class="btn-row">
            <button class="btn btn-secondary" (click)="prevStep()">← Kembali</button>
            <button class="btn btn-primary" (click)="nextStep()" [disabled]="!step2Valid()">Lanjut →</button>
          </div>
        </div>
      }

      <!-- ── STEP 3 & 4: FOTO + PERNYATAAN ── -->
      @if (step() === 3) {
        <div class="form-section">
          <div class="step-sub">Koordinat GPS disematkan otomatis (EXIF geotagging)</div>

          <div class="field-group">
            <label>Foto Panorama Lahan *</label>
            @if (!fotoPanorama) {
              <div class="photo-upload" (click)="pickPhoto('panorama')">
                <span class="pu-icon">📸</span>
                <p>Ketuk untuk ambil foto panorama</p>
              </div>
            } @else {
              <div class="photo-preview">
                <img [src]="fotoPanoramaPreview" alt="Panorama" />
                <span class="photo-rm" (click)="fotoPanorama = null">✕</span>
              </div>
            }
            <input #panoramaInput type="file" accept="image/*" capture="environment" hidden (change)="onPhotoSelected($event, 'panorama')"/>
          </div>

          <div class="field-group">
            <label>Foto Detail Tanaman (opsional)</label>
            @if (!fotoDetail) {
              <div class="photo-upload" (click)="pickPhoto('detail')">
                <span class="pu-icon">🌿</span>
                <p>Ketuk untuk ambil foto tanaman</p>
              </div>
            } @else {
              <div class="photo-preview">
                <img [src]="fotoDetailPreview" alt="Detail" />
                <span class="photo-rm" (click)="fotoDetail = null">✕</span>
              </div>
            }
            <input #detailInput type="file" accept="image/*" capture="environment" hidden (change)="onPhotoSelected($event, 'detail')"/>
          </div>

          <hr/>
          <div class="step-label2">Langkah 4: Pernyataan</div>

          <div class="field-group">
            <label>Status Lahan Saat Ini *</label>
            <select [ngModel]="statusLahan()" (ngModelChange)="statusLahan.set($event)">
              <option value="">Pilih status...</option>
              <option>Lahan Kelola Aktif (Digarap)</option>
              <option>Lahan Tidur (Tidak Aktif)</option>
              <option>Lahan Baru Dibuka</option>
            </select>
          </div>

          <div class="checkbox-row" (click)="setuju.set(!setuju())">
            <div class="cb" [class.checked]="setuju()">@if (setuju()) { ✓ }</div>
            <div class="cb-text">
              Data yang saya sampaikan benar dan saya bersedia mengikuti prosedur
              Kemitraan Konservasi SM Bukit Rimbang Bukit Baling.
            </div>
          </div>

          @if (submitError()) {
            <div class="info-box info-red">{{ submitError() }}</div>
          }

          <div class="btn-row">
            <button class="btn btn-secondary" (click)="prevStep()">← Kembali</button>
            <button class="btn btn-success" (click)="onSubmit()" [disabled]="!step3Valid() || submitting()">
              @if (submitting()) { Mengirim... } @else { Kirim Laporan ✓ }
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 420px; margin: 0 auto; padding: 12px }
    .progress-wrap { margin-bottom: 16px }
    .progress-bar { display: flex; gap: 4px; margin-bottom: 8px }
    .progress-step { flex: 1; height: 4px; border-radius: 2px; background: #e5e7eb; transition: background .3s }
    .progress-step.done { background: #22c55e }
    .progress-step.active { background: #1a4d2e }
    .step-label { font-size: 12px; font-weight: 700; color: #1a4d2e }
    .step-sub { font-size: 11px; color: #9ca3af; margin-bottom: 12px }
    .form-section { display: flex; flex-direction: column; gap: 2px }
    .field-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px }
    label {
      font-size: 10px; font-weight: 700; color: #9ca3af;
      text-transform: uppercase; letter-spacing: .5px;
      display: flex; justify-content: space-between; align-items: center;
    }
    input, select {
      border: 1.5px solid #e5e7eb; border-radius: 7px;
      padding: 9px 11px; font-size: 13px; font-family: inherit;
      outline: none; transition: border-color .15s; width: 100%;
    }
    input:focus, select:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.1) }
    input.valid { border-color: #22c55e }
    input.error { border-color: #ef4444 }
    .err { font-size: 11px; color: #ef4444 }
    .nik-count { font-size: 11px; font-weight: 600 }
    .nik-count.valid { color: #22c55e }
    .nik-count.error { color: #ef4444 }
    .btn { border-radius: 8px; padding: 11px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; transition: all .15s }
    .btn:disabled { opacity: .5; cursor: not-allowed }
    .btn-primary  { background: #1a4d2e; color: white; width: 100%; margin-top: 4px }
    .btn-success  { background: #22c55e; color: white; flex: 1.5 }
    .btn-secondary{ background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; flex: .8 }
    .btn-blue  { background: #3b82f6; color: white; border-radius: 6px; padding: 8px 16px }
    .btn-danger{ background: #ef4444; color: white; border-radius: 6px; padding: 8px 16px }
    .btn-row { display: flex; gap: 8px; margin-top: 8px }
    /* GPS */
    .gps-idle { background: #eff6ff; border: 2px dashed #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 12px }
    .gps-icon { font-size: 28px; margin-bottom: 8px }
    .gps-idle p { font-size: 12px; color: #9ca3af; margin-bottom: 12px; line-height: 1.5 }
    .gps-ok { background: #f0fdf4; border: 1.5px solid #22c55e; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 12px }
    .gps-ok-title { font-size: 13px; font-weight: 800; color: #166534; margin-bottom: 6px }
    .gps-coords { font-family: monospace; font-size: 12px; color: #15803d; font-weight: 700; margin-bottom: 4px }
    .gps-acc { font-size: 11px; color: #166534; margin-bottom: 6px }
    .gps-retry { font-size: 11px; color: #16a34a; cursor: pointer; text-decoration: underline }
    .gps-error { background: #fee2e2; border: 1.5px solid #ef4444; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 8px }
    .gps-error-title { font-size: 13px; font-weight: 800; color: #991b1b; margin-bottom: 4px }
    .gps-error p { font-size: 12px; color: #b91c1c; margin-bottom: 10px }
    /* Photo */
    .photo-upload { background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; cursor: pointer }
    .pu-icon { font-size: 28px; display: block; margin-bottom: 6px }
    .photo-upload p { font-size: 12px; color: #9ca3af }
    .photo-preview { position: relative; border-radius: 8px; overflow: hidden; height: 120px }
    .photo-preview img { width: 100%; height: 100%; object-fit: cover }
    .photo-rm { position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,.5); color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px }
    /* Checkbox */
    .checkbox-row { display: flex; gap: 10px; align-items: flex-start; background: #f0fdf4; border-radius: 8px; padding: 12px; margin-bottom: 12px; cursor: pointer }
    .cb { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #22c55e; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: white }
    .cb.checked { background: #22c55e }
    .cb-text { font-size: 12px; color: #166534; line-height: 1.55 }
    hr { border: none; border-top: 1px solid #f3f4f6; margin: 12px 0 }
    .step-label2 { font-size: 12px; font-weight: 700; color: #1a4d2e; margin-bottom: 10px }
    .info-box { border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; font-size: 12px }
    .info-red { background: #fee2e2; color: #991b1b; border-left: 3px solid #ef4444 }
  `],
})
export class FormContainerComponent {
  private readonly api     = inject(ApiService);
  private readonly offline = inject(OfflineService);
  private readonly router  = inject(Router);

  readonly token = input.required<string>();

  // ── Step state ─────────────────────────────────────────────
  readonly step = signal<Step>(1);
  readonly stepTitle = computed(() => ({
    1: 'Identitas Penggarap',
    2: 'Data Spasial',
    3: 'Foto & Pernyataan',
    4: 'Selesai',
  }[this.step()]));

  // ── Step 1 ────────────────────────────────────────────────
  readonly nama         = signal(''); namaTouched  = false;
  readonly nik          = signal(''); nikTouched   = false;
  readonly kelompokTani = signal('');
  readonly dusun        = signal(''); dusunTouched = false;
  readonly nomorHp      = signal('');

  readonly namaValid  = computed(() => this.nama().trim().split(' ').filter(Boolean).length >= 2);
  readonly nikValid   = computed(() => /^\d{16}$/.test(this.nik()));
  readonly step1Valid = computed(() => this.namaValid() && this.nikValid() && this.dusun().length > 3);

  // ── Step 2 ────────────────────────────────────────────────
  readonly gps         = signal<GpsResult | null>(null);
  readonly gpsLoading  = signal(false);
  readonly gpsError    = signal<number | null>(null);
  readonly luasHa      = signal(0);
  readonly jenisTanaman = signal('');
  readonly tahunGarap  = signal(new Date().getFullYear());

  readonly step2Valid = computed(() =>
    !!this.gps() &&
    this.gpsError() === null &&
    this.luasHa() > 0 &&
    !!this.jenisTanaman() &&
    this.tahunGarap() >= 1970
  );

  // ── Step 3 ────────────────────────────────────────────────
  fotoPanorama: File | null   = null;
  fotoPanoramaPreview         = '';
  fotoDetail: File | null     = null;
  fotoDetailPreview           = '';
  readonly statusLahan = signal('');
  readonly setuju      = signal(false);

  readonly submitting  = signal(false);
  readonly submitError = signal('');

  readonly step3Valid = computed(() => !!this.statusLahan() && this.setuju());

  // ── Navigation ────────────────────────────────────────────

  nextStep(): void {
    if (this.step() < 4) this.step.set((this.step() + 1) as Step);
  }
  prevStep(): void {
    if (this.step() > 1) this.step.set((this.step() - 1) as Step);
  }

  // ── GPS ───────────────────────────────────────────────────

  async ambilGps(): Promise<void> {
    this.gpsLoading.set(true);
    this.gpsError.set(null);
    this.gps.set(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy;
        if (accuracy > 100) {
          this.gpsError.set(Math.round(accuracy));
        } else {
          this.gps.set({
            latitude:  pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyM: accuracy,
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          });
        }
        this.gpsLoading.set(false);
      },
      (err) => {
        console.error('GPS error:', err);
        this.gpsLoading.set(false);
      },
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 }
    );
  }

  resetGps(): void {
    this.gps.set(null);
    this.gpsError.set(null);
  }

  // ── Photo ─────────────────────────────────────────────────

  pickPhoto(type: 'panorama' | 'detail'): void {
    const id = type === 'panorama' ? 'panoramaInput' : 'detailInput';
    document.getElementById(id)?.click();
  }

  onPhotoSelected(event: Event, type: 'panorama' | 'detail'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'panorama') {
      this.fotoPanorama = file;
      this.fotoPanoramaPreview = url;
    } else {
      this.fotoDetail = file;
      this.fotoDetailPreview = url;
    }
  }

  // ── Submit ────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    if (!this.step3Valid()) return;
    this.submitting.set(true);
    this.submitError.set('');

    try {
      const gps = this.gps()!;

      // Upload foto dulu jika ada
      let fotoPanoramaUrl: string | undefined;
      let fotoDetailUrl: string | undefined;
      if (this.fotoPanorama) {
        fotoPanoramaUrl = await this.api.uploadPhoto(this.fotoPanorama, 'panorama');
      }
      if (this.fotoDetail) {
        fotoDetailUrl = await this.api.uploadPhoto(this.fotoDetail, 'detail');
      }

      const payload: SubmitLaporanRequest = {
        token:        this.token(),
        nama:         this.nama(),
        nik:          this.nik(),
        kelompokTani: this.kelompokTani() || undefined,
        dusun:        this.dusun(),
        nomorHp:      this.nomorHp() || undefined,
        latitude:     gps.latitude,
        longitude:    gps.longitude,
        accuracyM:    gps.accuracyM,
        luasHa:       this.luasHa(),
        jenisTanaman: this.jenisTanaman(),
        tahunGarap:   this.tahunGarap(),
        statusLahan:  this.statusLahan(),
        fotoPanoramaUrl,
        fotoDetailUrl,
      };

      if (!navigator.onLine) {
        // Simpan offline
        const offlineId = await this.offline.saveOffline(payload);
        await this.router.navigate(['/sukses', offlineId], {
          state: { offline: true },
        });
        return;
      }

      const res = await this.api.submitLaporan(payload);
      await this.router.navigate(['/sukses', res.laporanId], {
        state: { zonaTipe: res.zonaTipe, zonaNama: res.zonaNama },
      });
    } catch (err: unknown) {
      this.submitError.set('Gagal mengirim laporan. Periksa koneksi internet Anda.');
    } finally {
      this.submitting.set(false);
    }
  }
}
