// ============================================================
// PetaComponent — Leaflet.js Web-GIS map
// Marker titik laporan + overlay polygon zona kawasan SM BRBB
// Support import .shp / .geojson untuk update zona
// ============================================================

import {
  Component, inject, signal, OnDestroy, afterNextRender, ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, MapPointsResponse } from '@core/services/api.service';

const STATUS_COLOR: Record<string, string> = {
  kemitraan: '#22c55e',
  verifikasi: '#eab308',
  ilegal:     '#ef4444',
  baru:       '#3b82f6',
  ditunda:    '#9ca3af',
};

const ZONA_STYLE: Record<string, { color: string; fillColor: string }> = {
  kemitraan:    { color: '#15803d', fillColor: '#22c55e' },
  penyangga:    { color: '#9a3412', fillColor: '#f97316' },
  inti:         { color: '#991b1b', fillColor: '#ef4444' },
  rehabilitasi: { color: '#6b21a8', fillColor: '#a855f7' },
};

const TIPE_OPTIONS = ['kemitraan', 'penyangga', 'inti', 'rehabilitasi'];

interface ParsedFeature {
  nama: string;
  tipe: string;
  keterangan: string;
  geometry: unknown;
  // field mentah dari shapefile untuk mapping
  rawProps?: Record<string, unknown>;
}

