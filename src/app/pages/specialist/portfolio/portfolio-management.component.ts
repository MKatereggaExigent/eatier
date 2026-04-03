import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Camera, Image, Video, Star, Settings, Edit, Trash2, Play, Eye, Lock, Plus, X, MessageCircle } from 'lucide-angular';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SpecialistService, PortfolioImage, PortfolioVideo, PortfolioTestimonial, PortfolioSettings } from '../../../core/services/specialist.service';
import { Specialist } from '../../../shared/models/user.model';

// Local interfaces for component display (mapped from API)
interface DisplayImage {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  eventType: string;
  uploadDate: Date;
  isMain: boolean;
}

interface DisplayVideo {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  description: string;
  duration: number;
  uploadDate: Date;
}

interface DisplayTestimonial {
  id: string;
  clientName: string;
  clientAvatar?: string;
  rating: number;
  review: string;
  eventType: string;
  eventDate: Date;
  isPublic: boolean;
  isFeatured: boolean;
}

@Component({
  selector: 'app-portfolio-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './portfolio-management.component.html',
  styleUrls: ['./portfolio-management.component.scss']
})
export class PortfolioManagementComponent implements OnInit {
  // Lucide Icons
  readonly Camera = Camera;
  readonly Image = Image;
  readonly Video = Video;
  readonly Star = Star;
  readonly Settings = Settings;
  readonly Edit = Edit;
  readonly Trash2 = Trash2;
  readonly Play = Play;
  readonly Eye = Eye;
  readonly Lock = Lock;
  readonly Plus = Plus;
  readonly X = X;
  readonly MessageCircle = MessageCircle;
  private authService = inject(AuthService);
  private specialistService = inject(SpecialistService);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  specialist = computed(() => this.currentUser() as Specialist);

  // State management
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'images' | 'videos' | 'testimonials' | 'settings'>('images');
  showImageModal = signal(false);
  showVideoModal = signal(false);
  selectedImage = signal<DisplayImage | null>(null);
  selectedVideo = signal<DisplayVideo | null>(null);

  // Portfolio data - now loaded from API
  portfolioImages = signal<DisplayImage[]>([]);
  portfolioVideos = signal<DisplayVideo[]>([]);
  testimonials = signal<DisplayTestimonial[]>([]);
  portfolioSettings = signal<PortfolioSettings | null>(null);

  // Forms
  imageForm: FormGroup;
  videoForm: FormGroup;
  settingsForm: FormGroup;

  // Computed properties
  mainImage = computed(() => 
    this.portfolioImages().find(img => img.isMain) || this.portfolioImages()[0]
  );

  imageCategories = computed(() => {
    const categories = this.portfolioImages().map(img => img.category);
    return [...new Set(categories)];
  });

  featuredTestimonials = computed(() => 
    this.testimonials().filter(t => t.isFeatured)
  );

  publicTestimonials = computed(() => 
    this.testimonials().filter(t => t.isPublic)
  );

