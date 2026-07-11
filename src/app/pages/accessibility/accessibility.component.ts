import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Mail, Phone } from 'lucide-angular';

@Component({
  selector: 'app-accessibility',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './accessibility.component.html',
  styleUrls: ['./accessibility.component.scss']
})
export class AccessibilityComponent {
  readonly Mail = Mail;
  readonly Phone = Phone;
  lastUpdated = 'March 14, 2026';
}

