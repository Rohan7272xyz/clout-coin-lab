// Backend/run-migration.js
// Script to run database migrations

const fs = require('fs');
const path = require('path');
const db = require('./database/db');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Running User Status Migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_user_status.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found at:', migrationPath);
      console.log('   Please ensure the migration file exists.');
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration...');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');
    
    // Show current status distribution
    const statsResult = await db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM users
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'admin' THEN 1
          WHEN 'influencer' THEN 2
          WHEN 'investor' THEN 3
          WHEN 'browser' THEN 4
        END
    `);
    
    console.log('📊 Current User Status Distribution:');
    console.log('=====================================');
    
    let totalUsers = 0;
    statsResult.rows.forEach(row => {
      console.log(`   ${row.status.toUpperCase()}: ${row.count} users`);
      totalUsers += parseInt(row.count);
    });
    
    console.log('-------------------------------------');
    console.log(`   TOTAL: ${totalUsers} users`);
    console.log('=====================================\n');
    
    // Check if you need to set any admin users
    const adminCount = statsResult.rows.find(r => r.status === 'admin')?.count || 0;
    
    if (adminCount === 0) {
      console.log('⚠️  No admin users found!');
      console.log('   To set yourself as admin, run this SQL command:');
      console.log(`   UPDATE users SET status = 'admin' WHERE email = 'your-email@example.com';`);
      console.log('   Or use the set-admin.js script.\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
runMigration();