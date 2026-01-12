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
  private isLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.loadGoogleMapsScript();
  }

  private loadGoogleMapsScript(): Promise<void> {
    // Return existing promise if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      if (typeof google !== 'undefined' && google.maps) {
        this.isLoaded = true;
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          this.isLoaded = true;
          resolve();
        });
        return;
      }

      const script = document.createElement('script');
      // Use loading=async parameter for optimal performance (recommended by Google)
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places&loading=async`;
      script.async = true;
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  /**
   * Get place predictions using the new AutocompleteSuggestion API
   * This replaces the deprecated AutocompleteService
   */
  async getPlacePredictions(input: string): Promise<any[]> {
    if (!this.isLoaded) {
      await this.loadGoogleMapsScript();
    }

    try {
      const { AutocompleteSessionToken, AutocompleteSuggestion } = await google.maps.importLibrary('places');

      // Create a session token for billing optimization
      const sessionToken = new AutocompleteSessionToken();

      // Use the new AutocompleteSuggestion.fetchAutocompleteSuggestions API
      const request = {
        input,
        sessionToken,
        includedPrimaryTypes: ['establishment', 'geocode']
      };

      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      if (!suggestions || suggestions.length === 0) {
        return [];
      }

      // Transform to match the old API format for backward compatibility
      return suggestions.map((suggestion: any) => ({
        place_id: suggestion.placePrediction?.placeId || '',
        description: suggestion.placePrediction?.text?.text || '',
        structured_formatting: {
          main_text: suggestion.placePrediction?.mainText?.text || '',
          secondary_text: suggestion.placePrediction?.secondaryText?.text || ''
        }
      }));
    } catch (error) {
      console.error('Error fetching autocomplete suggestions:', error);
      return [];
    }
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

