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
  private placesService: any | null = null;
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

      // PlacesService requires a map or div element
      const div = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(div);
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

  async getPlaceDetails(placeId: string): Promise<PlaceResult> {
    if (!this.isLoaded) {
      await this.loadGoogleMapsScript();
    }

    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        reject(new Error('Places service not initialized'));
        return;
      }

      this.placesService.getDetails(
        {
          placeId,
          fields: ['place_id', 'formatted_address', 'name', 'geometry', 'address_components']
        },
        (place: any, status: any) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const addressComponents: any = {};

            place.address_components?.forEach((component: any) => {
              if (component.types.includes('street_number') || component.types.includes('route')) {
                addressComponents.street = (addressComponents.street || '') + ' ' + component.long_name;
              }
              if (component.types.includes('locality')) {
                addressComponents.city = component.long_name;
              }
              if (component.types.includes('administrative_area_level_1')) {
                addressComponents.state = component.long_name;
              }
              if (component.types.includes('country')) {
                addressComponents.country = component.long_name;
              }
              if (component.types.includes('postal_code')) {
                addressComponents.postalCode = component.long_name;
              }
            });

            resolve({
              placeId: place.place_id!,
              formattedAddress: place.formatted_address!,
              name: place.name!,
              latitude: place.geometry!.location!.lat(),
              longitude: place.geometry!.location!.lng(),
              addressComponents
            });
          } else {
            reject(new Error(`Place details error: ${status}`));
          }
        }
      );
    });
  }
}

