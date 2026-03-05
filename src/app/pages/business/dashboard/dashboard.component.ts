import { Component, ViewChild, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../../core/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  imports: [SidebarComponent, RouterOutlet, CommonModule]
})
export class DashboardComponent {
  @ViewChild('sidebar') sidebar!: SidebarComponent;

  isMobileSidebarOpen = signal(false);

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update(open => !open);
    if (this.sidebar) {
      this.sidebar.toggleMobileSidebar();
    }
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
    if (this.sidebar) {
      this.sidebar.closeMobileSidebar();
    }
  }
}
