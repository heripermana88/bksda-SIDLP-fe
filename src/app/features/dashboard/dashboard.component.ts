import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, DashboardStats, LahanInfo } from '@core/services/api.service';
import { DetailModalComponent } from './detail-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, DetailModalComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Dashboard Monitoring</h1>
          <p>SM Bukit Rimbang Bukit Baling · {{ now }}</p>
        </div>
        <div class="header-actions">
          <button class="btn-export" (click)="exportExcel()" [disabled]="exporting()">
            {{ exporting() ? 'Mengekspor...' : '⬇️ Export Excel' }}
          </button>
        </div>
      </div>

      <!-- Stat Cards -->
      @if (stats()) {
        <div class="stat-grid">
          <div class="stat-card" (click)="setFilter('', '')" style="cursor:pointer">
            <div class="stat-num" style="color:#1a4d2e">{{ stats()!.total }}</div>
            <div class="stat-lbl">Total Terdata</div>
          </div>
          <div class="stat-card stat-km" (click)="setFilter('kemitraan', '')" style="cursor:pointer">
            <div class="stat-num" style="color:#22c55e">{{ stats()!.kemitraan }}</div>
            <div class="stat-lbl">Kemitraan</div>
            <div class="stat-pct">{{ pctKm() }}% dari total</div>
          </div>
          <div class="stat-card stat-vf" (click)="setFilter('verifikasi', '')" style="cursor:pointer">
            <div class="stat-num" style="color:#eab308">{{ stats()!.verifikasi }}</div>
            <div class="stat-lbl">Verifikasi</div>
            <div class="stat-pct" style="color:#92400e">Perlu tindak lanjut</div>
          </div>
          <div class="stat-card stat-il" (click)="setFilter('ilegal', '')" style="cursor:pointer">
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
          <span class="table-title">
            Daftar Laporan
            @if (total() > 0) { <span class="total-badge">{{ total() }}</span> }
          </span>
          <div class="filter-row">
            <select [(ngModel)]="filterStatus" (change)="resetAndLoad()">
              <option value="">Semua Status</option>
              <option value="baru">Baru</option>
              <option value="verifikasi">Verifikasi</option>
              <option value="kemitraan">Kemitraan</option>
              <option value="ilegal">Ilegal</option>
              <option value="ditunda">Ditunda</option>
            </select>
            <select [(ngModel)]="filterZona" (change)="resetAndLoad()">
              <option value="">Semua Zona</option>
              <option value="inti">Zona Inti</option>
              <option value="penyangga">Penyangga</option>
              <option value="kemitraan">Kemitraan</option>
              <option value="rehabilitasi">Rehabilitasi</option>
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
                  <tr [class.il-row]="row.status === 'ilegal'" (click)="openDetail(row)" style="cursor:pointer">
                    <td><span class="mono">{{ row.lahanId }}</span></td>
                    <td><strong>{{ row.nama }}</strong><br><span class="sub">{{ row.dusun }}</span></td>
                    <td>{{ row.luasHa }} Ha</td>
                    <td>{{ row.jenisTanaman }}</td>
                    <td [class.zona-il]="row.zonaTipe === 'inti'">
                      {{ row.zonaTipe === 'inti' ? '⚠️ Zona Inti' : (row.zonaNama ?? '—') }}
                    </td>
                    <td>{{ formatDate(row.createdAt) }}</td>
                    <td><span class="badge" [class]="'badge-' + row.status">{{ statusLabel(row.status) }}</span></td>
                    <td (click)="$event.stopPropagation()">
                      <div class="action-btns">
                        <button class="ab ab-green" title="Kemitraan" (click)="quickStatus(row.lahanId, 'kemitraan')">✅</button>
                        <button class="ab ab-red"   title="Ilegal"    (click)="quickStatus(row.lahanId, 'ilegal')">🚨</button>
                        <button class="ab ab-gray"  title="Ditunda"   (click)="quickStatus(row.lahanId, 'ditunda')">⏸</button>
                        <button class="ab ab-blue"  title="Detail"    (click)="openDetail(row)">👁</button>
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="empty-row">Tidak ada data.</td></tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          @if (total() > pageSize) {
            <div class="pagination">
              <span class="page-info">
                {{ offset() + 1 }}–{{ min(offset() + laporan().length, total()) }} dari {{ total() }} laporan
              </span>
              <div class="page-btns">
                <button (click)="prevPage()" [disabled]="offset() === 0">‹ Prev</button>
                <button (click)="nextPage()" [disabled]="offset() + pageSize >= total()">Next ›</button>
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- Detail Modal -->
    @if (selectedLaporan()) {
      <app-detail-modal
        [laporan]="selectedLaporan()!"
        (close)="selectedLaporan.set(null)"
        (statusChanged)="onStatusChanged()"
      />
    }
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 20px }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px }
    h1 { font-size: 22px; font-weight: 800; color: #1f2937 }
    p  { font-size: 12px; color: #9ca3af; margin-top: 3px }
    .header-actions { display: flex; gap: 8px; align-items: center }
    .btn-peta {
      background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 8px 14px; font-size: 12px; color: #4b5563; text-decoration: none;
    }
    .btn-export {
      background: #1a4d2e; border: none; border-radius: 8px;
      padding: 8px 14px; font-size: 12px; color: white; cursor: pointer; font-weight: 700;
    }
    .btn-export:disabled { background: #9ca3af; cursor: not-allowed }

    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px }
    @media (max-width: 640px) { .stat-grid { grid-template-columns: repeat(2, 1fr) } }
    .stat-card {
      background: white; border-radius: 12px; padding: 16px;
      border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,.06);
      transition: box-shadow .15s;
    }
    .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1) }
    .stat-km { background: #f0fdf4; border-color: #bbf7d0 }
    .stat-vf { background: #fef9c3; border-color: #fde68a }
    .stat-il { background: #fee2e2; border-color: #fecaca }
    .stat-num { font-size: 36px; font-weight: 900; line-height: 1 }
    .stat-lbl { font-size: 12px; color: #9ca3af; margin-top: 4px }
    .stat-pct { font-size: 11px; margin-top: 3px; color: #2d7a4f }

    .alert-bar {
      background: #fef9c3; border: 1px solid #eab308; border-radius: 8px;
      padding: 10px 16px; font-size: 13px; color: #92400e;
      margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
    }
    .table-wrap {
      background: white; border-radius: 12px;
      border: 1px solid #e5e7eb; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .table-header {
      padding: 12px 16px; border-bottom: 1px solid #f3f4f6;
      display: flex; justify-content: space-between; align-items: center; gap: 12px;
    }
    .table-title {
      font-size: 14px; font-weight: 700; color: #1f2937;
      display: flex; align-items: center; gap: 8px;
    }
    .total-badge {
      background: #1a4d2e; color: white; font-size: 11px;
      padding: 1px 8px; border-radius: 20px;
    }
    .filter-row { display: flex; gap: 8px; flex-wrap: wrap }
    .filter-row select {
      border: 1px solid #e5e7eb; border-radius: 6px;
      padding: 5px 10px; font-size: 12px; color: #4b5563; background: #f9fafb;
    }
    .table-scroll { overflow-x: auto }
    table { width: 100%; border-collapse: collapse; font-size: 12px }
    th {
      padding: 9px 12px; text-align: left; color: #9ca3af;
      font-weight: 700; font-size: 10px; text-transform: uppercase;
      letter-spacing: .5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;
    }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle }
    tr:last-child td { border-bottom: none }
    tr:hover td { background: #f0fdf4 }
    tr.il-row td { background: #fff8f8 }
    tr.il-row:hover td { background: #fee2e2 }
    .sub { font-size: 10px; color: #9ca3af }
    .mono { font-family: monospace; font-size: 10px; color: #6b7280 }
    .zona-il { color: #991b1b; font-weight: 700 }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700 }
    .badge-kemitraan { background: #dcfce7; color: #15803d }
    .badge-verifikasi { background: #fef9c3; color: #92400e }
    .badge-ilegal     { background: #fee2e2; color: #991b1b }
    .badge-baru       { background: #eff6ff; color: #1d4ed8 }
    .badge-ditunda    { background: #f3f4f6; color: #4b5563 }
    .action-btns { display: flex; gap: 4px }
    .ab {
      width: 26px; height: 26px; border-radius: 5px;
      border: 1px solid #e5e7eb; background: white;
      cursor: pointer; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .ab:hover { opacity: .8 }
    .ab-blue { border-color: #bfdbfe; background: #eff6ff }

    .table-loading, .empty-row {
      padding: 32px; text-align: center; color: #9ca3af; font-size: 13px;
    }

    /* Pagination */
    .pagination {
      padding: 12px 16px; border-top: 1px solid #f3f4f6;
      display: flex; justify-content: space-between; align-items: center;
    }
    .page-info { font-size: 12px; color: #6b7280 }
    .page-btns { display: flex; gap: 6px }
    .page-btns button {
      padding: 5px 14px; border: 1px solid #e5e7eb; border-radius: 6px;
      background: white; font-size: 12px; cursor: pointer; color: #4b5563;
    }
    .page-btns button:disabled { opacity: .4; cursor: not-allowed }
    .page-btns button:hover:not(:disabled) { background: #f3f4f6 }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly stats          = signal<DashboardStats | null>(null);
  readonly laporan        = signal<LahanInfo[]>([]);
  readonly loading        = signal(false);
  readonly exporting      = signal(false);
  readonly selectedLaporan = signal<LahanInfo | null>(null);
  readonly total          = signal(0);
  readonly offset         = signal(0);

  readonly pageSize = 20;

  filterStatus = '';
  filterZona   = '';

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
        status:   this.filterStatus  || undefined,
        zonaTipe: this.filterZona    || undefined,
        limit:    this.pageSize,
        offset:   this.offset(),
      });
      this.laporan.set(res.data);
      this.total.set(res.total);
    } finally {
      this.loading.set(false);
    }
  }

  resetAndLoad(): void {
    this.offset.set(0);
    this.loadLaporan();
  }

  setFilter(status: string, zona: string): void {
    this.filterStatus = status;
    this.filterZona   = zona;
    this.resetAndLoad();
  }

  prevPage(): void {
    this.offset.set(Math.max(0, this.offset() - this.pageSize));
    this.loadLaporan();
  }

  nextPage(): void {
    this.offset.set(this.offset() + this.pageSize);
    this.loadLaporan();
  }

  openDetail(row: LahanInfo): void {
    this.selectedLaporan.set(row);
  }

  async quickStatus(id: string, status: string): Promise<void> {
    await this.api.updateStatus(id, status);
    await Promise.all([this.loadStats(), this.loadLaporan()]);
  }

  async onStatusChanged(): Promise<void> {
    await Promise.all([this.loadStats(), this.loadLaporan()]);
  }

  async exportExcel(): Promise<void> {
    this.exporting.set(true);
    try {
      const res = await this.api.listLaporan({ limit: 9999 });
      const rows = res.data.map(l => ({
        'ID Laporan':        l.lahanId,
        'Nama Penggarap':    l.nama,
        'NIK':               l.nik,
        'Kelompok Tani':     l.kelompokTani ?? '',
        'Dusun':             l.dusun,
        'Nomor HP':          l.nomorHp ?? '',
        'Luas (Ha)':         l.luasHa,
        'Jenis Tanaman':     l.jenisTanaman,
        'Tahun Garap':       l.tahunGarap,
        'Status Lahan':      l.statusLahan,
        'Zona Tipe':         l.zonaTipe ?? '',
        'Zona Nama':         l.zonaNama ?? '',
        'Status Verifikasi': l.status,
        'Tanggal Submit':    new Date(l.createdAt).toLocaleDateString('id-ID'),
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const xlsxMod = await import('xlsx');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const XLSX = (xlsxMod as any).default ?? xlsxMod;
      const ws   = XLSX.utils.json_to_sheet(rows);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Lahan');
      XLSX.writeFile(wb, `SIDLP_Laporan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      this.exporting.set(false);
    }
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      kemitraan: '✓ Kemitraan', verifikasi: '⏳ Verifikasi',
      ilegal: '🚨 Ilegal', baru: '🔵 Baru', ditunda: '⏸ Ditunda',
    };
    return map[status] ?? status;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  min(a: number, b: number): number { return Math.min(a, b); }
}
