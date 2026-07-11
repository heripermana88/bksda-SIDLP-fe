import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, DashboardStats, LahanInfo } from '@core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Dashboard Monitoring</h1>
          <p>SM Bukit Rimbang Bukit Baling · {{ now }}</p>
        </div>
        <a routerLink="/dashboard/peta" class="btn-peta">🗺️ Lihat Peta</a>
      </div>

      <!-- Stat Cards -->
      @if (stats()) {
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-num" style="color:#1a4d2e">{{ stats()!.total }}</div>
            <div class="stat-lbl">Total Terdata</div>
          </div>
          <div class="stat-card stat-km">
            <div class="stat-num" style="color:#22c55e">{{ stats()!.kemitraan }}</div>
            <div class="stat-lbl">Kemitraan</div>
            <div class="stat-pct">{{ pctKm() }}% dari total</div>
          </div>
          <div class="stat-card stat-vf">
            <div class="stat-num" style="color:#eab308">{{ stats()!.verifikasi }}</div>
            <div class="stat-lbl">Verifikasi</div>
            <div class="stat-pct" style="color:#92400e">Perlu tindak lanjut</div>
          </div>
          <div class="stat-card stat-il">
            <div class="stat-num" style="color:#ef4444">{{ stats()!.ilegal }}</div>
            <div class="stat-lbl">Ilegal</div>
            <div class="stat-pct" style="color:#991b1b">Penanganan segera</div>
          </div>
        </div>
      }

      <!-- Alert banner -->
      @if (stats() && stats()!.ilegal > 0) {
        <div class="alert-bar">
          ⚠️ <strong>Alert:</strong> {{ stats()!.ilegal }} lahan terdeteksi di Zona Inti
          — perlu verifikasi lapangan segera.
        </div>
      }

      <!-- Table -->
      <div class="table-wrap">
        <div class="table-header">
          <span class="table-title">Antrian Verifikasi</span>
          <div class="filter-row">
            <select [(ngModel)]="filterStatus" (change)="loadLaporan()">
              <option value="">Semua Status</option>
              <option value="baru">Baru</option>
              <option value="verifikasi">Verifikasi</option>
              <option value="kemitraan">Kemitraan</option>
              <option value="ilegal">Ilegal</option>
              <option value="ditunda">Ditunda</option>
            </select>
          </div>
        </div>

        @if (loading()) {
          <div class="table-loading">Memuat data...</div>
        } @else {
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID Laporan</th>
                  <th>Penggarap</th>
                  <th>Luas</th>
                  <th>Tanaman</th>
                  <th>Zona</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                @for (row of laporan(); track row.lahanId) {
                  <tr [class.il-row]="row.status === 'ilegal'">
                    <td><span class="mono">{{ row.lahanId }}</span></td>
                    <td><strong>{{ row.nama }}</strong></td>
                    <td>{{ row.luasHa }} Ha</td>
                    <td>{{ row.jenisTanaman }}</td>
                    <td [class.zona-il]="row.zonaTipe === 'inti'">
                      {{ row.zonaTipe === 'inti' ? '⚠️ Zona Inti' : (row.zonaNama ?? '—') }}
                    </td>
                    <td>{{ formatDate(row.createdAt) }}</td>
                    <td><span class="badge" [class]="'badge-' + row.status">{{ statusLabel(row.status) }}</span></td>
                    <td>
                      <div class="action-btns">
                        <button class="ab" title="Approve" (click)="approve(row.lahanId)">✅</button>
                        <button class="ab" title="Reject"  (click)="reject(row.lahanId)">❌</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="empty-row">Tidak ada data.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 20px }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px }
    h1 { font-size: 22px; font-weight: 800; color: #1f2937 }
    p  { font-size: 12px; color: #9ca3af; margin-top: 3px }
    .btn-peta { background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 14px; font-size: 12px; color: #4b5563; text-decoration: none }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px }
    @media (max-width: 640px) { .stat-grid { grid-template-columns: repeat(2, 1fr) } }
    .stat-card { background: white; border-radius: 12px; padding: 16px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,.06) }
    .stat-km { background: #f0fdf4; border-color: #bbf7d0 }
    .stat-vf { background: #fef9c3; border-color: #fde68a }
    .stat-il { background: #fee2e2; border-color: #fecaca }
    .stat-num { font-size: 36px; font-weight: 900; line-height: 1 }
    .stat-lbl { font-size: 12px; color: #9ca3af; margin-top: 4px }
    .stat-pct { font-size: 11px; margin-top: 3px; color: #2d7a4f }
    .alert-bar { background: #fef9c3; border: 1px solid #eab308; border-radius: 8px; padding: 10px 16px; font-size: 13px; color: #92400e; margin-bottom: 14px; display: flex; align-items: center; gap: 8px }
    .table-wrap { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06) }
    .table-header { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center }
    .table-title { font-size: 14px; font-weight: 700; color: #1f2937 }
    .filter-row select { border: 1px solid #e5e7eb; border-radius: 6px; padding: 5px 10px; font-size: 12px; color: #4b5563; background: #f9fafb }
    .table-scroll { overflow-x: auto }
    table { width: 100%; border-collapse: collapse; font-size: 12px }
    th { padding: 9px 12px; text-align: left; color: #9ca3af; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle }
    tr:last-child td { border-bottom: none }
    tr:hover td { background: #f9fafb }
    tr.il-row td { background: #fff8f8 }
    .mono { font-family: monospace; font-size: 10px; color: #6b7280 }
    .zona-il { color: #991b1b; font-weight: 700 }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700 }
    .badge-kemitraan { background: #dcfce7; color: #15803d }
    .badge-verifikasi { background: #fef9c3; color: #92400e }
    .badge-ilegal { background: #fee2e2; color: #991b1b }
    .badge-baru { background: #eff6ff; color: #1d4ed8 }
    .badge-ditunda { background: #f3f4f6; color: #4b5563 }
    .action-btns { display: flex; gap: 5px }
    .ab { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e5e7eb; background: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center }
    .ab:hover { background: #f9fafb }
    .table-loading, .empty-row { padding: 32px; text-align: center; color: #9ca3af; font-size: 13px }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly stats   = signal<DashboardStats | null>(null);
  readonly laporan = signal<LahanInfo[]>([]);
  readonly loading = signal(false);

  filterStatus = '';

  readonly pctKm = computed(() => {
    const s = this.stats();
    if (!s || s.total === 0) return 0;
    return Math.round((s.kemitraan / s.total) * 100);
  });

  readonly now = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadLaporan()]);
  }

  async loadStats(): Promise<void> {
    this.stats.set(await this.api.getDashboardStats());
  }

  async loadLaporan(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.api.listLaporan({
        status: this.filterStatus || undefined,
        limit: 20,
      });
      this.laporan.set(res.data);
    } finally {
      this.loading.set(false);
    }
  }

  async approve(id: string): Promise<void> {
    await this.api.updateStatus(id, 'kemitraan');
    await this.loadLaporan();
    await this.loadStats();
  }

  async reject(id: string): Promise<void> {
    await this.api.updateStatus(id, 'ilegal');
    await this.loadLaporan();
    await this.loadStats();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      kemitraan: '✓ Kemitraan',
      verifikasi: '⏳ Verifikasi',
      ilegal: '🚨 Ilegal',
      baru: '🔵 Baru',
      ditunda: '⏸ Ditunda',
    };
    return map[status] ?? status;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
