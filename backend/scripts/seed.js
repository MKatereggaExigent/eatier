const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Realistic dummy data
const users = [
  {
    email: 'marco.rossi@email.com',
    password: 'password123',
    first_name: 'Marco',
    last_name: 'Rossi',
    phone: '+1-555-0101',
    country: 'Italy',
    date_of_birth: '1985-03-15',
    gender: 'male',
    is_chef: true,
    profile_photo: 'https://images.unsplash.com/photo-1583394293214-28a5b0a8e8b8?w=400&h=400&fit=crop&crop=face',
    bio: 'Passionate Italian chef specializing in traditional pasta dishes with modern twists. 20+ years of culinary experience.',
    experience_years: 20,
    specialty_dishes: ['Pasta Carbonara', 'Risotto Milanese', 'Osso Buco', 'Tiramisu'],
    certifications: ['Culinary Arts Diploma', 'Food Safety Certified', 'Wine Sommelier Level 2']
  },
  {
    email: 'sarah.kim@email.com',
    password: 'password123',
    first_name: 'Sarah',
    last_name: 'Kim',
    phone: '+1-555-0102',
    country: 'South Korea',
    date_of_birth: '1990-07-22',
    gender: 'female',
    is_chef: true,
    profile_photo: 'https://images.unsplash.com/photo-1494790108755-2616c6d4e6e8?w=400&h=400&fit=crop&crop=face',
    bio: 'Korean fusion chef bringing traditional flavors to modern cuisine. Featured in Food & Wine magazine.',
    experience_years: 12,
    specialty_dishes: ['Korean BBQ', 'Kimchi Fried Rice', 'Bulgogi Tacos', 'Korean Fried Chicken'],
    certifications: ['Korean Culinary Institute', 'James Beard Foundation Member']
  },
  {
    email: 'david.chen@email.com',
    password: 'password123',
    first_name: 'David',
    last_name: 'Chen',
    phone: '+1-555-0103',
    country: 'China',
    date_of_birth: '1982-11-08',
    gender: 'male',
    is_chef: true,
    profile_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    bio: 'Modern Asian cuisine expert with Michelin star experience. Specializing in innovative dim sum and seafood.',
    experience_years: 18,
    specialty_dishes: ['Peking Duck', 'Xiaolongbao', 'Mapo Tofu', 'Hot Pot'],
    certifications: ['Culinary Institute of America', 'Michelin Guide Recognition', 'Asian Culinary Arts Master']
  },
  {
    email: 'mike.foodlover@email.com',
    password: 'password123',
    first_name: 'Mike',
    last_name: 'Johnson',
    phone: '+1-555-0104',
    country: 'United States',
    date_of_birth: '1995-05-12',
    gender: 'male',
    is_chef: false,
    profile_photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    bio: 'Food enthusiast and blogger. Love discovering new restaurants and sharing culinary experiences with the community.',
    experience_years: 0,
    specialty_dishes: [],
    certifications: []
  },
  {
    email: 'emma.foodie@email.com',
    password: 'password123',
    first_name: 'Emma',
    last_name: 'Wilson',
    phone: '+1-555-0105',
    country: 'United Kingdom',
    date_of_birth: '1988-09-30',
    gender: 'female',
    is_chef: false,
    profile_photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    bio: 'Travel food blogger exploring cuisines around the world. Always looking for the next great meal!',
    experience_years: 0,
    specialty_dishes: [],
    certifications: []
  }
];

const businesses = [
  {
    business_name: 'Bella Italia Restaurant',
    business_type: 'Fine Dining',
    email: 'info@bellaitalia.com',
    phone: '+1-555-0201',
    country: 'Italy',
    address: '123 Via Roma, Milan, Italy',
    sustainability_ethos: 'Committed to using locally sourced ingredients and sustainable farming practices. Zero waste kitchen initiative.',
    opens_at: '11:00',
    closes_at: '23:00',
    facilities: ['parking', 'wifi', 'wheelchair_accessible', 'outdoor_seating'],
    location_links: ['Milan Center', 'Eatier Premium', 'Tourist District'],
    bio: 'Authentic Italian dining experience in the heart of Milan. Family recipes passed down through generations.'
  },
  {
    business_name: 'Seoul Kitchen',
    business_type: 'Korean',
    email: 'hello@seoulkitchen.com',
    phone: '+1-555-0202',
    country: 'South Korea',
    address: '456 Gangnam-gu, Seoul, South Korea',
    sustainability_ethos: 'Traditional Korean cooking methods with organic ingredients. Supporting local farmers and reducing food waste.',
    opens_at: '10:00',
    closes_at: '22:00',
    facilities: ['wifi', 'air_conditioning', 'private_dining'],
    location_links: ['Gangnam', 'K-Food District', 'Seoul Eats'],
    bio: 'Modern Korean restaurant bringing authentic flavors with contemporary presentation and atmosphere.'
  },
  {
    business_name: 'Dragon Palace',
    business_type: 'Chinese',
    email: 'contact@dragonpalace.com',
    phone: '+1-555-0203',
    country: 'China',
    address: '789 Nanjing Road, Shanghai, China',
    sustainability_ethos: 'Traditional Chinese medicine principles in our cooking. Organic vegetables and sustainable seafood sourcing.',
    opens_at: '09:00',
    closes_at: '24:00',
    facilities: ['parking', 'wifi', 'private_dining', 'karaoke'],
    location_links: ['Shanghai Bund', 'Luxury Dining', 'Business District'],
    bio: 'Elegant Chinese dining with centuries-old recipes and modern culinary techniques in luxurious setting.'
  },
  {
    business_name: 'Green Leaf Cafe',
    business_type: 'Cafe',
    email: 'info@greenleafcafe.com',
    phone: '+1-555-0204',
    country: 'United States',
    address: '321 Main Street, Portland, OR, USA',
    sustainability_ethos: 'Plant-based menu with 100% renewable energy. Compostable packaging and zero-waste commitment.',
    opens_at: '06:00',
    closes_at: '20:00',
    facilities: ['wifi', 'outdoor_seating', 'pet_friendly', 'wheelchair_accessible'],
    location_links: ['Downtown Portland', 'Eco-Friendly', 'Coffee District'],
    bio: 'Sustainable cafe serving organic coffee, fresh pastries, and plant-based meals in a cozy atmosphere.'
  },
  {
    business_name: 'The Crown Pub',
    business_type: 'Pub',
    email: 'reservations@thecrownpub.co.uk',
    phone: '+44-20-7946-0958',
    country: 'United Kingdom',
    address: '567 High Street, London, UK',
    sustainability_ethos: 'Local brewery partnerships and farm-to-table ingredients. Supporting British farmers and reducing carbon footprint.',
    opens_at: '12:00',
    closes_at: '01:00',
    facilities: ['wifi', 'outdoor_seating', 'live_music', 'sports_tv'],
    location_links: ['London Bridge', 'Historic Pubs', 'Nightlife'],
    bio: 'Traditional British pub with craft beers, hearty meals, and live entertainment in historic London setting.'
  }
];

