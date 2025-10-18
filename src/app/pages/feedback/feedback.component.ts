import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Interfaces
interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  rating: number;
  image: string;
}

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  subject: string;
  description: string;
  rating?: number;
  restaurant?: Restaurant;
  status: 'pending' | 'reviewed' | 'resolved' | 'closed';
  submittedAt: Date;
  response?: string;
}

interface CommunityStats {
  totalFeedback: number;
  implementedSuggestions: number;
  bugsFixed: number;
  averageRating: number;
}

type FeedbackType = 'general' | 'bug' | 'feature' | 'business' | 'restaurant' | 'compliment';
type FeedbackStep = 'type-selection' | 'feedback-form' | 'success';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, TitleCasePipe],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss'
})
export class FeedbackComponent implements OnInit {
  // State management
  currentStep = signal<FeedbackStep>('type-selection');
  selectedFeedbackType = signal<FeedbackType | null>(null);
  rating = signal(0);
  hoverRating = signal(0);
  isSubmitting = signal(false);
  isDragOver = signal(false);

  // Restaurant search
  restaurantQuery = '';
  selectedRestaurant = signal<Restaurant | null>(null);
  restaurantResults = signal<Restaurant[]>([]);

  // File attachments
  attachedFiles = signal<File[]>([]);

  // Form
  feedbackForm: FormGroup;

  // Mock data
  recentFeedback = signal<FeedbackItem[]>([
    {
      id: '1',
      type: 'feature',
      subject: 'Dark mode support',
      description: 'Would love to see a dark mode option for the app',
      status: 'reviewed',
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      response: 'Thanks for the suggestion! Dark mode is planned for our next major release.'
    },
    {
      id: '2',
      type: 'bug',
      subject: 'Search not working on mobile',
      description: 'Restaurant search crashes on iPhone',
      status: 'resolved',
      submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      response: 'This issue has been fixed in version 2.1.3. Please update your app.'
    }
  ]);

  communityStats = signal<CommunityStats>({
    totalFeedback: 12847,
    implementedSuggestions: 156,
    bugsFixed: 89,
    averageRating: 4.6
  });

  // Mock restaurants for search
  private mockRestaurants: Restaurant[] = [
    {
      id: '1',
      name: 'The Golden Spoon',
      cuisine: 'Italian',
      location: 'Downtown',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop'
    },
    {
      id: '2',
      name: 'Sakura Sushi',
      cuisine: 'Japanese',
      location: 'Midtown',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=100&h=100&fit=crop'
    },
    {
      id: '3',
      name: 'Burger Palace',
      cuisine: 'American',
      location: 'Food Court',
      rating: 4.2,
      image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=100&h=100&fit=crop'
    },
    {
      id: '4',
      name: 'Spice Garden',
      cuisine: 'Indian',
      location: 'Little India',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=100&h=100&fit=crop'
    }
  ];

  constructor(private fb: FormBuilder) {
    this.feedbackForm = this.fb.group({
      subject: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      priority: ['medium'],
      stepsToReproduce: [''],
      name: [''],
      email: ['', [Validators.email]],
      anonymous: [false]
    });
  }

  ngOnInit(): void {
    // Initialize component
  }

  // Feedback type selection
  selectFeedbackType(type: FeedbackType): void {
    this.selectedFeedbackType.set(type);
    this.currentStep.set('feedback-form');
    this.resetForm();
  }

  goBackToTypeSelection(): void {
    this.currentStep.set('type-selection');
    this.selectedFeedbackType.set(null);
    this.rating.set(0);
    this.selectedRestaurant.set(null);
    this.attachedFiles.set([]);
    this.resetForm();
  }

  private resetForm(): void {
    this.feedbackForm.reset({
      priority: 'medium',
      anonymous: false
    });
  }

  // Rating functionality
  setRating(rating: number): void {
    this.rating.set(rating);
  }

  setHoverRating(rating: number): void {
    this.hoverRating.set(rating);
  }

