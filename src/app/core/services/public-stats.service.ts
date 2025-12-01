import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicStatistics {
  activeUsers: number;
  restaurants: number;
  reviews: number;
  specialists: number;
}

@Injectable({
  providedIn: 'root'
})
export class PublicStatsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/public`;

  /**
   * Get public platform statistics (no authentication required)
   */
  getStatistics(): Observable<PublicStatistics> {
    return this.http.get<PublicStatistics>(`${this.apiUrl}/stats`);
  }
}

