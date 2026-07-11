import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Publik ──────────────────────────────────────────────────
  {
    path: 'scan/:token',
    loadComponent: () =>
      import('./features/scan/scan.component').then((m) => m.ScanComponent),
    title: 'Scan Lahan — SIDLP',
  },
  {
    path: 'form/:token',
    loadComponent: () =>
      import('./features/form/form-container.component').then(
        (m) => m.FormContainerComponent
      ),
    title: 'Formulir Pendataan — SIDLP',
  },
  {
    path: 'sukses/:laporanId',
    loadComponent: () =>
      import('./features/form/form-sukses.component').then(
        (m) => m.FormSuksesComponent
      ),
    title: 'Laporan Terkirim — SIDLP',
  },

  // ── Auth ────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
    title: 'Login Petugas — SIDLP',
  },

  // ── Protected: Dashboard ────────────────────────────────────
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'monitoring',
        pathMatch: 'full',
      },
      {
        path: 'monitoring',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        title: 'Monitoring — SIDLP',
      },
      {
        path: 'peta',
        loadComponent: () =>
          import('./features/dashboard/peta.component').then(
            (m) => m.PetaComponent
          ),
        title: 'Peta GIS — SIDLP',
      },
      {
        path: 'qr',
        loadComponent: () =>
          import('./features/dashboard/qr.component').then(
            (m) => m.QrComponent
          ),
        title: 'QR Code — SIDLP',
      },
    ],
  },

  // ── Fallback ────────────────────────────────────────────────
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
