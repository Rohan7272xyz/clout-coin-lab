// backend/debug-db.js
// A simpler script to debug the connection issue

require('dotenv').config(); // Load environment variables

console.log('🔍 Debugging Database Connection...\n');

// First, let's see what connection parameters we're using
console.log('📋 Connection Parameters:');
console.log('   Host:', process.env.PG_HOST || 'localhost');
console.log('   Port:', process.env.PG_PORT || 5432);
console.log('   Database:', process.env.PG_DATABASE || 'postgres');
console.log('   User:', process.env.PG_USER || 'postgres');
console.log('   Password:', process.env.PG_PASSWORD ? 'BloeP5590uqPr' : 'NOT SET');
console.log('');

// Now let's try a simple connection with timeout
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'BloeP5590uqPr',
  database: process.env.PG_DATABASE || 'postgres',
  port: process.env.PG_PORT || 5432,
  connectionTimeoutMillis: 5000, // 5 second timeout
});

console.log('⏳ Attempting to connect (5 second timeout)...\n');

// Try a simple query with error handling
pool.query('SELECT NOW()', (err, result) => {
  if (err) {
    console.error('❌ Connection FAILED!\n');
    console.error('Error details:', err.message);
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\n📝 Connection refused. Please check:');
      console.error('   1. Is PostgreSQL running?');
      console.error('      Run: pg_isready or sudo service postgresql status');
      console.error('   2. Is it listening on the right port?');
      console.error('      Run: sudo netstat -plnt | grep postgres');
    } else if (err.code === '28P01' || err.code === '28000') {
      console.error('\n📝 Authentication failed. Please check:');
      console.error('   1. Username and password in .env file');
      console.error('   2. User exists in PostgreSQL');
      console.error('      Run: psql -U postgres -c "\\du"');
    } else if (err.code === '3D000') {
      console.error('\n📝 Database does not exist. Please create it:');
      console.error(`   Run: psql -U postgres -c "CREATE DATABASE ${process.env.PG_DATABASE || 'your_db_name'};"`);
    }
    
    console.error('\n💡 Quick fixes to try:');
    console.error('   1. Check PostgreSQL is running:');
    console.error('      - Mac: brew services list | grep postgresql');
    console.error('      - Linux: sudo systemctl status postgresql');
    console.error('      - Windows: Check Services app for PostgreSQL');
    console.error('   2. Start PostgreSQL if needed:');
    console.error('      - Mac: brew services start postgresql');
    console.error('      - Linux: sudo systemctl start postgresql');
    console.error('      - Windows: Start from Services app');
    console.error('   3. Verify your .env file has correct credentials');
    
    pool.end();
    process.exit(1);
  } else {
    console.log('✅ Connection SUCCESSFUL!\n');
    console.log('Database time:', result.rows[0].now);
    
    // Now check if the users table exists
    pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `, (err2, result2) => {
      if (err2) {
        console.error('\n❌ Error checking for users table:', err2.message);
      } else if (result2.rows[0].exists) {
        console.log('✅ Users table exists!\n');
        
        // Count users
        pool.query('SELECT COUNT(*) FROM users', (err3, result3) => {
          if (!err3) {
            console.log(`📊 Current user count: ${result3.rows[0].count}`);
          }
          pool.end();
          process.exit(0);
        });
      } else {
        console.log('⚠️  Users table does NOT exist\n');
        console.log('You need to create it. Run this SQL in psql or pgAdmin:');
        console.log('----------------------------------------');
        console.log(`CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    total_invested DECIMAL(20, 2) DEFAULT 0.00,
    portfolio_value DECIMAL(20, 2) DEFAULT 0.00
);`);
        console.log('----------------------------------------');
        pool.end();
        process.exit(0);
      }
    });
  }
});

// Add a timeout in case the connection completely hangs
setTimeout(() => {
  console.error('\n❌ Connection timed out after 10 seconds');
  console.error('This usually means PostgreSQL is not running or not accessible.');
  console.error('\nTry running: pg_isready');
  pool.end();
  process.exit(1);
}, 10000);