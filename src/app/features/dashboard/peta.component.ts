// ============================================================
// PetaComponent — Leaflet.js Web-GIS map
// Marker titik laporan + overlay polygon zona kawasan SM BRBB
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

@Component({
  selector: 'app-peta',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="peta-wrap">
      <div class="toolbar">
        <span class="toolbar-title">🗺️ Peta Kawasan SM BRBB</span>

        <!-- Toggle layers -->
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

        <!-- Legend titik -->
        <div class="legend">
          @for (item of legendItems; track item.label) {
            <div class="leg-item">
              <span class="leg-dot" [style.background]="item.color"></span>
              {{ item.label }}
            </div>
          }
        </div>

        <!-- Legend zona -->
        <div class="legend">
          @for (item of zonaLegend; track item.label) {
            <div class="leg-item">
              <span class="leg-rect" [style.background]="item.color"></span>
              {{ item.label }}
            </div>
          }
        </div>
      </div>

      <div #mapEl class="map-container"></div>

      @if (loading()) {
        <div class="map-loading">🗺️ Memuat peta...</div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: calc(100vh - 48px) }
    .peta-wrap { display: flex; flex-direction: column; height: 100% }
    .toolbar {
      background: white; padding: 10px 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
      flex-shrink: 0;
    }
    .toolbar-title { font-size: 14px; font-weight: 800; color: #1f2937; white-space: nowrap }
    .toggles { display: flex; gap: 14px }
    .toggle-lbl {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: #4b5563; cursor: pointer; user-select: none;
    }
    .legend { display: flex; gap: 14px; flex-wrap: wrap }
    .leg-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #4b5563 }
    .leg-dot  { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 1px 3px rgba(0,0,0,.25) }
    .leg-rect { width: 14px; height: 10px; border-radius: 2px; opacity: .7 }
    .map-container { flex: 1; min-height: 0; position: relative }
    .map-loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 16px 24px; border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,.12); font-size: 14px; color: #6b7280;
      z-index: 1000; pointer-events: none;
    }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leafletMod = await import('leaflet');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (leafletMod as any).default ?? leafletMod;

    const mapEl = this.elRef.nativeElement.querySelector('.map-container') as HTMLElement;

    this.map = L.map(mapEl, {
      center: [0.4167, 101.2167],
      zoom: 11,
      zoomControl: true,
    });

    setTimeout(() => this.map?.invalidateSize(), 100);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(this.map);

    // Load zona & titik laporan secara paralel
    await Promise.all([
      this.loadZona(L),
      this.loadPoints(L),
    ]);

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
          return {
            color:       style.color,
            fillColor:   style.fillColor,
            weight:      2,
            opacity:     .8,
            fillOpacity: .15,
            dashArray:   tipe === 'inti' ? '6 4' : undefined,
          };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onEachFeature: (feature: any, layer: any) => {
          const p = feature.properties ?? {};
          layer.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:160px">
              <div style="background:#1a4d2e;color:white;padding:6px 10px;margin:-1px -1px 0;border-radius:6px 6px 0 0;font-size:11px;font-weight:700">
                ${p['nama'] ?? '—'}
              </div>
              <div style="padding:8px 10px;font-size:12px">
                <div><span style="color:#9ca3af">Tipe: </span><strong>${p['tipe'] ?? '—'}</strong></div>
                ${p['keterangan'] ? `<div style="margin-top:5px;font-size:11px;color:#6b7280">${p['keterangan']}</div>` : ''}
              </div>
            </div>
          `, { maxWidth: 240 });
        },
      });

      if (this.showZona) this.zonaLayer.addTo(this.map);
    } catch {
      // zona gagal dimuat — lanjut tanpa overlay
    }
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
          return L.circleMarker(latlng, {
            radius: 8, fillColor: color,
            color: '#ffffff', weight: 2,
            opacity: 1, fillOpacity: 1,
          });
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onEachFeature: (feature: any, layer: any) => {
          const p = feature.properties ?? {};
          layer.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:160px">
              <div style="background:#1a4d2e;color:white;padding:6px 10px;margin:-1px -1px 0;border-radius:6px 6px 0 0;font-size:11px;font-weight:700">
                ${p['id'] ?? '—'}
              </div>
              <div style="padding:8px 10px;font-size:12px">
                <div style="margin-bottom:3px"><span style="color:#9ca3af">Penggarap: </span><strong>${p['nama'] ?? '—'}</strong></div>
                <div style="margin-bottom:3px"><span style="color:#9ca3af">Luas: </span>${p['luasHa'] ?? '—'} Ha</div>
                <div style="margin-bottom:3px"><span style="color:#9ca3af">Tanaman: </span>${p['jenisTanaman'] ?? '—'}</div>
                <div><span style="color:#9ca3af">Zona: </span><strong>${p['zonaTipe'] ?? '—'}</strong></div>
              </div>
            </div>
          `, { maxWidth: 220 });
        },
      });

      if (this.showLaporan) this.pointLayer.addTo(this.map);
    } catch {
      // titik gagal dimuat
    }
  }

  toggleZona(): void {
    if (!this.zonaLayer || !this.map) return;
    if (this.showZona) {
      this.zonaLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.zonaLayer);
    }
  }

  toggleLaporan(): void {
    if (!this.pointLayer || !this.map) return;
    if (this.showLaporan) {
      this.pointLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.pointLayer);
    }
  }

  ngOnDestroy(): void { this.map?.remove(); }
}
