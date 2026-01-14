import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  view_count: number;
  like_count: number;
  published_at: string;
  created_at: string;
  author_name: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

@Component({
  selector: 'app-blog-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-management.component.html',
  styleUrl: './blog-management.component.scss'
})
export class BlogManagementComponent implements OnInit {
  private http = inject(HttpClient);

  posts = signal<BlogPost[]>([]);
  categories = signal<BlogCategory[]>([]);
  stats = signal<any>(null);

  loading = signal(true);
  saving = signal(false);

  // Filters
  filterStatus = signal('');
  filterCategory = signal('');
  searchQuery = signal('');

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);

  // Editor state
  showEditor = signal(false);
  editingPost = signal<Partial<BlogPost> | null>(null);
  isEditing = signal(false);

  // Form fields
  formTitle = '';
  formSlug = '';
  formExcerpt = '';
  formContent = '';
  formFeaturedImage = '';
  formCategory = '';
  formTags = '';
  formStatus: 'draft' | 'published' = 'draft';
  formIsFeatured = false;

  ngOnInit(): void {
    this.loadPosts();
    this.loadCategories();
    this.loadStats();
  }

  loadPosts(): void {
    this.loading.set(true);

    const params: any = {
      page: this.currentPage(),
      limit: 20
    };

    if (this.filterStatus()) params.status = this.filterStatus();
    if (this.filterCategory()) params.category = this.filterCategory();
    if (this.searchQuery()) params.search = this.searchQuery();

    this.http.get<any>(`${environment.apiUrl}/admin/blog`, { params }).subscribe({
      next: (response) => {
        this.posts.set(response.posts);
        this.totalPages.set(response.pagination.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading posts:', err);
        this.loading.set(false);
      }
    });
  }

  loadCategories(): void {
    this.http.get<any>(`${environment.apiUrl}/admin/blog/categories/list`).subscribe({
      next: (response) => {
        this.categories.set(response.categories);
      }
    });
  }

  loadStats(): void {
    this.http.get<any>(`${environment.apiUrl}/admin/blog/stats/overview`).subscribe({
      next: (response) => {
        this.stats.set(response.stats);
      }
    });
  }

  openNewPostEditor(): void {
    this.resetForm();
    this.isEditing.set(false);
    this.showEditor.set(true);
  }

  openEditPostEditor(post: BlogPost): void {
    this.formTitle = post.title;
    this.formSlug = post.slug;
    this.formExcerpt = post.excerpt || '';
    this.formContent = post.content;
    this.formFeaturedImage = post.featured_image || '';
    this.formCategory = post.category || '';
    this.formTags = (post.tags || []).join(', ');
    this.formStatus = post.status === 'archived' ? 'draft' : post.status;
    this.formIsFeatured = post.is_featured;

    this.editingPost.set(post);
    this.isEditing.set(true);
    this.showEditor.set(true);
  }

  resetForm(): void {
    this.formTitle = '';
    this.formSlug = '';
    this.formExcerpt = '';
    this.formContent = '';
    this.formFeaturedImage = '';
    this.formCategory = '';
    this.formTags = '';
    this.formStatus = 'draft';
    this.formIsFeatured = false;
    this.editingPost.set(null);
  }

  closeEditor(): void {
    this.showEditor.set(false);
    this.resetForm();
  }

  generateSlug(): void {
    this.formSlug = this.formTitle.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  savePost(): void {
    if (!this.formTitle || !this.formContent) {
      alert('Title and content are required');
      return;
    }

    this.saving.set(true);

    const postData = {
      title: this.formTitle,
      slug: this.formSlug || undefined,
      excerpt: this.formExcerpt,
      content: this.formContent,
      featured_image: this.formFeaturedImage,
      category: this.formCategory,
      tags: this.formTags.split(',').map(t => t.trim()).filter(t => t),
      status: this.formStatus,
      is_featured: this.formIsFeatured
    };

    const request = this.isEditing() && this.editingPost()?.id
      ? this.http.put<any>(`${environment.apiUrl}/admin/blog/${this.editingPost()!.id}`, postData)
      : this.http.post<any>(`${environment.apiUrl}/admin/blog`, postData);

    request.subscribe({
      next: (response) => {
        alert(this.isEditing() ? 'Post updated successfully!' : 'Post created successfully!');
        this.closeEditor();
        this.loadPosts();
        this.loadStats();
        this.saving.set(false);
      },
      error: (err) => {
        console.error('Error saving post:', err);
        alert(err.error?.error || 'Failed to save post');
        this.saving.set(false);
      }
    });
  }

  deletePost(post: BlogPost): void {
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
      return;
    }

    this.http.delete<any>(`${environment.apiUrl}/admin/blog/${post.id}`).subscribe({
      next: () => {
        this.loadPosts();
        this.loadStats();
      },
      error: (err) => {
        console.error('Error deleting post:', err);
        alert('Failed to delete post');
      }
    });
  }

  togglePublish(post: BlogPost): void {
    const newStatus = post.status === 'published' ? 'draft' : 'published';

    this.http.put<any>(`${environment.apiUrl}/admin/blog/${post.id}`, {
      status: newStatus
    }).subscribe({
      next: () => {
        this.loadPosts();
        this.loadStats();
      },
      error: (err) => {
        console.error('Error updating post status:', err);
        alert('Failed to update post status');
      }
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadPosts();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadPosts();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPosts();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      published: 'status-published',
      draft: 'status-draft',
      archived: 'status-archived'
    };
    return classes[status] || 'status-draft';
  }
}

