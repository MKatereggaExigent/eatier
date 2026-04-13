import { Directive, HostListener, Output, EventEmitter, ElementRef, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appAvatarContextMenu]',
  standalone: true
})
export class AvatarContextMenuDirective {
  @Output() uploadAvatar = new EventEmitter<void>();
  @Output() removeAvatar = new EventEmitter<void>();

  private contextMenu: HTMLElement | null = null;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Remove existing context menu
    this.removeContextMenu();

    // Create context menu
    this.contextMenu = this.renderer.createElement('div');
    this.renderer.addClass(this.contextMenu, 'avatar-context-menu');
    this.renderer.setStyle(this.contextMenu, 'position', 'fixed');
    this.renderer.setStyle(this.contextMenu, 'left', `${event.clientX}px`);
    this.renderer.setStyle(this.contextMenu, 'top', `${event.clientY}px`);
    this.renderer.setStyle(this.contextMenu, 'z-index', '10001');

    // Upload option
    const uploadOption = this.renderer.createElement('div');
    this.renderer.addClass(uploadOption, 'context-menu-item');
    const uploadText = this.renderer.createText('📷 Upload Photo');
    this.renderer.appendChild(uploadOption, uploadText);
    this.renderer.listen(uploadOption, 'click', () => {
      this.uploadAvatar.emit();
      this.removeContextMenu();
    });
    this.renderer.appendChild(this.contextMenu, uploadOption);

    // Remove option
    const removeOption = this.renderer.createElement('div');
    this.renderer.addClass(removeOption, 'context-menu-item');
    const removeText = this.renderer.createText('🗑️ Remove Photo');
    this.renderer.appendChild(removeOption, removeText);
    this.renderer.listen(removeOption, 'click', () => {
      this.removeAvatar.emit();
      this.removeContextMenu();
    });
    this.renderer.appendChild(this.contextMenu, removeOption);

    // Add to body
    this.renderer.appendChild(document.body, this.contextMenu);

    // Close menu when clicking outside
    setTimeout(() => {
      this.renderer.listen('document', 'click', () => this.removeContextMenu());
    }, 0);
  }

  private removeContextMenu(): void {
    if (this.contextMenu) {
      this.renderer.removeChild(document.body, this.contextMenu);
      this.contextMenu = null;
    }
  }
}
