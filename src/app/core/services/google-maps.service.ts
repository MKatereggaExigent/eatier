import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

// Declare google maps types
declare global {
  interface Window {
    google: any;
  }
}

declare const google: any;

export interface PlaceResult {
  placeId: string;
  formattedAddress: string;
  name: string;
  latitude: number;
  longitude: number;
  addressComponents: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private autocompleteService: any | null = null;
  private geocoder: any | null = null;
  private isLoaded = false;

  constructor() {
    this.loadGoogleMapsScript();
  }

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        this.isLoaded = true;
        this.initializeServices();
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isLoaded = true;
        this.initializeServices();
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
  }

  private initializeServices(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.autocompleteService = new google.maps.places.AutocompleteService();
      this.geocoder = new google.maps.Geocoder();
    }
  }

  async getPlacePredictions(input: string): Promise<any[]> {
    if (!this.isLoaded) {
      await this.loadGoogleMapsScript();
    }

    return new Promise((resolve, reject) => {
      if (!this.autocompleteService) {
        reject(new Error('Autocomplete service not initialized'));
        return;
      }

      this.autocompleteService.getPlacePredictions(
        {
          input,
          types: ['establishment', 'geocode']
        },
        (predictions: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            reject(new Error(`Places API error: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Get place details using the new google.maps.places.Place API
   * This replaces the deprecated PlacesService.getDetails()
   */
  async getPlaceDetails(placeId: string): Promise<PlaceResult> {
    if (!this.isLoaded) {
      await this.loadGoogleMapsScript();
    }

    try {
      // Use the new Place class (recommended API)
      const { Place } = await google.maps.importLibrary('places');

      const place = new Place({
        id: placeId,
      });

      // Fetch the required fields using the new API
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents']
      });

      const addressComponents: any = {};

      // Parse address components from the new API format
      if (place.addressComponents) {
        for (const component of place.addressComponents) {
          const types = component.types || [];
          if (types.includes('street_number') || types.includes('route')) {
            addressComponents.street = (addressComponents.street || '') + ' ' + component.longText;
          }
          if (types.includes('locality')) {
            addressComponents.city = component.longText;
          }
          if (types.includes('administrative_area_level_1')) {
            addressComponents.state = component.longText;
          }
          if (types.includes('country')) {
            addressComponents.country = component.longText;
          }
          if (types.includes('postal_code')) {
            addressComponents.postalCode = component.longText;
          }
        }
      }

      // Trim street if it exists
      if (addressComponents.street) {
        addressComponents.street = addressComponents.street.trim();
      }

      return {
        placeId: place.id,
        formattedAddress: place.formattedAddress || '',
        name: place.displayName || '',
        latitude: place.location?.lat() || 0,
        longitude: place.location?.lng() || 0,
        addressComponents
      };
    } catch (error) {
      console.error('Error fetching place details with new API:', error);
      throw new Error(`Place details error: ${error}`);
    }
  }
}

