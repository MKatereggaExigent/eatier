import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Forgot Password</h1>
        <p>This feature is coming soon!</p>
        <a routerLink="/login" class="back-link">← Back to Login</a>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .auth-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 3rem;
      text-align: center;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--clr-black);
      margin-bottom: 1rem;
    }

    p {
      color: var(--clr-grey-700);
      margin-bottom: 2rem;
    }

    .back-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
  `]
})
export class ForgotPasswordComponent { }
