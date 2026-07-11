import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Sliders, UtensilsCrossed, Heart, DollarSign, MapPin, Bell, Save } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface UserPreferences {
  cuisinePreferences: string[];
  dietaryRestrictions: string[];
  priceRangeMin: number;
  priceRangeMax: number;
  preferredDistance: number;
  notifyNewRestaurants: boolean;
  notifyPromotions: boolean;
  notifyRecommendations: boolean;
}

@Component({
  selector: 'app-user-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './user-preferences.component.html',
  styleUrls: ['./user-preferences.component.scss']
})
export class UserPreferencesComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  readonly Sliders = Sliders;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Heart = Heart;
  readonly DollarSign = DollarSign;
  readonly MapPin = MapPin;
  readonly Bell = Bell;
  readonly Save = Save;

  loading = signal(true);
  saving = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  preferences = signal<UserPreferences>({
    cuisinePreferences: [],
    dietaryRestrictions: [],
    priceRangeMin: 1,
    priceRangeMax: 4,
    preferredDistance: 10,
    notifyNewRestaurants: true,
    notifyPromotions: true,
    notifyRecommendations: true
  });

  availableCuisines = [
    'Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian', 'Thai',
    'French', 'Mediterranean', 'American', 'Korean', 'Vietnamese',
    'Greek', 'Spanish', 'Middle Eastern', 'African', 'Caribbean'
  ];

  availableDietaryRestrictions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free',
    'Halal', 'Kosher', 'Low-Carb', 'Keto', 'Paleo'
  ];

  ngOnInit(): void {
    this.loadPreferences();
  }

  loadPreferences(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/user-preferences`).subscribe({
      next: (data) => {
        if (data) {
          this.preferences.set({
            cuisinePreferences: data.cuisinePreferences || [],
            dietaryRestrictions: data.dietaryRestrictions || [],
            priceRangeMin: data.priceRangeMin || 1,
            priceRangeMax: data.priceRangeMax || 4,
            preferredDistance: data.preferredDistance || 10,
            notifyNewRestaurants: data.notifyNewRestaurants ?? true,
            notifyPromotions: data.notifyPromotions ?? true,
            notifyRecommendations: data.notifyRecommendations ?? true
          });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleCuisine(cuisine: string): void {
    const current = this.preferences();
    const cuisines = current.cuisinePreferences.includes(cuisine)
      ? current.cuisinePreferences.filter(c => c !== cuisine)
      : [...current.cuisinePreferences, cuisine];
    this.preferences.set({ ...current, cuisinePreferences: cuisines });
  }

  toggleDietary(restriction: string): void {
    const current = this.preferences();
    const restrictions = current.dietaryRestrictions.includes(restriction)
      ? current.dietaryRestrictions.filter(r => r !== restriction)
      : [...current.dietaryRestrictions, restriction];
    this.preferences.set({ ...current, dietaryRestrictions: restrictions });
  }

  updatePreference(key: keyof UserPreferences, value: any): void {
    this.preferences.update(p => ({ ...p, [key]: value }));
  }

  savePreferences(): void {
    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.http.put(`${environment.apiUrl}/user-preferences`, this.preferences()).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMessage.set('Preferences saved successfully!');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to save preferences');
      }
    });
  }

  isCuisineSelected(cuisine: string): boolean {
    return this.preferences().cuisinePreferences.includes(cuisine);
  }

  isDietarySelected(restriction: string): boolean {
    return this.preferences().dietaryRestrictions.includes(restriction);
  }
}