  getRatingText(): string {
    const rating = this.hoverRating() || this.rating();
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Rate your experience';
    }
  }

  showRatingSection(): boolean {
    const type = this.selectedFeedbackType();
    return type === 'general' || type === 'restaurant' || type === 'business';
  }

  // Feedback type helpers
  getFeedbackTypeIcon(): string {
    switch (this.selectedFeedbackType()) {
      case 'general': return '💭';
      case 'bug': return '🐛';
      case 'feature': return '💡';
      case 'business': return '🏪';
      case 'restaurant': return '🍽️';
      case 'compliment': return '🌟';
      default: return '💬';
    }
  }

  getFeedbackTypeTitle(): string {
    switch (this.selectedFeedbackType()) {
      case 'general': return 'General Feedback';
      case 'bug': return 'Bug Report';
      case 'feature': return 'Feature Request';
      case 'business': return 'Business Feedback';
      case 'restaurant': return 'Restaurant Experience';
      case 'compliment': return 'Compliment';
      default: return 'Feedback';
    }
  }

  getFeedbackTypeIconById(type: FeedbackType): string {
    switch (type) {
      case 'general': return '💭';
      case 'bug': return '🐛';
      case 'feature': return '💡';
      case 'business': return '🏪';
      case 'restaurant': return '🍽️';
      case 'compliment': return '🌟';
      default: return '💬';
    }
  }

  getFeedbackTypeNameById(type: FeedbackType): string {
    switch (type) {
      case 'general': return 'General Feedback';
      case 'bug': return 'Bug Report';
      case 'feature': return 'Feature Request';
      case 'business': return 'Business Feedback';
      case 'restaurant': return 'Restaurant Experience';
      case 'compliment': return 'Compliment';
      default: return 'Feedback';
    }
  }

  getSubjectPlaceholder(): string {
    switch (this.selectedFeedbackType()) {
      case 'bug': return 'Brief description of the bug...';
      case 'feature': return 'Feature you\'d like to see...';
      case 'business': return 'Business feature feedback...';
      case 'restaurant': return 'Restaurant experience summary...';
      case 'compliment': return 'What you love about Itiyum...';
      default: return 'Brief summary of your feedback...';
    }
  }

  getDescriptionPlaceholder(): string {
    switch (this.selectedFeedbackType()) {
      case 'bug': return 'Please describe the bug in detail. What were you trying to do? What happened instead?';
      case 'feature': return 'Describe the feature you\'d like to see. How would it help you?';
      case 'business': return 'Share your thoughts about our business features and tools...';
      case 'restaurant': return 'Tell us about your restaurant experience. What went well? What could be improved?';
      case 'compliment': return 'We love hearing what you enjoy about Itiyum! Share your positive experience...';
      default: return 'Please provide detailed feedback to help us understand your experience...';
    }
  }

  // Restaurant search functionality
  searchRestaurants(): void {
    const query = this.restaurantQuery.toLowerCase().trim();
    if (!query) {
      this.restaurantResults.set([]);
      return;
    }

    const results = this.mockRestaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(query) ||
      restaurant.cuisine.toLowerCase().includes(query) ||
      restaurant.location.toLowerCase().includes(query)
    );

    this.restaurantResults.set(results);
  }

  selectRestaurant(restaurant: Restaurant): void {
    this.selectedRestaurant.set(restaurant);
    this.restaurantQuery = restaurant.name;
    this.restaurantResults.set([]);
  }

  removeSelectedRestaurant(): void {
    this.selectedRestaurant.set(null);
    this.restaurantQuery = '';
  }

  getStarDisplay(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '⭐'.repeat(fullStars);
    if (hasHalfStar) stars += '⭐';
    return stars;
  }

  // File handling
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  private addFiles(files: File[]): void {
    const validFiles = files.filter(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }

      // Check file type
      const allowedTypes = ['image/', 'application/pdf', 'application/msword',
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'text/plain'];

      if (!allowedTypes.some(type => file.type.startsWith(type))) {
        alert(`File "${file.name}" is not a supported format.`);
        return false;
      }

      return true;
    });

    const currentFiles = this.attachedFiles();
    const newFiles = [...currentFiles, ...validFiles];

    // Limit to 5 files total
    if (newFiles.length > 5) {
      alert('Maximum 5 files allowed.');
      return;
    }

    this.attachedFiles.set(newFiles);
  }

  removeFile(fileToRemove: File): void {
    const currentFiles = this.attachedFiles();
    const updatedFiles = currentFiles.filter(file => file !== fileToRemove);
    this.attachedFiles.set(updatedFiles);
  }

  getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType === 'text/plain') return '📄';
    return '📎';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Form submission
  async submitFeedback(): Promise<void> {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create feedback object
      const feedbackData = {
        type: this.selectedFeedbackType(),
        subject: this.feedbackForm.get('subject')?.value,
        description: this.feedbackForm.get('description')?.value,
        rating: this.rating() > 0 ? this.rating() : undefined,
        restaurant: this.selectedRestaurant(),
        priority: this.feedbackForm.get('priority')?.value,
        stepsToReproduce: this.feedbackForm.get('stepsToReproduce')?.value,
        name: this.feedbackForm.get('name')?.value,
        email: this.feedbackForm.get('email')?.value,
        anonymous: this.feedbackForm.get('anonymous')?.value,
        attachments: this.attachedFiles(),
        submittedAt: new Date()
      };

      console.log('Feedback submitted:', feedbackData);

      // Show success step
      this.currentStep.set('success');
    } catch (error) {
      alert('Sorry, there was an error submitting your feedback. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  submitAnotherFeedback(): void {
    this.currentStep.set('type-selection');
    this.selectedFeedbackType.set(null);
    this.rating.set(0);
    this.selectedRestaurant.set(null);
    this.attachedFiles.set([]);
    this.restaurantQuery = '';
    this.resetForm();
  }

  // Utility functions
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
}
