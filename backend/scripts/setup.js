const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function setup() {
  console.log('🚀 Setting up Eatier Backend...\n');
  
  try {
    // Check if .env exists, if not copy from .env.example
    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    
    if (!fs.existsSync(envPath)) {
      console.log('📝 Creating .env file from .env.example...');
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env file created. Please update it with your database credentials.\n');
    }
    
    // Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Dependencies installed.\n');
    
    // Check PostgreSQL connection
    console.log('🔍 Checking PostgreSQL connection...');
    try {
      const pool = require('../config/database');
      await pool.query('SELECT NOW()');
      console.log('✅ PostgreSQL connection successful.\n');
      
      // Run migrations
      console.log('🗄️ Running database migrations...');
      const migrate = require('./migrate');
      await migrate();
      console.log('✅ Database migrations completed.\n');
      
      // Seed database
      console.log('🌱 Seeding database with sample data...');
      const seed = require('./seed');
      await seed();
      console.log('✅ Database seeded successfully.\n');
      
      await pool.end();
      
    } catch (dbError) {
      console.log('❌ Database connection failed. Please ensure PostgreSQL is running and credentials are correct.');
      console.log('   You can run migrations and seeding later with:');
      console.log('   npm run migrate && npm run seed\n');
    }
    
    console.log('🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update backend/.env with your database credentials');
    console.log('2. Start the backend server: npm run dev');
    console.log('3. Start the Angular frontend: ng serve');
    console.log('4. Visit http://localhost:4200 to see the application');
    console.log('\n🔗 API will be available at: http://localhost:3001/api');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setup();
}

module.exports = setup;
