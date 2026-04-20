import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const apiKey = auth.apiKey;

  let cloned = req;
  if (token) {
    cloned = cloned.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  if (apiKey && !req.headers.has('x-api-key')) {
    cloned = cloned.clone({ setHeaders: { 'x-api-key': apiKey } });
  }
  return next(cloned);
};
