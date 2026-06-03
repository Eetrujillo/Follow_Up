import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}

interface BinResponse {
  record: {
    users: User[];
  };
}

@Injectable({ providedIn: 'root' })
export class JsonbinService {

  private binId    = '6a04ae5badc21f119a95e55d';
  private masterKey = '$2a$10$q0nqh4E/UvD5nuOYdltOc.jSgg.qq3oL2CXEISoe2eRt4dwvUS3wC';
  private baseUrl  = 'https://api.jsonbin.io/v3/b';

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'X-Master-Key': this.masterKey,
      'Content-Type': 'application/json'
    });
  }

  constructor(private http: HttpClient) {}

  // Leer todos los usuarios
  getUsers(): Observable<User[]> {
    return this.http.get<BinResponse>(
      `${this.baseUrl}/${this.binId}/latest`,
      { headers: this.headers }
    ).pipe(
      map(res => res.record.users || []),
      catchError(() => of([]))
    );
  }

  // Guardar lista actualizada de usuarios
  saveUsers(users: User[]): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/${this.binId}`,
      { users },
      { headers: this.headers }
    ).pipe(
      catchError(err => {
        console.error('Error guardando usuarios:', err);
        return of(null);
      })
    );
  }
}