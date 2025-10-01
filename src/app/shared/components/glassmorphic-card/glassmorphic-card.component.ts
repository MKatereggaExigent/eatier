import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glassmorphic-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="glassmorphic-card"
      [class]="cardClass"
      [attr.data-variant]="variant"
      [attr.data-size]="size"
    >
      <!-- Card Header -->
      <div class="card-header" *ngIf="title || hasHeaderContent">
        <div class="header-content">
          <div class="title-section" *ngIf="title">
            <span class="card-icon" *ngIf="icon">{{ icon }}</span>
            <h3 class="card-title">{{ title }}</h3>
            <p class="card-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
          </div>
          <div class="header-actions">
            <ng-content select="[slot=header-actions]"></ng-content>
          </div>
        </div>
      </div>

      <!-- Card Body -->
      <div class="card-body">
        <ng-content></ng-content>
      </div>

      <!-- Card Footer -->
      <div class="card-footer" *ngIf="hasFooterContent">
        <ng-content select="[slot=footer]"></ng-content>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="loading">
        <div class="loading-spinner"></div>
        <p class="loading-text">{{ loadingText || 'Loading...' }}</p>
      </div>

      <!-- Glassmorphic Effects -->
      <div class="glass-effects">
        <div class="glass-shine"></div>
        <div class="glass-border"></div>
      </div>
    </div>
  `,
  styleUrls: ['./glassmorphic-card.component.scss']
})
export class GlassmorphicCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() variant: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' = 'default';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() cardClass?: string;
  @Input() loading = false;
  @Input() loadingText?: string;
  @Input() hasHeaderContent = false;
  @Input() hasFooterContent = false;

  ngOnInit() {
    // Auto-detect content slots
    this.hasHeaderContent = !!(this.title || this.subtitle || this.icon);
  }
}