  constructor() {
    this.imageForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: [''],
      eventType: [''],
      url: ['', Validators.required]
    });

    this.videoForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      url: ['', Validators.required],
      thumbnailUrl: ['']
    });

    this.settingsForm = this.fb.group({
      portfolioTitle: [''],
      portfolioDescription: [''],
      showContactInfo: [true],
      allowDownloads: [false],
      watermarkImages: [true],
      theme: ['default']
    });
  }

  ngOnInit(): void {
    this.loadPortfolioData();
  }

  /**
   * Load all portfolio data from the API
   */
  loadPortfolioData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load images
    this.specialistService.getPortfolioImages().subscribe({
      next: (response) => {
        const images = response.images.map(img => this.mapApiImageToDisplay(img));
        this.portfolioImages.set(images);
      },
      error: (err) => console.error('Error loading images:', err)
    });

    // Load videos
    this.specialistService.getPortfolioVideos().subscribe({
      next: (response) => {
        const videos = response.videos.map(vid => this.mapApiVideoToDisplay(vid));
        this.portfolioVideos.set(videos);
      },
      error: (err) => console.error('Error loading videos:', err)
    });

    // Load testimonials
    this.specialistService.getTestimonials().subscribe({
      next: (response) => {
        const testimonials = response.testimonials.map(t => this.mapApiTestimonialToDisplay(t));
        this.testimonials.set(testimonials);
      },
      error: (err) => console.error('Error loading testimonials:', err)
    });

    // Load settings
    this.specialistService.getPortfolioSettings().subscribe({
      next: (response) => {
        this.portfolioSettings.set(response.settings);
        this.settingsForm.patchValue({
          portfolioTitle: response.settings.portfolio_title || '',
          portfolioDescription: response.settings.portfolio_description || '',
          showContactInfo: response.settings.show_contact_info,
          allowDownloads: response.settings.allow_downloads,
          watermarkImages: response.settings.watermark_images,
          theme: response.settings.theme
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.loading.set(false);
      }
    });
  }

  // Mapping functions
  private mapApiImageToDisplay(img: PortfolioImage): DisplayImage {
    return {
      id: img.id,
      url: img.url,
      title: img.title,
      description: img.description || '',
      category: img.category || '',
      eventType: img.event_type || '',
      uploadDate: new Date(img.created_at),
      isMain: img.is_main
    };
  }

  private mapApiVideoToDisplay(vid: PortfolioVideo): DisplayVideo {
    return {
      id: vid.id,
      url: vid.url,
      thumbnail: vid.thumbnail_url || '',
      title: vid.title,
      description: vid.description || '',
      duration: vid.duration_seconds,
      uploadDate: new Date(vid.created_at)
    };
  }

  private mapApiTestimonialToDisplay(t: PortfolioTestimonial): DisplayTestimonial {
    return {
      id: t.id,
      clientName: t.client_name,
      clientAvatar: t.client_avatar_url,
      rating: t.rating,
      review: t.review,
      eventType: t.event_type || '',
      eventDate: t.event_date ? new Date(t.event_date) : new Date(),
      isPublic: t.is_public,
      isFeatured: t.is_featured
    };
  }

  // Tab management
  setActiveTab(tab: 'images' | 'videos' | 'testimonials' | 'settings'): void {
    this.activeTab.set(tab);
  }

  // Image management
  openImageModal(image?: DisplayImage): void {
    if (image) {
      this.selectedImage.set(image);
      this.imageForm.patchValue({
        title: image.title,
        description: image.description,
        category: image.category,
        eventType: image.eventType,
        url: image.url
      });
    } else {
      this.selectedImage.set(null);
      this.imageForm.reset();
    }
    this.showImageModal.set(true);
  }

  closeImageModal(): void {
    this.showImageModal.set(false);
    this.selectedImage.set(null);
    this.imageForm.reset();
  }

  saveImage(): void {
    if (this.imageForm.valid) {
      this.saving.set(true);
      const formData = this.imageForm.value;
      const selectedImage = this.selectedImage();

      if (selectedImage) {
        // Update existing image
        this.specialistService.updatePortfolioImage(selectedImage.id, {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          eventType: formData.eventType
        }).subscribe({
          next: (response) => {
            const images = this.portfolioImages().map(img =>
              img.id === selectedImage.id ? this.mapApiImageToDisplay(response.image) : img
            );
            this.portfolioImages.set(images);
            this.saving.set(false);
            this.closeImageModal();
          },
          error: (err) => {
            console.error('Error updating image:', err);
            this.saving.set(false);
          }
        });
      } else {
        // Add new image
        this.specialistService.addPortfolioImage({
          url: formData.url,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          eventType: formData.eventType,
          isMain: this.portfolioImages().length === 0
        }).subscribe({
          next: (response) => {
            const newImage = this.mapApiImageToDisplay(response.image);
            this.portfolioImages.set([...this.portfolioImages(), newImage]);
            this.saving.set(false);
            this.closeImageModal();
          },
          error: (err) => {
            console.error('Error adding image:', err);
            this.saving.set(false);
          }
        });
      }
    }
  }

  deleteImage(imageId: string): void {
    if (confirm('Are you sure you want to delete this image?')) {
      this.specialistService.deletePortfolioImage(imageId).subscribe({
        next: () => {
          const images = this.portfolioImages().filter(img => img.id !== imageId);
          this.portfolioImages.set(images);
        },
        error: (err) => console.error('Error deleting image:', err)
      });
    }
  }

  setMainImage(imageId: string): void {
    this.specialistService.updatePortfolioImage(imageId, { isMain: true }).subscribe({
      next: () => {
        const images = this.portfolioImages().map(img => ({
          ...img,
          isMain: img.id === imageId
        }));
        this.portfolioImages.set(images);
      },
      error: (err) => console.error('Error setting main image:', err)
    });
  }

  // Video management
  openVideoModal(video?: DisplayVideo): void {
    if (video) {
      this.selectedVideo.set(video);
      this.videoForm.patchValue({
        title: video.title,
        description: video.description,
        url: video.url,
        thumbnailUrl: video.thumbnail
      });
    } else {
      this.selectedVideo.set(null);
      this.videoForm.reset();
    }
    this.showVideoModal.set(true);
  }

  closeVideoModal(): void {
    this.showVideoModal.set(false);
    this.selectedVideo.set(null);
    this.videoForm.reset();
  }

  saveVideo(): void {
    if (this.videoForm.valid) {
      this.saving.set(true);
      const formData = this.videoForm.value;
      const selectedVideo = this.selectedVideo();

      if (selectedVideo) {
        // Update existing video
        this.specialistService.updatePortfolioVideo(selectedVideo.id, {
          title: formData.title,
          description: formData.description,
          thumbnailUrl: formData.thumbnailUrl
        }).subscribe({
          next: (response) => {
            const videos = this.portfolioVideos().map(video =>
              video.id === selectedVideo.id ? this.mapApiVideoToDisplay(response.video) : video
            );
            this.portfolioVideos.set(videos);
            this.saving.set(false);
            this.closeVideoModal();
          },
          error: (err) => {
            console.error('Error updating video:', err);
            this.saving.set(false);
          }
        });
      } else {
        // Add new video
        this.specialistService.addPortfolioVideo({
          url: formData.url,
          title: formData.title,
          description: formData.description,
          thumbnailUrl: formData.thumbnailUrl
        }).subscribe({
          next: (response) => {
            const newVideo = this.mapApiVideoToDisplay(response.video);
            this.portfolioVideos.set([...this.portfolioVideos(), newVideo]);
            this.saving.set(false);
            this.closeVideoModal();
          },
          error: (err) => {
            console.error('Error adding video:', err);
            this.saving.set(false);
          }
        });
      }
    }
  }

  deleteVideo(videoId: string): void {
    if (confirm('Are you sure you want to delete this video?')) {
      this.specialistService.deletePortfolioVideo(videoId).subscribe({
        next: () => {
          const videos = this.portfolioVideos().filter(video => video.id !== videoId);
          this.portfolioVideos.set(videos);
        },
        error: (err) => console.error('Error deleting video:', err)
      });
    }
  }

  // Testimonial moderation (specialists can only toggle visibility, not create/edit content)
  toggleTestimonialFeatured(testimonialId: string): void {
    const testimonial = this.testimonials().find(t => t.id === testimonialId);
    if (testimonial) {
      this.specialistService.updateTestimonial(testimonialId, { isFeatured: !testimonial.isFeatured }).subscribe({
        next: () => {
          const testimonials = this.testimonials().map(t =>
            t.id === testimonialId ? { ...t, isFeatured: !t.isFeatured } : t
          );
          this.testimonials.set(testimonials);
        },
        error: (err) => console.error('Error toggling featured:', err)
      });
    }
  }

  toggleTestimonialPublic(testimonialId: string): void {
    const testimonial = this.testimonials().find(t => t.id === testimonialId);
    if (testimonial) {
      this.specialistService.updateTestimonial(testimonialId, { isPublic: !testimonial.isPublic }).subscribe({
        next: () => {
          const testimonials = this.testimonials().map(t =>
            t.id === testimonialId ? { ...t, isPublic: !t.isPublic } : t
          );
          this.testimonials.set(testimonials);
        },
        error: (err) => console.error('Error toggling public:', err)
      });
    }
  }

  // Settings management
  saveSettings(): void {
    if (this.settingsForm.valid) {
      this.saving.set(true);
      const formData = this.settingsForm.value;

      this.specialistService.updatePortfolioSettings({
        portfolioTitle: formData.portfolioTitle,
        portfolioDescription: formData.portfolioDescription,
        showContactInfo: formData.showContactInfo,
        allowDownloads: formData.allowDownloads,
        watermarkImages: formData.watermarkImages,
        theme: formData.theme
      }).subscribe({
        next: (response) => {
          this.portfolioSettings.set(response.settings);
          this.saving.set(false);
          alert('Settings saved successfully!');
        },
        error: (err) => {
          console.error('Error saving settings:', err);
          this.saving.set(false);
        }
      });
    }
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }
}
