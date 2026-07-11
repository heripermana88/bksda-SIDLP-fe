// ============================================================
// OfflineService — IndexedDB via idb-keyval + BackgroundSync
// Simpan laporan offline saat tidak ada koneksi internet
// ============================================================

import { Injectable, inject, signal } from '@angular/core';
import { get, set, del, entries } from 'idb-keyval';
import { ApiService, SubmitLaporanRequest } from './api.service';

const QUEUE_PREFIX = 'sidlp_offline_';

export interface OfflineEntry {
  id: string;
  payload: SubmitLaporanRequest;
  savedAt: string;
  retryCount: number;
}

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly api = inject(ApiService);

  readonly isOnline  = signal(navigator.onLine);
  readonly queueSize = signal(0);

  constructor() {
    window.addEventListener('online',  () => {
      this.isOnline.set(true);
      this.flushQueue();
    });
    window.addEventListener('offline', () => this.isOnline.set(false));
    this._updateQueueSize();
  }

  // ── Simpan ke IndexedDB ────────────────────────────────────

  async saveOffline(payload: SubmitLaporanRequest): Promise<string> {
    const id = `OFFLINE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const entry: OfflineEntry = {
      id,
      payload: { ...payload, isOfflineSubmission: true },
      savedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await set(`${QUEUE_PREFIX}${id}`, entry);
    await this._updateQueueSize();
    return id;
  }

  // ── Ambil semua antrian ────────────────────────────────────

  async getQueue(): Promise<OfflineEntry[]> {
    const all = await entries<string, OfflineEntry>();
    return all
      .filter(([key]) => (key as string).startsWith(QUEUE_PREFIX))
      .map(([, val]) => val)
      .sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  }

  // ── Kirim semua antrian saat online ───────────────────────

  async flushQueue(): Promise<void> {
    if (!navigator.onLine) return;
    const queue = await this.getQueue();
    for (const entry of queue) {
      try {
        await this.api.submitLaporan(entry.payload);
        await del(`${QUEUE_PREFIX}${entry.id}`);
      } catch {
        // Simpan kembali dengan retry count +1
        await set(`${QUEUE_PREFIX}${entry.id}`, {
          ...entry,
          retryCount: entry.retryCount + 1,
        });
      }
    }
    await this._updateQueueSize();
  }

  // ── Helper ─────────────────────────────────────────────────

  private async _updateQueueSize(): Promise<void> {
    const queue = await this.getQueue();
    this.queueSize.set(queue.length);
  }
}
