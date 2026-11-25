import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiRequestOptions {
  headers?: HttpHeaders | Record<string, string>;
  context?: HttpContext;
  params?: HttpParams | Record<string, string | number | boolean>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(url: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.get<T>(url, this.normalizeOptions(options));
  }

  post<T>(url: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.post<T>(url, body, this.normalizeOptions(options));
  }

  put<T>(url: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.put<T>(url, body, this.normalizeOptions(options));
  }

  delete<T>(url: string, options?: ApiRequestOptions): Observable<T> {
    return this.http.delete<T>(url, this.normalizeOptions(options));
  }

  patch<T>(url: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.http.patch<T>(url, body, this.normalizeOptions(options));
  }

  private normalizeOptions(options?: ApiRequestOptions) {
    if (!options) {
      return {};
    }

    return {
      headers: options.headers,
      context: options.context,
      params: options.params,
    };
  }
}
