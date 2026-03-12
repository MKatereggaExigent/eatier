import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  countryCode: string;
  countryName: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  phone_code: string;
  region_id: string;
  region_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Default currency (South Africa - where business is registered)
  private readonly DEFAULT_CURRENCY: CurrencyInfo = {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    countryCode: 'ZA',
    countryName: 'South Africa'
  };

  // Current currency state
  private currentCurrencySubject = new BehaviorSubject<CurrencyInfo>(this.DEFAULT_CURRENCY);
  public currentCurrency$ = this.currentCurrencySubject.asObservable();

  // User's detected location
  private userLocationSubject = new BehaviorSubject<Country | null>(null);
  public userLocation$ = this.userLocationSubject.asObservable();

  // Cache for countries
  private countriesCache: Country[] | null = null;

  constructor() {
    // Try to load saved currency preference
    const savedCurrency = this.getSavedCurrency();
    if (savedCurrency) {
      this.currentCurrencySubject.next(savedCurrency);
    } else {
      // Detect user's location and set currency
      this.detectUserLocation();
    }
  }

  /**
   * Get all countries with currency information
   */
  getCountries(): Observable<Country[]> {
    if (this.countriesCache) {
      return of(this.countriesCache);
    }

    return this.http.get<Country[]>(`${this.apiUrl}/business-ads/countries`).pipe(
      tap(countries => this.countriesCache = countries),
      catchError(error => {
        console.error('Error fetching countries:', error);
        return of([]);
      })
    );
  }

  /**
   * Detect user's location based on IP address
   */
  detectUserLocation(): void {
    // Try to get location from IP using a free geolocation API
    this.http.get<any>('https://ipapi.co/json/').pipe(
      catchError(() => {
        // Fallback: try another service
        return this.http.get<any>('https://api.country.is/').pipe(
          map(data => ({ country_code: data.country })),
          catchError(() => of(null))
        );
      })
    ).subscribe(locationData => {
      if (locationData && locationData.country_code) {
        this.setUserLocationByCountryCode(locationData.country_code);
      }
    });
  }

  /**
   * Set user location and currency by country code
   */
  private setUserLocationByCountryCode(countryCode: string): void {
    this.getCountries().subscribe(countries => {
      const country = countries.find(c => c.code === countryCode);
      if (country) {
        this.userLocationSubject.next(country);

        // Set currency based on user's location
        const currency: CurrencyInfo = {
          code: country.currency_code,
          symbol: country.currency_symbol,
          name: country.currency_name,
          countryCode: country.code,
          countryName: country.name
        };

        this.setCurrency(currency);
      }
    });
  }

  /**
   * Set the current currency
   */
  setCurrency(currency: CurrencyInfo): void {
    this.currentCurrencySubject.next(currency);
    this.saveCurrency(currency);
  }

  /**
   * Get the current currency
   */
  getCurrentCurrency(): CurrencyInfo {
    return this.currentCurrencySubject.value;
  }

  /**
   * Format amount with current currency
   */
  formatAmount(amount: number, currencyCode?: string): string {
    const currency = currencyCode
      ? this.getCurrencyByCode(currencyCode)
      : this.getCurrentCurrency();

    return `${currency.symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Format amount with minimal decimals (for whole numbers)
   */
  formatAmountMinimal(amount: number, currencyCode?: string): string {
    const currency = currencyCode
      ? this.getCurrencyByCode(currencyCode)
      : this.getCurrentCurrency();

    return `${currency.symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }

  /**
   * Get currency information by currency code
   */
  private getCurrencyByCode(code: string): CurrencyInfo {
    // Try to find from countries cache
    if (this.countriesCache) {
      const country = this.countriesCache.find(c => c.currency_code === code);
      if (country) {
        return {
          code: country.currency_code,
          symbol: country.currency_symbol,
          name: country.currency_name,
          countryCode: country.code,
          countryName: country.name
        };
      }
    }

    // Fallback to current currency
    return this.getCurrentCurrency();
  }

  /**
   * Get currency by country code
   */
  getCurrencyByCountryCode(countryCode: string): Observable<CurrencyInfo | null> {
    return this.getCountries().pipe(
      map(countries => {
        const country = countries.find(c => c.code === countryCode);
        if (country) {
          return {
            code: country.currency_code,
            symbol: country.currency_symbol,
            name: country.currency_name,
            countryCode: country.code,
            countryName: country.name
          };
        }
        return null;
      })
    );
  }

  /**
   * Save currency preference to localStorage
   */
  private saveCurrency(currency: CurrencyInfo): void {
    try {
      localStorage.setItem('user_currency', JSON.stringify(currency));
    } catch (error) {
      console.error('Error saving currency preference:', error);
    }
  }

  /**
   * Get saved currency preference from localStorage
   */
  private getSavedCurrency(): CurrencyInfo | null {
    try {
      const saved = localStorage.getItem('user_currency');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading currency preference:', error);
    }
    return null;
  }

  /**
   * Reset to default currency (ZAR - South Africa)
   */
  resetToDefault(): void {
    this.setCurrency(this.DEFAULT_CURRENCY);
  }

  /**
   * Get all available currencies
   */
  getAvailableCurrencies(): Observable<CurrencyInfo[]> {
    return this.getCountries().pipe(
      map(countries => {
        // Remove duplicates (some countries might share currencies)
        const uniqueCurrencies = new Map<string, CurrencyInfo>();

        countries.forEach(country => {
          if (!uniqueCurrencies.has(country.currency_code)) {
            uniqueCurrencies.set(country.currency_code, {
              code: country.currency_code,
              symbol: country.currency_symbol,
              name: country.currency_name,
              countryCode: country.code,
              countryName: country.name
            });
          }
        });

        return Array.from(uniqueCurrencies.values());
      })
    );
  }

  /**
   * Set currency based on business country
   */
  setCurrencyByBusinessCountry(countryCode: string): void {
    this.getCurrencyByCountryCode(countryCode).subscribe(currency => {
      if (currency) {
        this.setCurrency(currency);
      }
    });
  }
}

