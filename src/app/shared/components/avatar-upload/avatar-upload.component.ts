import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-avatar-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-upload.component.html',
  styleUrls: ['./avatar-upload.component.scss']
})
export class AvatarUploadComponent {
  @Output() avatarUploaded = new EventEmitter<string>();
  @Output() closeModal = new EventEmitter<void>();

  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  uploading = signal(false);
  error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.error.set('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.error.set('File size must be less than 5MB');
        return;
      }

      this.selectedFile.set(file);
      this.error.set(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Upload avatar to server
   */
  uploadAvatar(): void {
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Please select a file first');
      return;
    }

    this.uploading.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('avatar', file);

    this.http.post<any>(`${environment.apiUrl}/users/avatar`, formData).subscribe({
      next: (response) => {
        this.uploading.set(false);
        this.avatarUploaded.emit(response.avatarUrl);
        this.close();
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.error?.error || 'Failed to upload avatar');
      }
    });
  }

  /**
   * Remove uploaded avatar
   */
  removeAvatar(): void {
    this.uploading.set(true);
    this.error.set(null);

    this.http.delete<any>(`${environment.apiUrl}/users/avatar`).subscribe({
      next: () => {
        this.uploading.set(false);
        this.avatarUploaded.emit(''); // Empty string signals removal
        this.close();
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.error?.error || 'Failed to remove avatar');
      }
    });
  }

  /**
   * Close modal
   */
  close(): void {
    this.closeModal.emit();
  }

  /**
   * Trigger file input click
   */
  triggerFileInput(): void {
    const fileInput = document.getElementById('avatarFileInput') as HTMLInputElement;
    fileInput?.click();
  }
}
