import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Specialist } from '../../../shared/models/user.model';

interface PortfolioImage {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  eventType: string;
  uploadDate: Date;
  isMain: boolean;
}

interface PortfolioVideo {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  description: string;
  duration: number;
  uploadDate: Date;
}

interface Testimonial {
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './portfolio-management.component.html',
  styleUrls: ['./portfolio-management.component.scss']
})
export class PortfolioManagementComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  specialist = computed(() => this.currentUser() as Specialist);

  // State management
  loading = signal(false);
  activeTab = signal<'images' | 'videos' | 'testimonials' | 'settings'>('images');
  showImageModal = signal(false);
  showVideoModal = signal(false);
  showTestimonialModal = signal(false);
  selectedImage = signal<PortfolioImage | null>(null);
  selectedVideo = signal<PortfolioVideo | null>(null);
  selectedTestimonial = signal<Testimonial | null>(null);

  // Portfolio data
  portfolioImages = signal<PortfolioImage[]>([
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      title: 'Gourmet Pasta Creation',
      description: 'Handmade pasta with truffle sauce for intimate dinner party',
      category: 'Main Course',
      eventType: 'Private Dinner',
      uploadDate: new Date('2024-01-15'),
      isMain: true
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
      title: 'Elegant Appetizer Platter',
      description: 'Artisanal appetizers for corporate event',
      category: 'Appetizers',
      eventType: 'Corporate Event',
      uploadDate: new Date('2024-01-12'),
      isMain: false
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
      title: 'Signature Dessert',
      description: 'Custom wedding cake with seasonal fruits',
      category: 'Desserts',
      eventType: 'Wedding',
      uploadDate: new Date('2024-01-10'),
      isMain: false
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
      title: 'Cooking Class Setup',
      description: 'Interactive cooking class preparation',
      category: 'Teaching',
      eventType: 'Cooking Class',
      uploadDate: new Date('2024-01-08'),
      isMain: false
    }
  ]);

  portfolioVideos = signal<PortfolioVideo[]>([
    {
      id: '1',
      url: 'https://example.com/video1.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
      title: 'Pasta Making Technique',
      description: 'Demonstration of traditional Italian pasta making',
      duration: 180,
      uploadDate: new Date('2024-01-14')
    },
    {
      id: '2',
      url: 'https://example.com/video2.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop',
      title: 'Plating Presentation',
      description: 'Professional plating techniques for fine dining',
      duration: 120,
      uploadDate: new Date('2024-01-11')
    }
  ]);

  testimonials = signal<Testimonial[]>([
    {
      id: '1',
      clientName: 'Sarah Johnson',
      clientAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face',
      rating: 5,
      review: 'Mario created an absolutely incredible dining experience for our anniversary. Every dish was perfectly executed and beautifully presented. His attention to detail and passion for cooking really showed.',
      eventType: 'Private Dinner',
      eventDate: new Date('2024-01-16'),
      isPublic: true,
      isFeatured: true
    },
    {
      id: '2',
      clientName: 'Michael Chen',
      rating: 5,
      review: 'Outstanding catering for our corporate event. Professional, punctual, and the food was exceptional. Our clients were thoroughly impressed.',
      eventType: 'Corporate Event',
      eventDate: new Date('2024-01-14'),
      isPublic: true,
      isFeatured: false
    },
    {
      id: '3',
      clientName: 'Emily Davis',
      clientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
      rating: 4,
      review: 'Great cooking class experience! Mario is a patient teacher and really knows his craft. Learned so much about authentic Italian techniques.',
      eventType: 'Cooking Class',
      eventDate: new Date('2024-01-12'),
      isPublic: true,
      isFeatured: false
    }
  ]);

  // Forms
  imageForm: FormGroup;
  videoForm: FormGroup;
  testimonialForm: FormGroup;
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
      description: ['', [Validators.required, Validators.minLength(10)]],
      category: ['', Validators.required],
      eventType: ['', Validators.required],
      file: [null, Validators.required]
    });

    this.videoForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      file: [null, Validators.required]
    });

    this.testimonialForm = this.fb.group({
      clientName: ['', [Validators.required, Validators.minLength(2)]],
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      review: ['', [Validators.required, Validators.minLength(20)]],
      eventType: ['', Validators.required],
      eventDate: ['', Validators.required],
      isPublic: [true],
      isFeatured: [false]
    });

    this.settingsForm = this.fb.group({
      portfolioTitle: [this.specialist()?.professionalProfile?.title || '', Validators.required],
      portfolioDescription: [this.specialist()?.portfolio?.description || '', Validators.required],
      showContactInfo: [true],
      allowDownloads: [false],
      watermarkImages: [true]
    });
  }

  // Tab management
  setActiveTab(tab: 'images' | 'videos' | 'testimonials' | 'settings'): void {
    this.activeTab.set(tab);
  }

  // Image management
  openImageModal(image?: PortfolioImage): void {
    if (image) {
      this.selectedImage.set(image);
      this.imageForm.patchValue({
        title: image.title,
        description: image.description,
        category: image.category,
        eventType: image.eventType
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

  onImageFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.imageForm.patchValue({ file });
    }
  }

  saveImage(): void {
    if (this.imageForm.valid) {
      const formData = this.imageForm.value;
      const selectedImage = this.selectedImage();
      
      if (selectedImage) {
        // Update existing image
        const images = this.portfolioImages();
        const updatedImages = images.map(img => 
          img.id === selectedImage.id 
            ? { ...img, ...formData, uploadDate: new Date() }
            : img
        );
        this.portfolioImages.set(updatedImages);
      } else {
        // Add new image
        const newImage: PortfolioImage = {
          id: Date.now().toString(),
          url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop', // Placeholder
          title: formData.title,
          description: formData.description,
          category: formData.category,
          eventType: formData.eventType,
          uploadDate: new Date(),
          isMain: this.portfolioImages().length === 0
        };
        this.portfolioImages.set([...this.portfolioImages(), newImage]);
      }
      
      this.closeImageModal();
    }
  }

  deleteImage(imageId: string): void {
    if (confirm('Are you sure you want to delete this image?')) {
      const images = this.portfolioImages().filter(img => img.id !== imageId);
      this.portfolioImages.set(images);
    }
  }

  setMainImage(imageId: string): void {
    const images = this.portfolioImages().map(img => ({
      ...img,
      isMain: img.id === imageId
    }));
    this.portfolioImages.set(images);
  }

  // Video management
  openVideoModal(video?: PortfolioVideo): void {
    if (video) {
      this.selectedVideo.set(video);
      this.videoForm.patchValue({
        title: video.title,
        description: video.description
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

  onVideoFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.videoForm.patchValue({ file });
    }
  }

  saveVideo(): void {
    if (this.videoForm.valid) {
      const formData = this.videoForm.value;
      const selectedVideo = this.selectedVideo();
      
      if (selectedVideo) {
        // Update existing video
        const videos = this.portfolioVideos();
        const updatedVideos = videos.map(video => 
          video.id === selectedVideo.id 
            ? { ...video, ...formData, uploadDate: new Date() }
            : video
        );
        this.portfolioVideos.set(updatedVideos);
      } else {
        // Add new video
        const newVideo: PortfolioVideo = {
          id: Date.now().toString(),
          url: 'https://example.com/video.mp4', // Placeholder
          thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
          title: formData.title,
          description: formData.description,
          duration: 120, // Placeholder
          uploadDate: new Date()
        };
        this.portfolioVideos.set([...this.portfolioVideos(), newVideo]);
      }
      
      this.closeVideoModal();
    }
  }

  deleteVideo(videoId: string): void {
    if (confirm('Are you sure you want to delete this video?')) {
      const videos = this.portfolioVideos().filter(video => video.id !== videoId);
      this.portfolioVideos.set(videos);
    }
  }

  // Testimonial management
  openTestimonialModal(testimonial?: Testimonial): void {
    if (testimonial) {
      this.selectedTestimonial.set(testimonial);
      this.testimonialForm.patchValue({
        clientName: testimonial.clientName,
        rating: testimonial.rating,
        review: testimonial.review,
        eventType: testimonial.eventType,
        eventDate: testimonial.eventDate.toISOString().split('T')[0],
        isPublic: testimonial.isPublic,
        isFeatured: testimonial.isFeatured
      });
    } else {
      this.selectedTestimonial.set(null);
      this.testimonialForm.reset({ rating: 5, isPublic: true, isFeatured: false });
    }
    this.showTestimonialModal.set(true);
  }

  closeTestimonialModal(): void {
    this.showTestimonialModal.set(false);
    this.selectedTestimonial.set(null);
    this.testimonialForm.reset();
  }

  saveTestimonial(): void {
    if (this.testimonialForm.valid) {
      const formData = this.testimonialForm.value;
      const selectedTestimonial = this.selectedTestimonial();
      
      if (selectedTestimonial) {
        // Update existing testimonial
        const testimonials = this.testimonials();
        const updatedTestimonials = testimonials.map(testimonial => 
          testimonial.id === selectedTestimonial.id 
            ? { ...testimonial, ...formData, eventDate: new Date(formData.eventDate) }
            : testimonial
        );
        this.testimonials.set(updatedTestimonials);
      } else {
        // Add new testimonial
        const newTestimonial: Testimonial = {
          id: Date.now().toString(),
          clientName: formData.clientName,
          rating: formData.rating,
          review: formData.review,
          eventType: formData.eventType,
          eventDate: new Date(formData.eventDate),
          isPublic: formData.isPublic,
          isFeatured: formData.isFeatured
        };
        this.testimonials.set([...this.testimonials(), newTestimonial]);
      }
      
      this.closeTestimonialModal();
    }
  }

  deleteTestimonial(testimonialId: string): void {
    if (confirm('Are you sure you want to delete this testimonial?')) {
      const testimonials = this.testimonials().filter(t => t.id !== testimonialId);
      this.testimonials.set(testimonials);
    }
  }

  toggleTestimonialFeatured(testimonialId: string): void {
    const testimonials = this.testimonials().map(t => 
      t.id === testimonialId ? { ...t, isFeatured: !t.isFeatured } : t
    );
    this.testimonials.set(testimonials);
  }

  toggleTestimonialPublic(testimonialId: string): void {
    const testimonials = this.testimonials().map(t => 
      t.id === testimonialId ? { ...t, isPublic: !t.isPublic } : t
    );
    this.testimonials.set(testimonials);
  }

  // Settings management
  saveSettings(): void {
    if (this.settingsForm.valid) {
      console.log('Saving portfolio settings:', this.settingsForm.value);
      // TODO: Implement settings save
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
