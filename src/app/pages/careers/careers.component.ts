import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  description: string;
  requirements: string[];
}

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './careers.component.html',
  styleUrls: ['./careers.component.scss']
})
export class CareersComponent {
  jobOpenings = signal<JobOpening[]>([
    {
      id: '1',
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      location: 'Cape Town, South Africa (Hybrid)',
      type: 'Full-time',
      description: 'Join our engineering team to build scalable solutions for Africa\'s growing food tech industry.',
      requirements: [
        '5+ years experience with Angular and Node.js',
        'Experience with PostgreSQL and cloud platforms',
        'Strong understanding of RESTful APIs',
        'Experience with payment integrations'
      ]
    },
    {
      id: '2',
      title: 'Restaurant Partnership Manager',
      department: 'Business Development',
      location: 'Johannesburg, South Africa',
      type: 'Full-time',
      description: 'Build and maintain relationships with restaurant partners across South Africa.',
      requirements: [
        '3+ years in business development or partnerships',
        'Experience in hospitality or food industry',
        'Excellent communication and negotiation skills',
        'Valid driver\'s license'
      ]
    },
    {
      id: '3',
      title: 'Customer Support Specialist',
      department: 'Customer Success',
      location: 'Remote (South Africa)',
      type: 'Full-time',
      description: 'Provide exceptional support to our users, restaurants, and specialists.',
      requirements: [
        'Excellent written and verbal communication',
        'Experience with customer support tools',
        'Problem-solving mindset',
        'Fluent in English and at least one other South African language'
      ]
    },
    {
      id: '4',
      title: 'Marketing Intern',
      department: 'Marketing',
      location: 'Cape Town, South Africa',
      type: 'Internship',
      description: 'Learn digital marketing in a fast-paced food tech startup environment.',
      requirements: [
        'Currently studying Marketing, Communications, or related field',
        'Social media savvy',
        'Creative mindset',
        'Available for 6-month internship'
      ]
    },
    {
      id: '5',
      title: 'Data Analyst',
      department: 'Analytics',
      location: 'Remote (South Africa)',
      type: 'Full-time',
      description: 'Analyze platform data to drive business insights and improve user experience.',
      requirements: [
        'Degree in Statistics, Mathematics, or related field',
        'Proficiency in SQL and data visualization tools',
        'Experience with Python or R',
        'Strong analytical and communication skills'
      ]
    }
  ]);

  benefits = [
    { icon: '💰', title: 'Competitive Salary', description: 'Market-related compensation packages' },
    { icon: '🏥', title: 'Medical Aid', description: 'Comprehensive health coverage' },
    { icon: '🏖️', title: 'Paid Leave', description: '20 days annual leave plus public holidays' },
    { icon: '📚', title: 'Learning Budget', description: 'Annual budget for courses and conferences' },
    { icon: '🏠', title: 'Remote Flexibility', description: 'Hybrid and remote work options' },
    { icon: '🍽️', title: 'Food Perks', description: 'Monthly credits on the Itiyum platform' },
    { icon: '🚀', title: 'Growth Opportunities', description: 'Clear career progression paths' },
    { icon: '🌍', title: 'Impact', description: 'Build solutions for Africa and beyond' }
  ];

  values = [
    { title: 'Innovation', description: 'We embrace new ideas and technologies to solve real problems' },
    { title: 'Community', description: 'We build connections between food lovers and culinary professionals' },
    { title: 'Excellence', description: 'We strive for quality in everything we do' },
    { title: 'Diversity', description: 'We celebrate South Africa\'s rich cultural and culinary diversity' }
  ];
}

