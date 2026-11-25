import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BACKEND_API_URL } from '../services/backend-api.config';
import { TokenStorage } from '../services/token-storage';

/**
 * Attaches the JWT to every call that targets our backend, and only to those.
 * Third-party URLs (Cohere, jsonbin) never receive the user's token.
 */
export const backendAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(BACKEND_API_URL)) {
    return next(request);
  }

  const token = inject(TokenStorage).get();
  if (!token) {
    return next(request);
  }

  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
