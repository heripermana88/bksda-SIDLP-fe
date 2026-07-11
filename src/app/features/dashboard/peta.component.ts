// ============================================================
// PetaComponent — Leaflet.js Web-GIS map
// Dynamic import untuk SSR-safe + zoneless compatibility
// ============================================================

import {
  Component, inject, signal, OnDestroy, afterNextRender, ElementRef
} from '@angular/core';
import { ApiService, MapPointsResponse } from '@core/services/api.service';

const STATUS_COLOR: Record<string, string> = {
  kemitraan: '#22c55e',
  verifikasi: '#eab308',
  ilegal: '#ef4444',
  baru: '#3b82f6',
  ditunda: '#9ca3af',
};

@Component({
  selector: 'app-peta',
  standalone: true,
  template: `
    <div class="peta-wrap">
      <div class="toolbar">
        <span class="toolbar-title">Peta Kawasan SM BRBB</span>
        <div class="legend">
          @for (item of legendItems; track item.label) {
            <div class="leg-item">
              <span class="leg-dot" [style.background]="item.color"></span>
              {{ item.label }}
            </div>
          }
        </div>
      </div>
      <div #mapEl class="map-container"></div>
      @if (loading()) {
        <div class="map-loading">🗺️ Memuat peta dan titik lahan...</div>
      }
    </div>
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
    .toolbar-title { font-size: 14px; font-weight: 800; color: #1f2937 }
    .legend { display: flex; gap: 16px; margin-left: auto; flex-wrap: wrap }
    .leg-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #4b5563 }
    .leg-dot { width: 11px; height: 11px; border-radius: 50%; border: 1.5px solid white; box-shadow: 0 1px 3px rgba(0,0,0,.25) }
    .map-container { flex: 1; min-height: 0; position: relative }
    .map-loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 16px 24px; border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,.12); font-size: 14px; color: #6b7280;
      z-index: 1000;
    }
  `],
})
export class PetaComponent implements OnDestroy {
  private readonly api  = inject(ApiService);
  private readonly elRef = inject(ElementRef);

  readonly loading = signal(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map: any = null;

  readonly legendItems = [
    { label: 'Kemitraan', color: '#22c55e' },
    { label: 'Verifikasi', color: '#eab308' },
    { label: 'Ilegal',    color: '#ef4444' },
    { label: 'Baru',      color: '#3b82f6' },
  ];

  constructor() {
    // afterNextRender = SSR-safe, zoneless-safe DOM initialization
    afterNextRender(async () => {
      await this.initMap();
    });
  }

  private async initMap(): Promise<void> {
    // Dynamic import — tidak bundled jika SSR
    const L = await import('leaflet');

    const mapEl = this.elRef.nativeElement.querySelector('.map-container') as HTMLElement;

    this.map = L.map(mapEl, {
      center:  [0.4167, 101.2167],
      zoom:    11,
      zoomControl: true,
    });

    // Paksa Leaflet recalculate ukuran container setelah render
    setTimeout(() => this.map?.invalidateSize(), 100);

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(this.map);

    // Load titik lahan dari API
    try {
      const geojson: MapPointsResponse = await this.api.getMapPoints();
      this.loading.set(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      L.geoJSON(geojson as any, {
        pointToLayer: (feature, latlng) => {
          const status = feature.properties?.['status'] ?? 'baru';
          const color  = STATUS_COLOR[status] ?? '#9ca3af';

          return L.circleMarker(latlng, {
            radius:      8,
            fillColor:   color,
            color:       '#ffffff',
            weight:      2,
            opacity:     1,
            fillOpacity: 1,
          });
        },
        onEachFeature: (feature, layer) => {
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
      }).addTo(this.map);
    } catch {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
