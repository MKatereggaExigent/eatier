import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SpecialistService, SpecialistServiceItem, ServiceTypeOption } from '../../../core/services/specialist.service';
import { Specialist } from '../../../shared/models/user.model';

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './services-management.component.html',
  styleUrls: ['./services-management.component.scss']
})
export class ServicesManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private specialistService = inject(SpecialistService);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  specialist = computed(() => this.currentUser() as Specialist);

  // State management
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Services data
  services = signal<SpecialistServiceItem[]>([]);

  // Modal state
  showServiceModal = signal(false);
  editingService = signal<SpecialistServiceItem | null>(null);

  // Service types from backend
  serviceTypes: ServiceTypeOption[] = [
    { value: 'private_chef', label: 'Private Chef' },
    { value: 'catering', label: 'Catering' },
    { value: 'cooking_class', label: 'Cooking Class' },
    { value: 'event_catering', label: 'Event Catering' },
    { value: 'meal_prep', label: 'Meal Prep' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'wine_pairing', label: 'Wine Pairing' },
    { value: 'baking', label: 'Baking' },
    { value: 'bbq', label: 'BBQ/Grilling' },
    { value: 'dietary', label: 'Dietary Specialist' }
  ];

  // Service form
  serviceForm: FormGroup;

  // Pagination
  currentPage = signal(1);
  pageSize = signal(6);
  pageSizeOptions = [6, 12, 24];

  // Computed
  activeServices = computed(() => this.services().filter(s => s.isActive));
  inactiveServices = computed(() => this.services().filter(s => !s.isActive));
  totalServices = computed(() => this.services().length);

  // Pagination computed
  totalPages = computed(() => Math.ceil(this.services().length / this.pageSize()));
  paginatedServices = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.services().slice(start, end);
  });
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push(-1); // ellipsis
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) pages.push(-1); // ellipsis
      pages.push(total);
    }
    return pages;
  });
  showingFrom = computed(() => Math.min((this.currentPage() - 1) * this.pageSize() + 1, this.totalServices()));
  showingTo = computed(() => Math.min(this.currentPage() * this.pageSize(), this.totalServices()));

  constructor() {
    this.serviceForm = this.fb.group({
      serviceName: ['', [Validators.required, Validators.minLength(3)]],
      serviceType: ['', Validators.required],
      description: [''],
      basePrice: [0, [Validators.required, Validators.min(0)]],
      pricePerPerson: [0, Validators.min(0)],
      minGuests: [1, [Validators.required, Validators.min(1)]],
      maxGuests: [null],
      durationHours: [null, Validators.min(0.5)]
    });
  }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading.set(true);
    this.error.set(null);

    this.specialistService.getServices().subscribe({
      next: (data) => {
        this.services.set(data.services);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading services:', err);
        this.error.set('Failed to load services');
        this.loading.set(false);
      }
    });
  }

  openAddModal(): void {
    this.editingService.set(null);
    this.serviceForm.reset({
      serviceName: '',
      serviceType: '',
      description: '',
      basePrice: 0,
      pricePerPerson: 0,
      minGuests: 1,
      maxGuests: null,
      durationHours: null
    });
    this.showServiceModal.set(true);
  }

  openEditModal(service: SpecialistServiceItem): void {
    this.editingService.set(service);
    this.serviceForm.patchValue({
      serviceName: service.serviceName,
      serviceType: service.serviceType,
      description: service.description || '',
      basePrice: service.basePrice,
      pricePerPerson: service.pricePerPerson || 0,
      minGuests: service.minGuests || 1,
      maxGuests: service.maxGuests || null,
      durationHours: service.durationHours || null
    });
    this.showServiceModal.set(true);
  }

  closeModal(): void {
    this.showServiceModal.set(false);
    this.editingService.set(null);
    this.serviceForm.reset();
  }

  saveService(): void {
    if (this.serviceForm.invalid) return;

    this.saving.set(true);
    this.error.set(null);

    const formData = this.serviceForm.value;
    const editing = this.editingService();

    if (editing) {
      this.specialistService.updateService(editing.id, formData).subscribe({
        next: (data) => {
          this.updateServiceInList(data.service);
          this.successMessage.set('Service updated successfully');
          this.closeModal();
          this.saving.set(false);
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to update service');
          this.saving.set(false);
        }
      });
    } else {
      this.specialistService.createService(formData).subscribe({
        next: (data) => {
          this.services.update(s => [...s, data.service]);
          this.successMessage.set('Service created successfully');
          this.closeModal();
          this.saving.set(false);
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          console.error('Create service error:', err);
          const errorMsg = err.error?.details || err.error?.message || 'Failed to create service';
          this.error.set(errorMsg);
          this.saving.set(false);
        }
      });
    }
  }

  private updateServiceInList(updated: SpecialistServiceItem): void {
    this.services.update(list =>
      list.map(s => s.id === updated.id ? updated : s)
    );
  }

  toggleServiceStatus(service: SpecialistServiceItem): void {
    this.specialistService.updateService(service.id, { isActive: !service.isActive }).subscribe({
      next: (data) => {
        this.updateServiceInList(data.service);
        this.successMessage.set(`Service ${data.service.isActive ? 'activated' : 'deactivated'}`);
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        console.error('Error toggling service status:', err);
        this.error.set('Failed to update service status');
      }
    });
  }

  deleteService(service: SpecialistServiceItem): void {
    if (!confirm(`Are you sure you want to delete "${service.serviceName}"?`)) return;

    this.specialistService.deleteService(service.id).subscribe({
      next: () => {
        this.services.update(list => list.filter(s => s.id !== service.id));
        this.successMessage.set('Service deleted successfully');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        console.error('Error deleting service:', err);
        this.error.set('Failed to delete service');
      }
    });
  }

  getServiceTypeLabel(value: string): string {
    const type = this.serviceTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  formatPrice(price: number): string {
    return `R${price.toLocaleString('en-ZA')}`;
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.scrollToTop();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.scrollToTop();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.scrollToTop();
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

