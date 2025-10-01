import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glassmorphic-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="buttonClass"
      [attr.data-variant]="variant"
      [attr.data-size]="size"
      (click)="handleClick($event)"
      class="glassmorphic-btn"
    >
      <!-- Loading State -->
      <div class="btn-loading" *ngIf="loading">
        <div class="loading-spinner"></div>
      </div>

      <!-- Button Content -->
      <div class="btn-content" [class.loading]="loading">
        <!-- Icon -->
        <span class="btn-icon" *ngIf="icon && iconPosition === 'left'">
          {{ icon }}
        </span>

        <!-- Text Content -->
        <span class="btn-text" *ngIf="!iconOnly">
          <ng-content></ng-content>
        </span>

        <!-- Right Icon -->
        <span class="btn-icon" *ngIf="icon && iconPosition === 'right'">
          {{ icon }}
        </span>
      </div>

      <!-- Glassmorphic Effects -->
      <div class="btn-effects">
        <div class="btn-shine"></div>
        <div class="btn-ripple" #ripple></div>
      </div>
    </button>
  `,
  styleUrls: ['./glassmorphic-button.component.scss']
})
export class GlassmorphicButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'error' | 'info' = 'primary';
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() iconOnly = false;
  @Input() loading = false;
  @Input() disabled = false;
  @Input() buttonClass?: string;
  @Input() fullWidth = false;

  @Output() clicked = new EventEmitter<Event>();

  handleClick(event: Event) {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
      this.createRippleEffect(event);
    }
  }

  private createRippleEffect(event: Event) {
    const button = event.target as HTMLElement;
    const ripple = button.querySelector('.btn-ripple') as HTMLElement;
    
    if (ripple) {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = (event as MouseEvent).clientX - rect.left - size / 2;
      const y = (event as MouseEvent).clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('animate');
      
      setTimeout(() => {
        ripple.classList.remove('animate');
      }, 600);
    }
  }
}