@Component({
  selector: 'app-peta',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="peta-wrap">
      <div class="toolbar">
        <span class="toolbar-title">🗺️ Peta Kawasan SM BRBB</span>

        <div class="toggles">
          <label class="toggle-lbl">
            <input type="checkbox" [(ngModel)]="showZona" (change)="toggleZona()" />
            Zona Kawasan
          </label>
          <label class="toggle-lbl">
            <input type="checkbox" [(ngModel)]="showLaporan" (change)="toggleLaporan()" />
            Titik Laporan
          </label>
        </div>

        <div class="legend">
          @for (item of legendItems; track item.label) {
            <div class="leg-item">
              <span class="leg-dot" [style.background]="item.color"></span>
              {{ item.label }}
            </div>
          }
        </div>

        <div class="legend">
          @for (item of zonaLegend; track item.label) {
            <div class="leg-item">
              <span class="leg-rect" [style.background]="item.color"></span>
              {{ item.label }}
            </div>
          }
        </div>

        <button class="btn-import" (click)="openImport()">⬆ Import Zona</button>
      </div>

      <div #mapEl class="map-container"></div>

      @if (loading()) {
        <div class="map-loading">🗺️ Memuat peta...</div>
      }
    </div>

    <!-- ── Modal Import ─────────────────────────────────── -->
    @if (showImport()) {
      <div class="modal-bg" (click)="closeImport()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span>⬆ Import Zona Kawasan</span>
            <button class="modal-close" (click)="closeImport()">✕</button>
          </div>

          @if (importStep() === 'pick') {
            <div class="modal-body">
              <p class="hint">Pilih file <strong>.geojson</strong> atau <strong>.shp</strong> (shapefile).</p>
              <p class="hint-sub">Untuk .shp, pilih file .shp-nya — atribut akan bisa diatur di langkah berikutnya.</p>

              <div class="drop-area" (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                <div class="drop-icon">📁</div>
                <div class="drop-text">Klik atau drag file ke sini</div>
                <div class="drop-sub">.geojson atau .shp</div>
              </div>
              <input #fileInput type="file" accept=".geojson,.shp" style="display:none" (change)="onFileSelect($event)" />

              @if (parseError()) {
                <div class="err">{{ parseError() }}</div>
              }
            </div>
          }

          @if (importStep() === 'map') {
            <div class="modal-body">
              <p class="hint">Ditemukan <strong>{{ parsedFeatures().length }} feature</strong>. Atur properti tiap zona:</p>

              <div class="feature-list">
                @for (f of parsedFeatures(); track $index; let i = $index) {
                  <div class="feature-row">
                    <div class="f-idx">{{ i + 1 }}</div>
                    <div class="f-fields">
                      <input class="f-input" [(ngModel)]="f.nama" placeholder="Nama zona" />
                      <select class="f-select" [(ngModel)]="f.tipe">
                        @for (t of tipeOptions; track t) {
                          <option [value]="t">{{ t }}</option>
                        }
                      </select>
                      <input class="f-input" [(ngModel)]="f.keterangan" placeholder="Keterangan (opsional)" />
                    </div>
                  </div>
                }
              </div>

              @if (importError()) {
                <div class="err">{{ importError() }}</div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn-cancel" (click)="importStep.set('pick')">← Kembali</button>
              <button class="btn-confirm" (click)="doImport()" [disabled]="importing()">
                {{ importing() ? 'Mengimport...' : '✓ Import ' + parsedFeatures().length + ' Zona' }}
              </button>
            </div>
          }

          @if (importStep() === 'done') {
            <div class="modal-body center">
              <div class="done-icon">✅</div>
              <div class="done-text">{{ importResult() }}</div>
              <button class="btn-confirm" (click)="closeImport()">Tutup & Muat Ulang Peta</button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: calc(100vh - 48px) }
    .peta-wrap { display: flex; flex-direction: column; height: 100% }
    .toolbar {
      background: white; padding: 10px 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      flex-shrink: 0;
    }
    .toolbar-title { font-size: 14px; font-weight: 800; color: #1f2937; white-space: nowrap }
    .toggles { display: flex; gap: 14px }
    .toggle-lbl { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #4b5563; cursor: pointer; user-select: none }
    .legend { display: flex; gap: 14px; flex-wrap: wrap }
    .leg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #4b5563 }
    .leg-dot  { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 1px 3px rgba(0,0,0,.25) }
    .leg-rect { width: 14px; height: 10px; border-radius: 2px; opacity: .7 }
    .btn-import {
      margin-left: auto; background: #1a4d2e; color: white;
      border: none; border-radius: 7px; padding: 7px 14px;
      font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
    }
    .btn-import:hover { background: #166534 }
    .map-container { flex: 1; min-height: 0; position: relative }
    .map-loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 16px 24px; border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,.12); font-size: 14px; color: #6b7280;
      z-index: 1000; pointer-events: none;
    }

    /* Modal */
    .modal-bg {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
    }
    .modal {
      background: white; border-radius: 14px; width: 520px; max-width: 95vw;
      max-height: 85vh; display: flex; flex-direction: column;
      box-shadow: 0 8px 40px rgba(0,0,0,.2);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; border-bottom: 1px solid #e5e7eb;
      font-size: 15px; font-weight: 800; color: #1f2937;
    }
    .modal-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #9ca3af }
    .modal-body { padding: 20px; overflow-y: auto; flex: 1 }
    .modal-footer { padding: 14px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 10px }
    .hint { font-size: 13px; color: #374151; margin-bottom: 6px }
    .hint-sub { font-size: 11px; color: #9ca3af; margin-bottom: 16px }
    .drop-area {
      border: 2px dashed #d1d5db; border-radius: 10px; padding: 36px;
      text-align: center; cursor: pointer; transition: border-color .2s;
    }
    .drop-area:hover { border-color: #1a4d2e }
    .drop-icon { font-size: 36px; margin-bottom: 8px }
    .drop-text { font-size: 14px; font-weight: 700; color: #374151 }
    .drop-sub { font-size: 12px; color: #9ca3af; margin-top: 4px }
    .err { background: #fee2e2; color: #991b1b; padding: 10px 12px; border-radius: 8px; font-size: 12px; margin-top: 12px }
    .feature-list { display: flex; flex-direction: column; gap: 10px }
    .feature-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px; background: #f9fafb; border-radius: 8px }
    .f-idx { width: 24px; height: 24px; background: #1a4d2e; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 6px }
    .f-fields { flex: 1; display: flex; flex-direction: column; gap: 6px }
    .f-input { width: 100%; box-sizing: border-box; border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 10px; font-size: 12px; outline: none }
    .f-input:focus { border-color: #1a4d2e }
    .f-select { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 10px; font-size: 12px; background: white; outline: none }
    .btn-cancel { background: #f3f4f6; color: #374151; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer }
    .btn-confirm { background: #1a4d2e; color: white; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer }
    .btn-confirm:disabled { background: #9ca3af; cursor: not-allowed }
    .center { text-align: center; padding: 32px 20px }
    .done-icon { font-size: 48px; margin-bottom: 12px }
    .done-text { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 20px }
  `],
})
export class PetaComponent implements OnDestroy {
  private readonly api   = inject(ApiService);
  private readonly elRef = inject(ElementRef);

  readonly loading = signal(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map: any        = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private zonaLayer: any  = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pointLayer: any = null;

  showZona    = true;
  showLaporan = true;

  // Import state
  showImport     = signal(false);
  importStep     = signal<'pick' | 'map' | 'done'>('pick');
  parsedFeatures = signal<ParsedFeature[]>([]);
  parseError     = signal('');
  importError    = signal('');
  importResult   = signal('');
  importing      = signal(false);
  readonly tipeOptions = TIPE_OPTIONS;

  readonly legendItems = [
    { label: 'Kemitraan', color: '#22c55e' },
    { label: 'Verifikasi', color: '#eab308' },
    { label: 'Ilegal',     color: '#ef4444' },
    { label: 'Baru',       color: '#3b82f6' },
  ];

  readonly zonaLegend = [
    { label: 'Kemitraan',    color: '#22c55e' },
    { label: 'Penyangga',    color: '#f97316' },
    { label: 'Inti',         color: '#ef4444' },
    { label: 'Rehabilitasi', color: '#a855f7' },
  ];

  constructor() {
    afterNextRender(async () => { await this.initMap(); });
  }

  private async initMap(): Promise<void> {
    const leafletMod = await import('leaflet');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (leafletMod as any).default ?? leafletMod;

    const mapEl = this.elRef.nativeElement.querySelector('.map-container') as HTMLElement;

    this.map = L.map(mapEl, { center: [-0.05, 100.85], zoom: 10, zoomControl: true });
    setTimeout(() => this.map?.invalidateSize(), 100);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(this.map);

    await Promise.all([this.loadZona(L), this.loadPoints(L)]);
    this.loading.set(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadZona(L: any): Promise<void> {
    try {
      const geojson = await this.api.getZonaGeoJSON();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.zonaLayer = L.geoJSON(geojson as any, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: (feature: any) => {
          const tipe  = feature?.properties?.tipe ?? 'kemitraan';
          const style = ZONA_STYLE[tipe] ?? ZONA_STYLE['kemitraan'];
          return { color: style.color, fillColor: style.fillColor, weight: 2, opacity: .8, fillOpacity: .15, dashArray: tipe === 'inti' ? '6 4' : undefined };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onEachFeature: (feature: any, layer: any) => {
          const p = feature.properties ?? {};
          layer.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:160px">
              <div style="background:#1a4d2e;color:white;padding:6px 10px;margin:-1px -1px 0;border-radius:6px 6px 0 0;font-size:11px;font-weight:700">${p['nama'] ?? '—'}</div>
              <div style="padding:8px 10px;font-size:12px">
                <div><span style="color:#9ca3af">Tipe: </span><strong>${p['tipe'] ?? '—'}</strong></div>
                ${p['keterangan'] ? `<div style="margin-top:5px;font-size:11px;color:#6b7280">${p['keterangan']}</div>` : ''}
              </div>
            </div>`, { maxWidth: 240 });
        },
      });
      if (this.showZona) this.zonaLayer.addTo(this.map);
    } catch { /* zona gagal — lanjut */ }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadPoints(L: any): Promise<void> {
    try {
      const geojson: MapPointsResponse = await this.api.getMapPoints();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.pointLayer = L.geoJSON(geojson as any, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointToLayer: (feature: any, latlng: any) => {
          const status = feature.properties?.['status'] ?? 'baru';
          const color  = STATUS_COLOR[status] ?? '#9ca3af';
          return L.circleMarker(latlng, { radius: 8, fillColor: color, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1 });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onEachFeature: (feature: any, layer: any) => {
          const p = feature.properties ?? {};
          layer.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:160px">
              <div style="background:#1a4d2e;color:white;padding:6px 10px;margin:-1px -1px 0;border-radius:6px 6px 0 0;font-size:11px;font-weight:700">${p['id'] ?? '—'}</div>
              <div style="padding:8px 10px;font-size:12px">
                <div style="margin-bottom:3px"><span style="color:#9ca3af">Penggarap: </span><strong>${p['nama'] ?? '—'}</strong></div>
                <div style="margin-bottom:3px"><span style="color:#9ca3af">Luas: </span>${p['luasHa'] ?? '—'} Ha</div>
                <div><span style="color:#9ca3af">Zona: </span><strong>${p['zonaTipe'] ?? '—'}</strong></div>
              </div>
            </div>`, { maxWidth: 220 });
        },
      });
      if (this.showLaporan) this.pointLayer.addTo(this.map);
    } catch { /* titik gagal */ }
  }

  toggleZona(): void {
    if (!this.zonaLayer || !this.map) return;
    if (this.showZona) this.zonaLayer.addTo(this.map); else this.map.removeLayer(this.zonaLayer);
  }

  toggleLaporan(): void {
    if (!this.pointLayer || !this.map) return;
    if (this.showLaporan) this.pointLayer.addTo(this.map); else this.map.removeLayer(this.pointLayer);
  }

  // ── Import Zona ────────────────────────────────────────────

  openImport(): void {
    this.importStep.set('pick');
    this.parsedFeatures.set([]);
    this.parseError.set('');
    this.importError.set('');
    this.importResult.set('');
    this.showImport.set(true);
  }

  closeImport(): void {
    if (this.importStep() === 'done') {
      // Reload zona layer
      this.reloadZona();
    }
    this.showImport.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onFileSelect(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  private async processFile(file: File): Promise<void> {
    this.parseError.set('');
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'geojson' || ext === 'json') {
        await this.parseGeoJSON(file);
      } else if (ext === 'shp') {
        await this.parseShapefile(file);
      } else {
        this.parseError.set('Format tidak didukung. Gunakan .geojson atau .shp');
      }
    } catch (err: unknown) {
      this.parseError.set('Gagal membaca file: ' + String(err));
    }
  }

  private async parseGeoJSON(file: File): Promise<void> {
    const text = await file.text();
    const geojson = JSON.parse(text);

    let features: ParsedFeature[] = [];

    if (geojson.type === 'FeatureCollection') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      features = geojson.features.map((f: any, i: number) => ({
        nama:       f.properties?.nama ?? f.properties?.NAMA ?? f.properties?.name ?? `Zona ${i + 1}`,
        tipe:       this.normalizeTipe(f.properties?.tipe ?? f.properties?.TIPE ?? f.properties?.type ?? 'kemitraan'),
        keterangan: f.properties?.keterangan ?? f.properties?.KETERANGAN ?? f.properties?.description ?? '',
        geometry:   f.geometry,
        rawProps:   f.properties,
      }));
    } else if (geojson.type === 'Feature') {
      features = [{
        nama:       geojson.properties?.nama ?? 'Zona 1',
        tipe:       this.normalizeTipe(geojson.properties?.tipe ?? 'kemitraan'),
        keterangan: geojson.properties?.keterangan ?? '',
        geometry:   geojson.geometry,
      }];
    } else {
      this.parseError.set('File GeoJSON tidak valid. Harus FeatureCollection atau Feature.');
      return;
    }

    if (features.length === 0) {
      this.parseError.set('Tidak ada feature ditemukan dalam file.');
      return;
    }

    this.parsedFeatures.set(features);
    this.importStep.set('map');
  }

  private async parseShapefile(file: File): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shpMod = await import('shapefile' as any);
    const shapefile = (shpMod as any).default ?? shpMod;

    const buffer = await file.arrayBuffer();
    const source = await shapefile.open(buffer);

    const features: ParsedFeature[] = [];
    let i = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await source.read();
      if (result.done) break;
      const f = result.value;
      features.push({
        nama:       f.properties?.nama ?? f.properties?.NAMA ?? f.properties?.name ?? `Zona ${i + 1}`,
        tipe:       this.normalizeTipe(f.properties?.tipe ?? f.properties?.TIPE ?? f.properties?.type ?? 'kemitraan'),
        keterangan: f.properties?.keterangan ?? f.properties?.KETERANGAN ?? '',
        geometry:   f.geometry,
        rawProps:   f.properties ?? {},
      });
      i++;
    }

    if (features.length === 0) {
      this.parseError.set('Tidak ada feature ditemukan dalam shapefile.');
      return;
    }

    this.parsedFeatures.set(features);
    this.importStep.set('map');
  }

  private normalizeTipe(raw: string): string {
    const v = String(raw).toLowerCase().trim();
    if (v.includes('inti'))          return 'inti';
    if (v.includes('penyangga'))     return 'penyangga';
    if (v.includes('rehabilitasi'))  return 'rehabilitasi';
    return 'kemitraan';
  }

  async doImport(): Promise<void> {
    this.importing.set(true);
    this.importError.set('');
    try {
      const res = await this.api.importZona(
        this.parsedFeatures().map(f => ({
          nama:       f.nama,
          tipe:       f.tipe,
          keterangan: f.keterangan || null,
          geometry:   f.geometry,
        }))
      );
      this.importResult.set(res.message);
      this.importStep.set('done');
    } catch (err: unknown) {
      this.importError.set('Import gagal: ' + String((err as { message?: string })?.message ?? err));
    } finally {
      this.importing.set(false);
    }
  }

  private async reloadZona(): Promise<void> {
    if (!this.map) return;
    if (this.zonaLayer) this.map.removeLayer(this.zonaLayer);
    const leafletMod = await import('leaflet');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (leafletMod as any).default ?? leafletMod;
    await this.loadZona(L);
  }

  ngOnDestroy(): void { this.map?.remove(); }
}
