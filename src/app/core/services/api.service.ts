// ============================================================
// ApiService — typed HTTP wrapper untuk Encore.ts endpoints
// Semua return Promise (tidak perlu toSignal di sini)
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';

// ── Types (mirror dari Encore API) ────────────────────────────

export interface LahanInfo {
  lahanId: string;
  token: string;
  nama: string;
  nik: string;
  kelompokTani: string | null;
  dusun: string;
  nomorHp: string | null;
  luasHa: number;
  jenisTanaman: string;
  tahunGarap: number;
  statusLahan: string;
  fotoPanoramaUrl: string | null;
  fotoDetailUrl: string | null;
  status: 'baru' | 'verifikasi' | 'kemitraan' | 'ilegal' | 'ditunda';
  zonaTipe: string | null;
  zonaNama: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TokenCheckResponse {
  registered: boolean;
  lahan: LahanInfo | null;
}

export interface SubmitLaporanRequest {
  token: string;
  nama: string;
  nik: string;
  kelompokTani?: string;
  dusun: string;
  nomorHp?: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  luasHa: number;
  jenisTanaman: string;
  tahunGarap: number;
  statusLahan: string;
  fotoPanoramaUrl?: string;
  fotoDetailUrl?: string;
  isOfflineSubmission?: boolean;
}

export interface SubmitLaporanResponse {
  laporanId: string;
  status: string;
  zonaTipe: string | null;
  zonaNama: string | null;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  kemitraan: number;
  verifikasi: number;
  ilegal: number;
  baru: number;
  ditunda: number;
}

export interface ListLaporanResponse {
  data: LahanInfo[];
  total: number;
  limit: number;
  offset: number;
}

export interface MapPointsFeature {
  type: string;
  geometry: { type: string; coordinates: number[] };
  properties: {
    id: string;
    nama: string;
    status: string;
    zonaTipe: string | null;
    luasHa: number;
    jenisTanaman: string;
  };
}

export interface MapPointsResponse {
  type: string;
  features: MapPointsFeature[];
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresIn: number;
}

const BASE = `${environment.apiBase}/api`;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // ── Lahan ──────────────────────────────────────────────────

  getByToken(token: string): Promise<TokenCheckResponse> {
    return firstValueFrom(
      this.http.get<TokenCheckResponse>(`${BASE}/lahan/${token}`)
    );
  }

  submitLaporan(data: SubmitLaporanRequest): Promise<SubmitLaporanResponse> {
    return firstValueFrom(
      this.http.post<SubmitLaporanResponse>(`${BASE}/laporan`, data)
    );
  }

  getLaporanById(id: string): Promise<LahanInfo> {
    return firstValueFrom(
      this.http.get<LahanInfo>(`${BASE}/laporan/${id}`)
    );
  }

  getPhotoViewUrl(key: string): Promise<{ url: string }> {
    return firstValueFrom(
      this.http.get<{ url: string }>(`${BASE}/upload/view/${encodeURIComponent(key)}`)
    );
  }

  listLaporan(params?: {
    status?: string;
    zonaTipe?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListLaporanResponse> {
    let httpParams = new HttpParams();
    if (params?.status)    httpParams = httpParams.set('status', params.status);
    if (params?.zonaTipe)  httpParams = httpParams.set('zonaTipe', params.zonaTipe);
    if (params?.limit)     httpParams = httpParams.set('limit', params.limit);
    if (params?.offset)    httpParams = httpParams.set('offset', params.offset);

    return firstValueFrom(
      this.http.get<ListLaporanResponse>(`${BASE}/laporan`, {
        params: httpParams,
      })
    );
  }

  updateStatus(
    id: string,
    status: string,
    catatanVerifikasi?: string
  ): Promise<{ ok: boolean }> {
    return firstValueFrom(
      this.http.patch<{ ok: boolean }>(`${BASE}/laporan/${id}/status`, {
        id,
        status,
        catatanVerifikasi,
      })
    );
  }

  getDashboardStats(): Promise<DashboardStats> {
    return firstValueFrom(
      this.http.get<DashboardStats>(`${BASE}/dashboard/stats`)
    );
  }

  getMapPoints(): Promise<MapPointsResponse> {
    return firstValueFrom(
      this.http.get<MapPointsResponse>(`${BASE}/laporan/map`)
    );
  }

  // ── Upload ─────────────────────────────────────────────────

  presignUpload(
    fileName: string,
    mimeType: string,
    folder: 'panorama' | 'detail'
  ): Promise<PresignedUploadResponse> {
    return firstValueFrom(
      this.http.post<PresignedUploadResponse>(`${BASE}/upload/presign`, {
        fileName,
        mimeType,
        folder,
      })
    );
  }

  /** Upload file langsung ke MinIO via presigned PUT URL */
  async uploadPhoto(
    file: File,
    folder: 'panorama' | 'detail'
  ): Promise<string> {
    const { uploadUrl, publicUrl } = await this.presignUpload(
      file.name,
      file.type,
      folder
    );

    // PUT langsung ke MinIO (bukan via /api proxy)
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    return publicUrl;
  }

  getZonaGeoJSON(): Promise<{
    type: string;
    features: Array<{
      type: string;
      geometry: { type: string; coordinates: unknown };
      properties: { nama: string; tipe: string; keterangan: string | null };
    }>;
  }> {
    return firstValueFrom(
      this.http.get<{
        type: string;
        features: Array<{
          type: string;
          geometry: { type: string; coordinates: unknown };
          properties: { nama: string; tipe: string; keterangan: string | null };
        }>;
      }>(`${BASE}/zona/geojson`)
    );
  }

  // ── QR ─────────────────────────────────────────────────────

  generateQr(count: number, baseUrl?: string): Promise<{
    tokens: Array<{ token: string; scanUrl: string; qrDataUrl: string }>;
    generatedAt: string;
  }> {
    return firstValueFrom(
      this.http.post<{
        tokens: Array<{ token: string; scanUrl: string; qrDataUrl: string }>;
        generatedAt: string;
      }>(`${BASE}/qr/generate`, { count, baseUrl: baseUrl ?? window.location.origin })
    );
  }

  listQr(params?: { limit?: number; offset?: number }): Promise<{
    data: Array<{ token: string; isUsed: boolean; createdAt: string }>;
    total: number;
  }> {
    let httpParams = new HttpParams();
    if (params?.limit)  httpParams = httpParams.set('limit',  params.limit);
    if (params?.offset) httpParams = httpParams.set('offset', params.offset);
    return firstValueFrom(
      this.http.get<{
        data: Array<{ token: string; isUsed: boolean; createdAt: string }>;
        total: number;
      }>(`${BASE}/qr`, { params: httpParams })
    );
  }
}
