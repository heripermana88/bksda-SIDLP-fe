import { Component, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-form-sukses',
  standalone: true,
  template: `
    <div class="page">
      @if (isOffline()) {
        <div class="offline-bar">📵 Mode Offline — data tersimpan di ponsel</div>
      }
      <div class="content">
        <div class="icon">{{ isOffline() ? '💾' : '✅' }}</div>
        <h2>{{ isOffline() ? 'Data Tersimpan Lokal' : 'Laporan Terkirim!' }}</h2>
        <p>
          @if (isOffline()) {
            Tidak ada koneksi internet. Formulir tersimpan di ponsel dan akan
            dikirim otomatis saat sinyal pulih.
          } @else {
            Data lahan Anda telah diterima dan akan diverifikasi oleh petugas
            BBKSDA Riau dalam 3–5 hari kerja.
          }
        </p>
        <div class="id-box" [class.offline]="isOffline()">
          <div class="id-label">{{ isOffline() ? 'ID Sementara' : 'ID Laporan Anda' }}</div>
          <div class="id-code">{{ laporanId() }}</div>
        </div>
        @if (!isOffline()) {
          <div class="screenshot-note">📸 Screenshot ID ini sebagai bukti pelaporan</div>
        } @else {
          <div class="info-yellow">
            ⏳ Akan dikirim otomatis saat sinyal pulih (Background Sync)
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 420px; margin: 0 auto }
    .offline-bar { background: #374151; color: #d1d5db; padding: 8px 16px; font-size: 12px }
    .content { padding: 48px 20px; text-align: center }
    .icon { font-size: 64px; margin-bottom: 16px }
    h2 { font-size: 22px; font-weight: 800; color: #1a4d2e; margin-bottom: 8px }
    p { font-size: 13px; color: #6b7280; line-height: 1.65; margin-bottom: 24px }
    .id-box { background: #f0fdf4; border-radius: 10px; padding: 16px; margin-bottom: 14px }
    .id-box.offline { background: #f3f4f6 }
    .id-label { font-size: 11px; font-weight: 700; color: #16a34a; margin-bottom: 6px }
    .id-box.offline .id-label { color: #6b7280 }
    .id-code { font-family: monospace; font-size: 20px; font-weight: 900; color: #1a4d2e; letter-spacing: .5px }
    .id-box.offline .id-code { color: #374151; font-size: 16px }
    .screenshot-note { font-size: 12px; color: #9ca3af; margin-bottom: 20px }
    .info-yellow { background: #fef9c3; color: #92400e; border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.5 }
  `],
})
export class FormSuksesComponent implements OnInit {
  private readonly router = inject(Router);

  readonly laporanId = input.required<string>();
  readonly isOffline = signal(false);

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation()?.extras.state;
    if (nav?.['offline']) this.isOffline.set(true);
  }
}
