import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, DollarSign, Heart, Calendar, BookOpen, Home, UtensilsCrossed, Rocket, Globe } from 'lucide-angular';

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
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './careers.component.html',
  styleUrls: ['./careers.component.scss']
})
export class CareersComponent {
  readonly DollarSign = DollarSign;
  readonly Heart = Heart;
  readonly Calendar = Calendar;
  readonly BookOpen = BookOpen;
  readonly Home = Home;
  readonly UtensilsCrossed = UtensilsCrossed;
  readonly Rocket = Rocket;
  readonly Globe = Globe;

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

  values = [
    { icon: 'zap', title: 'Innovation', description: 'We embrace new ideas and technologies to solve real problems', color: '#8FC9A3' },
    { icon: 'users', title: 'Community', description: 'We build connections between food lovers and culinary professionals', color: '#89C4D9' },
    { icon: 'star', title: 'Excellence', description: 'We strive for quality in everything we do', color: '#F5D760' },
    { icon: 'globe', title: 'Diversity', description: 'We celebrate Africa\'s rich cultural and culinary diversity', color: '#FFB88C' }
  ];

  benefits = [
    { icon: DollarSign, title: 'Competitive Salary', description: 'Market-related compensation packages', color: '#8FC9A3' },
    { icon: Heart, title: 'Medical Aid', description: 'Comprehensive health coverage', color: '#F0B5BA' },
    { icon: Calendar, title: 'Paid Leave', description: '20 days annual leave plus public holidays', color: '#89C4D9' },
    { icon: BookOpen, title: 'Learning Budget', description: 'Annual budget for courses and conferences', color: '#F5D760' },
    { icon: Home, title: 'Remote Flexibility', description: 'Hybrid and remote work options', color: '#FFB88C' },
    { icon: UtensilsCrossed, title: 'Food Perks', description: 'Monthly credits on the Itiyum platform', color: '#8FC9A3' },
    { icon: Rocket, title: 'Growth Opportunities', description: 'Clear career progression paths', color: '#89C4D9' },
    { icon: Globe, title: 'Impact', description: 'Build solutions for Africa and beyond', color: '#F0B5BA' }
  ];

  cultureItems = [
    { icon: 'heart', title: 'Building Together', description: 'At Itiyum, we believe in creating an inclusive environment where everyone can thrive. We celebrate South Africa\'s diversity and bring together people from different backgrounds, cultures, and experiences.', color: '#F0B5BA' },
    { icon: 'lightbulb', title: 'Innovation First', description: 'We encourage experimentation and learning. Whether you\'re a developer, marketer, or support specialist, you\'ll have the freedom to try new approaches and make an impact.', color: '#F5D760' },
    { icon: 'sun', title: 'Work-Life Balance', description: 'We understand the importance of balance. With flexible work arrangements and generous leave policies, we support our team members in all aspects of their lives.', color: '#89C4D9' }
  ];
}
