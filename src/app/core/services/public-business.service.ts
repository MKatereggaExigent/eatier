import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicBusiness {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  businessName: string;
  businessType: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  sustainabilityEthos?: string;
  opensAt?: string;
  closesAt?: string;
  facilities?: string[];
  locationLinks?: string[];
  bio?: string;
  profilePhotos?: string[];
  backgroundImage?: string;
  accountStatus: string;
  priceRange?: string; // Auto-calculated: 'budget', 'moderate', 'expensive', 'luxury'
  createdAt: string;
  updatedAt: string;
}

export interface BusinessListResponse {
  businesses: PublicBusiness[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PublicBusinessService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/businesses`;

  getBusinesses(params?: {
    page?: number;
    limit?: number;
    type?: string;
    country?: string;
  }): Observable<BusinessListResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = queryParams.toString()
      ? `${this.apiUrl}?${queryParams.toString()}`
      : this.apiUrl;

    return this.http.get<BusinessListResponse>(url);
  }

  getBusinessById(businessId: string): Observable<{ business: PublicBusiness }> {
    return this.http.get<{ business: PublicBusiness }>(`${this.apiUrl}/${businessId}`);
  }
}

