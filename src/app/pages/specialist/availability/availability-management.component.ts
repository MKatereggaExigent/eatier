import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Specialist } from '../../../shared/models/user.model';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface DayAvailability {
  day: string;
  dayName: string;
  isEnabled: boolean;
  timeSlots: TimeSlot[];
}

interface SpecialDate {
  id: string;
  date: Date;
  type: 'unavailable' | 'special_hours' | 'holiday';
  reason: string;
  timeSlots?: TimeSlot[];
}

interface BookingRule {
  id: string;
  name: string;
  type: 'advance_booking' | 'minimum_duration' | 'maximum_duration' | 'buffer_time';
  value: number;
  unit: 'hours' | 'days' | 'weeks';
  isEnabled: boolean;
}

@Component({
  selector: 'app-availability-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './availability-management.component.html',
  styleUrls: ['./availability-management.component.scss']
})
export class AvailabilityManagementComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  currentUser = this.authService.currentUser;
  specialist = computed(() => this.currentUser() as Specialist);

  // State management
  loading = signal(false);
  activeTab = signal<'weekly' | 'special' | 'rules' | 'calendar'>('weekly');
  showSpecialDateModal = signal(false);
  showRuleModal = signal(false);
  selectedSpecialDate = signal<SpecialDate | null>(null);
  selectedRule = signal<BookingRule | null>(null);

  // Weekly availability
  weeklyAvailability = signal<DayAvailability[]>([
    {
      day: 'monday',
      dayName: 'Monday',
      isEnabled: true,
      timeSlots: [
        { id: '1', startTime: '09:00', endTime: '12:00', isAvailable: true },
        { id: '2', startTime: '14:00', endTime: '18:00', isAvailable: true }
      ]
    },
    {
      day: 'tuesday',
      dayName: 'Tuesday',
      isEnabled: true,
      timeSlots: [
        { id: '3', startTime: '09:00', endTime: '12:00', isAvailable: true },
        { id: '4', startTime: '14:00', endTime: '18:00', isAvailable: true }
      ]
    },
    {
      day: 'wednesday',
      dayName: 'Wednesday',
      isEnabled: true,
      timeSlots: [
        { id: '5', startTime: '09:00', endTime: '12:00', isAvailable: true },
        { id: '6', startTime: '14:00', endTime: '18:00', isAvailable: true }
      ]
    },
    {
      day: 'thursday',
      dayName: 'Thursday',
      isEnabled: true,
      timeSlots: [
        { id: '7', startTime: '09:00', endTime: '12:00', isAvailable: true },
        { id: '8', startTime: '14:00', endTime: '18:00', isAvailable: true }
      ]
    },
    {
      day: 'friday',
      dayName: 'Friday',
      isEnabled: true,
      timeSlots: [
        { id: '9', startTime: '09:00', endTime: '12:00', isAvailable: true },
        { id: '10', startTime: '14:00', endTime: '18:00', isAvailable: true }
      ]
    },
    {
      day: 'saturday',
      dayName: 'Saturday',
      isEnabled: true,
      timeSlots: [
        { id: '11', startTime: '10:00', endTime: '16:00', isAvailable: true }
      ]
    },
    {
      day: 'sunday',
      dayName: 'Sunday',
      isEnabled: false,
      timeSlots: []
    }
  ]);

  // Special dates
  specialDates = signal<SpecialDate[]>([
    {
      id: '1',
      date: new Date('2024-02-14'),
      type: 'special_hours',
      reason: 'Valentine\'s Day - Extended Hours',
      timeSlots: [
        { id: 'v1', startTime: '17:00', endTime: '23:00', isAvailable: true }
      ]
    },
    {
      id: '2',
      date: new Date('2024-02-25'),
      type: 'unavailable',
      reason: 'Personal Day Off'
    },
    {
      id: '3',
      date: new Date('2024-03-17'),
      type: 'holiday',
      reason: 'St. Patrick\'s Day - Catering Events Only',
      timeSlots: [
        { id: 'sp1', startTime: '12:00', endTime: '20:00', isAvailable: true }
      ]
    }
  ]);

  // Booking rules
  bookingRules = signal<BookingRule[]>([
    {
      id: '1',
      name: 'Advance Booking Required',
      type: 'advance_booking',
      value: 48,
      unit: 'hours',
      isEnabled: true
    },
    {
      id: '2',
      name: 'Minimum Event Duration',
      type: 'minimum_duration',
      value: 2,
      unit: 'hours',
      isEnabled: true
    },
    {
      id: '3',
      name: 'Maximum Event Duration',
      type: 'maximum_duration',
      value: 8,
      unit: 'hours',
      isEnabled: true
    },
    {
      id: '4',
      name: 'Buffer Time Between Events',
      type: 'buffer_time',
      value: 1,
      unit: 'hours',
      isEnabled: true
    }
  ]);

  // Forms
  specialDateForm: FormGroup;
  ruleForm: FormGroup;

  // Calendar data
  currentMonth = signal(new Date());
  calendarDays = computed(() => this.generateCalendarDays());

  constructor() {
    this.specialDateForm = this.fb.group({
      date: ['', Validators.required],
      type: ['unavailable', Validators.required],
      reason: ['', [Validators.required, Validators.minLength(3)]],
      startTime: [''],
      endTime: ['']
    });

    this.ruleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: ['advance_booking', Validators.required],
      value: [1, [Validators.required, Validators.min(1)]],
      unit: ['hours', Validators.required],
      isEnabled: [true]
    });
  }

  // Tab management
  setActiveTab(tab: 'weekly' | 'special' | 'rules' | 'calendar'): void {
    this.activeTab.set(tab);
  }

  // Weekly availability management
  toggleDayEnabled(dayIndex: number): void {
    const availability = this.weeklyAvailability();
    const updatedAvailability = availability.map((day, index) => 
      index === dayIndex ? { ...day, isEnabled: !day.isEnabled } : day
    );
    this.weeklyAvailability.set(updatedAvailability);
  }

  addTimeSlot(dayIndex: number): void {
    const availability = this.weeklyAvailability();
    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true
    };
    
    const updatedAvailability = availability.map((day, index) => 
      index === dayIndex 
        ? { ...day, timeSlots: [...day.timeSlots, newSlot] }
        : day
    );
    this.weeklyAvailability.set(updatedAvailability);
  }

  removeTimeSlot(dayIndex: number, slotId: string): void {
    const availability = this.weeklyAvailability();
    const updatedAvailability = availability.map((day, index) => 
      index === dayIndex 
        ? { ...day, timeSlots: day.timeSlots.filter(slot => slot.id !== slotId) }
        : day
    );
    this.weeklyAvailability.set(updatedAvailability);
  }

  updateTimeSlot(dayIndex: number, slotId: string, field: 'startTime' | 'endTime', value: string): void {
    const availability = this.weeklyAvailability();
    const updatedAvailability = availability.map((day, index) => 
      index === dayIndex 
        ? {
            ...day, 
            timeSlots: day.timeSlots.map(slot => 
              slot.id === slotId ? { ...slot, [field]: value } : slot
            )
          }
        : day
    );
    this.weeklyAvailability.set(updatedAvailability);
  }

  toggleTimeSlotAvailability(dayIndex: number, slotId: string): void {
    const availability = this.weeklyAvailability();
    const updatedAvailability = availability.map((day, index) => 
      index === dayIndex 
        ? {
            ...day, 
            timeSlots: day.timeSlots.map(slot => 
              slot.id === slotId ? { ...slot, isAvailable: !slot.isAvailable } : slot
            )
          }
        : day
    );
    this.weeklyAvailability.set(updatedAvailability);
  }

  // Special dates management
  openSpecialDateModal(specialDate?: SpecialDate): void {
    if (specialDate) {
      this.selectedSpecialDate.set(specialDate);
      this.specialDateForm.patchValue({
        date: specialDate.date.toISOString().split('T')[0],
        type: specialDate.type,
        reason: specialDate.reason,
        startTime: specialDate.timeSlots?.[0]?.startTime || '',
        endTime: specialDate.timeSlots?.[0]?.endTime || ''
      });
    } else {
      this.selectedSpecialDate.set(null);
      this.specialDateForm.reset({ type: 'unavailable' });
    }
    this.showSpecialDateModal.set(true);
  }

  closeSpecialDateModal(): void {
    this.showSpecialDateModal.set(false);
    this.selectedSpecialDate.set(null);
    this.specialDateForm.reset();
  }

  saveSpecialDate(): void {
    if (this.specialDateForm.valid) {
      const formData = this.specialDateForm.value;
      const selectedDate = this.selectedSpecialDate();
      
      const specialDate: SpecialDate = {
        id: selectedDate?.id || Date.now().toString(),
        date: new Date(formData.date),
        type: formData.type,
        reason: formData.reason,
        timeSlots: formData.type === 'special_hours' && formData.startTime && formData.endTime
          ? [{ id: Date.now().toString(), startTime: formData.startTime, endTime: formData.endTime, isAvailable: true }]
          : undefined
      };

      if (selectedDate) {
        // Update existing
        const dates = this.specialDates().map(d => d.id === selectedDate.id ? specialDate : d);
        this.specialDates.set(dates);
      } else {
        // Add new
        this.specialDates.set([...this.specialDates(), specialDate]);
      }
      
      this.closeSpecialDateModal();
    }
  }

  deleteSpecialDate(dateId: string): void {
    if (confirm('Are you sure you want to delete this special date?')) {
      const dates = this.specialDates().filter(d => d.id !== dateId);
      this.specialDates.set(dates);
    }
  }

  // Booking rules management
  openRuleModal(rule?: BookingRule): void {
    if (rule) {
      this.selectedRule.set(rule);
      this.ruleForm.patchValue({
        name: rule.name,
        type: rule.type,
        value: rule.value,
        unit: rule.unit,
        isEnabled: rule.isEnabled
      });
    } else {
      this.selectedRule.set(null);
      this.ruleForm.reset({ type: 'advance_booking', unit: 'hours', isEnabled: true });
    }
    this.showRuleModal.set(true);
  }

  closeRuleModal(): void {
    this.showRuleModal.set(false);
    this.selectedRule.set(null);
    this.ruleForm.reset();
  }

  saveRule(): void {
    if (this.ruleForm.valid) {
      const formData = this.ruleForm.value;
      const selectedRule = this.selectedRule();
      
      const rule: BookingRule = {
        id: selectedRule?.id || Date.now().toString(),
        name: formData.name,
        type: formData.type,
        value: formData.value,
        unit: formData.unit,
        isEnabled: formData.isEnabled
      };

      if (selectedRule) {
        // Update existing
        const rules = this.bookingRules().map(r => r.id === selectedRule.id ? rule : r);
        this.bookingRules.set(rules);
      } else {
        // Add new
        this.bookingRules.set([...this.bookingRules(), rule]);
      }
      
      this.closeRuleModal();
    }
  }

  deleteRule(ruleId: string): void {
    if (confirm('Are you sure you want to delete this rule?')) {
      const rules = this.bookingRules().filter(r => r.id !== ruleId);
      this.bookingRules.set(rules);
    }
  }

  toggleRuleEnabled(ruleId: string): void {
    const rules = this.bookingRules().map(r => 
      r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r
    );
    this.bookingRules.set(rules);
  }

  // Calendar management
  previousMonth(): void {
    const current = this.currentMonth();
    const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    this.currentMonth.set(previous);
  }

  nextMonth(): void {
    const current = this.currentMonth();
    const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    this.currentMonth.set(next);
  }

  generateCalendarDays(): any[] {
    const current = this.currentMonth();
    const year = current.getFullYear();
    const month = current.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = this.isSameDay(currentDate, new Date());
      const specialDate = this.specialDates().find(sd => this.isSameDay(sd.date, currentDate));
      const dayOfWeek = currentDate.getDay();
      const weeklyAvail = this.weeklyAvailability()[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
      
      days.push({
        date: new Date(currentDate),
        day: currentDate.getDate(),
        isCurrentMonth,
        isToday,
        isAvailable: isCurrentMonth && weeklyAvail?.isEnabled && !specialDate?.type.includes('unavailable'),
        specialDate,
        weeklyAvailable: weeklyAvail?.isEnabled
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Utility methods
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getSpecialDateTypeLabel(type: string): string {
    const labels = {
      unavailable: 'Unavailable',
      special_hours: 'Special Hours',
      holiday: 'Holiday'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getRuleTypeLabel(type: string): string {
    const labels = {
      advance_booking: 'Advance Booking',
      minimum_duration: 'Minimum Duration',
      maximum_duration: 'Maximum Duration',
      buffer_time: 'Buffer Time'
    };
    return labels[type as keyof typeof labels] || type;
  }

  saveAllChanges(): void {
    this.loading.set(true);
    // Simulate API call
    setTimeout(() => {
      this.loading.set(false);
      console.log('Availability settings saved successfully');
    }, 1000);
  }
}
