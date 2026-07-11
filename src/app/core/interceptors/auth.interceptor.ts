import {
  HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const addBearer = (req: HttpRequest<unknown>, token: string) =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

const needsAuth = (url: string) =>
  url.startsWith('/api') || url.startsWith('http');

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth  = inject(AuthService);
  const token = auth.accessToken();

  const authReq = (token && needsAuth(req.url))
    ? addBearer(req, token)
    : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      const httpErr = err as HttpErrorResponse;
      // Jika 401 dan bukan dari endpoint auth sendiri → coba refresh
      if (httpErr.status === 401 && !req.url.includes('/auth/')) {
        return from(auth.refreshAccessToken()).pipe(
          switchMap(newToken => {
            if (!newToken) return throwError(() => err);
            return next(addBearer(req, newToken));
          })
        );
      }
      return throwError(() => err);
    })
  );
};