const menuItems = [
  // Bella Italia Restaurant menus
  { title: 'Breakfast Menu', category: 'breakfast', description: 'Fresh morning', price: 15.99, business_index: 0 },
  { title: 'Lunch Specials', category: 'lunch', description: 'Midday delights', price: 22.50, business_index: 0 },
  { title: 'Dinner Menu', category: 'dinner', description: 'Evening feast', price: 35.00, business_index: 0 },
  { title: 'Wine Selection', category: 'beverages', description: 'Fine wines', price: 8.99, business_index: 0 },
  { title: 'Dessert Menu', category: 'dessert', description: 'Sweet endings', price: 12.00, business_index: 0 },
  
  // Seoul Kitchen menus
  { title: 'Korean Breakfast', category: 'breakfast', description: 'Traditional AM', price: 18.00, business_index: 1 },
  { title: 'Lunch Bowls', category: 'lunch', description: 'Healthy bowls', price: 16.50, business_index: 1 },
  { title: 'BBQ Dinner', category: 'dinner', description: 'Grilled perfection', price: 28.99, business_index: 1 },
  { title: 'Korean Drinks', category: 'beverages', description: 'Authentic sips', price: 6.50, business_index: 1 },
  { title: 'Sweet Treats', category: 'dessert', description: 'Korean sweets', price: 9.99, business_index: 1 },
  
  // Dragon Palace menus
  { title: 'Dim Sum Brunch', category: 'breakfast', description: 'Morning dim sum', price: 24.00, business_index: 2 },
  { title: 'Lunch Express', category: 'lunch', description: 'Quick & tasty', price: 19.99, business_index: 2 },
  { title: 'Imperial Dinner', category: 'dinner', description: 'Royal feast', price: 45.00, business_index: 2 },
  { title: 'Tea Selection', category: 'beverages', description: 'Premium teas', price: 5.99, business_index: 2 },
  { title: 'Fortune Sweets', category: 'dessert', description: 'Lucky desserts', price: 11.50, business_index: 2 }
];

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    await client.query('TRUNCATE TABLE notifications, digital_cards, user_insights, business_insights, chef_follows, post_comments, post_likes, community_posts, legacy_access, menu_access, menus, businesses, users RESTART IDENTITY CASCADE');
    
    // Insert users
    console.log('👥 Seeding users...');
    const userIds = [];
    
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const result = await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, phone, country, date_of_birth, gender, is_chef, profile_photo, bio, experience_years, specialty_dishes, certifications)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [
        user.email, hashedPassword, user.first_name, user.last_name, user.phone, user.country,
        user.date_of_birth, user.gender, user.is_chef, user.profile_photo, user.bio,
        user.experience_years, user.specialty_dishes, user.certifications
      ]);
      userIds.push(result.rows[0].id);
    }
    
    // Insert businesses
    console.log('🏢 Seeding businesses...');
    const businessIds = [];
    
    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      const ownerId = userIds[i % userIds.length]; // Assign owners cyclically
      
      const result = await client.query(`
        INSERT INTO businesses (owner_id, business_name, business_type, email, phone, country, address, sustainability_ethos, opens_at, closes_at, facilities, location_links, bio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [
        ownerId, business.business_name, business.business_type, business.email, business.phone,
        business.country, business.address, business.sustainability_ethos, business.opens_at,
        business.closes_at, business.facilities, business.location_links, business.bio
      ]);
      businessIds.push(result.rows[0].id);
    }
    
    // Insert menu items
    console.log('🍽️ Seeding menus...');
    for (const menu of menuItems) {
      await client.query(`
        INSERT INTO menus (business_id, title, category, description, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [businessIds[menu.business_index], menu.title, menu.category, menu.description, menu.price]);
    }
    
    await client.query('COMMIT');
    console.log('✅ Database seeded successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
