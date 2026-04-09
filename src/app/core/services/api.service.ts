import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export const API_URL = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${API_URL}${path}`);
  }
  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${API_URL}${path}`, body);
  }
  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${API_URL}${path}`, body);
  }
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${API_URL}${path}`);
  }
}
