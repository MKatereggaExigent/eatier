import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bookings-container">
      <div class="bookings-header">
        <h1>📅 Bookings</h1>
        <p>Manage your bookings and appointments</p>
      </div>
      
      <div class="coming-soon">
        <div class="coming-soon-icon">🚧</div>
        <h2>Coming Soon</h2>
        <p>The bookings feature is currently under development.</p>
        <p>You'll be able to manage your bookings and appointments here soon!</p>
      </div>
    </div>
  `,
  styles: [`
    .bookings-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .bookings-header {
      text-align: center;
      margin-bottom: 3rem;

      h1 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--clr-black);
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--clr-grey-700);
        font-size: 1rem;
      }
    }

    .coming-soon {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;

      .coming-soon-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
      }

      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--clr-black);
        margin-bottom: 1rem;
      }

      p {
        color: var(--clr-grey-700);
        font-size: 1rem;
        margin-bottom: 0.5rem;
      }
    }
  `]
})
export class BookingsComponent {
}
