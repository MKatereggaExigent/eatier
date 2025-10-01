import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AdManagementService } from '../../../core/services/ad-management.service';
import { 
  ContactInquiry, 
  InquiryStatus, 
  InquiryType,
  InquiryPriority,
  AutoResponse
} from '../../../core/models/ad-management.models';

@Component({
  selector: 'app-contact-inquiries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-inquiries.component.html',
  styleUrls: ['./contact-inquiries.component.scss']
})
export class ContactInquiriesComponent implements OnInit {
  private authService = inject(AuthService);
  private adService = inject(AdManagementService);

  // Signals
  currentUser = this.authService.currentUser;
  inquiries = signal<ContactInquiry[]>([]);
  isLoading = signal(false);
  selectedInquiry = signal<ContactInquiry | null>(null);
  showInquiryDetails = signal(false);
  filterStatus = signal<InquiryStatus | 'all'>('all');
  filterType = signal<InquiryType | 'all'>('all');
  searchQuery = signal('');
  replyMessage = signal('');
  isReplying = signal(false);

  // Computed properties
  filteredInquiries = computed(() => {
    let filtered = this.inquiries();
    
    // Filter by status
    const status = this.filterStatus();
    if (status !== 'all') {
      filtered = filtered.filter(inquiry => inquiry.status === status);
    }
    
    // Filter by type
    const type = this.filterType();
    if (type !== 'all') {
      filtered = filtered.filter(inquiry => inquiry.inquiryType === type);
    }
    
    // Search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(inquiry => 
        inquiry.inquirerName.toLowerCase().includes(query) ||
        inquiry.inquirerEmail.toLowerCase().includes(query) ||
        inquiry.subject.toLowerCase().includes(query) ||
        inquiry.message.toLowerCase().includes(query)
      );
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  inquiryStats = computed(() => {
    const inquiries = this.inquiries();
    return {
      total: inquiries.length,
      pending: inquiries.filter(i => i.status === 'pending').length,
      inProgress: inquiries.filter(i => i.status === 'in_progress').length,
      resolved: inquiries.filter(i => i.status === 'resolved').length,
      closed: inquiries.filter(i => i.status === 'closed').length
    };
  });

  priorityInquiries = computed(() => {
    return this.inquiries()
      .filter(inquiry => inquiry.priority === 'high' && inquiry.status !== 'resolved' && inquiry.status !== 'closed')
      .slice(0, 5);
  });

  recentInquiries = computed(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return this.inquiries()
      .filter(inquiry => new Date(inquiry.createdAt) >= oneDayAgo)
      .length;
  });

  ngOnInit(): void {
    this.loadInquiries();
  }

  async loadInquiries(): Promise<void> {
    const userId = this.currentUser()?.id;
    if (!userId) return;

    this.isLoading.set(true);
    try {
      const inquiriesData = await this.adService.getContactInquiries(userId);
      this.inquiries.set(inquiriesData);
    } catch (error) {
      console.error('Error loading inquiries:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Inquiry management
  selectInquiry(inquiry: ContactInquiry): void {
    this.selectedInquiry.set(inquiry);
    this.showInquiryDetails.set(true);
    
    // Mark as read if not already
    if (inquiry.status === 'pending') {
      this.updateInquiryStatus(inquiry.id, 'in_progress');
    }
  }

  closeInquiryDetails(): void {
    this.showInquiryDetails.set(false);
    this.selectedInquiry.set(null);
    this.replyMessage.set('');
  }

  async updateInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<void> {
    try {
      await this.adService.updateInquiryStatus(inquiryId, status);
      
      // Update local state
      this.inquiries.update(inquiries => 
        inquiries.map(inquiry => 
          inquiry.id === inquiryId 
            ? { ...inquiry, status, updatedAt: new Date() }
            : inquiry
        )
      );

      // Update selected inquiry if it's the one being updated
      const selected = this.selectedInquiry();
      if (selected && selected.id === inquiryId) {
        this.selectedInquiry.set({ ...selected, status, updatedAt: new Date() });
      }
    } catch (error) {
      console.error('Error updating inquiry status:', error);
    }
  }

  async updateInquiryPriority(inquiryId: string, priority: InquiryPriority): Promise<void> {
    try {
      await this.adService.updateInquiryPriority(inquiryId, priority);
      
      // Update local state
      this.inquiries.update(inquiries => 
        inquiries.map(inquiry => 
          inquiry.id === inquiryId 
            ? { ...inquiry, priority, updatedAt: new Date() }
            : inquiry
        )
      );

      // Update selected inquiry if it's the one being updated
      const selected = this.selectedInquiry();
      if (selected && selected.id === inquiryId) {
        this.selectedInquiry.set({ ...selected, priority, updatedAt: new Date() });
      }
    } catch (error) {
      console.error('Error updating inquiry priority:', error);
    }
  }

  async replyToInquiry(): Promise<void> {
    const inquiry = this.selectedInquiry();
    const message = this.replyMessage().trim();
    
    if (!inquiry || !message) return;

    this.isReplying.set(true);
    try {
      await this.adService.replyToInquiry(inquiry.id, message);
      
      // Update inquiry status to resolved
      await this.updateInquiryStatus(inquiry.id, 'resolved');
      
      // Clear reply message
      this.replyMessage.set('');
      
      // Show success message
      alert('Reply sent successfully!');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Error sending reply. Please try again.');
    } finally {
      this.isReplying.set(false);
    }
  }

  // Filter methods
  setStatusFilter(status: InquiryStatus | 'all'): void {
    this.filterStatus.set(status);
  }

  setTypeFilter(type: InquiryType | 'all'): void {
    this.filterType.set(type);
  }

  updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  clearFilters(): void {
    this.filterStatus.set('all');
    this.filterType.set('all');
    this.searchQuery.set('');
  }

  // Utility methods
  getStatusClass(status: InquiryStatus): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in_progress': return 'status-progress';
      case 'resolved': return 'status-resolved';
      case 'closed': return 'status-closed';
      default: return 'status-pending';
    }
  }

  getStatusIcon(status: InquiryStatus): string {
    switch (status) {
      case 'pending': return '🔔';
      case 'in_progress': return '⏳';
      case 'resolved': return '✅';
      case 'closed': return '🔒';
      default: return '❓';
    }
  }

  getPriorityClass(priority: InquiryPriority): string {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  }

  getPriorityIcon(priority: InquiryPriority): string {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '🟡';
    }
  }

  getTypeIcon(type: InquiryType): string {
    switch (type) {
      case 'booking': return '📅';
      case 'quote': return '💰';
      case 'general': return '💬';
      default: return '❓';
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return this.formatDate(date);
  }

  // Auto-response management
  async sendAutoResponse(inquiryId: string): Promise<void> {
    try {
      await this.adService.sendAutoResponse(inquiryId);
      alert('Auto-response sent successfully!');
    } catch (error) {
      console.error('Error sending auto-response:', error);
      alert('Error sending auto-response.');
    }
  }

  // Export functionality
  exportInquiries(): void {
    const inquiries = this.filteredInquiries();
    const csvContent = this.convertToCSV(inquiries);
    this.downloadCSV(csvContent, 'contact-inquiries.csv');
  }

  private convertToCSV(inquiries: ContactInquiry[]): string {
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Type', 'Subject', 'Status', 'Priority'];
    const rows = inquiries.map(inquiry => [
      this.formatDate(inquiry.createdAt),
      inquiry.inquirerName,
      inquiry.inquirerEmail,
      inquiry.inquirerPhone || '',
      inquiry.inquiryType,
      inquiry.subject,
      inquiry.status,
      inquiry.priority
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
