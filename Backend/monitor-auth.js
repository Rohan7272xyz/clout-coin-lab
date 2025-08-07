// backend/monitor-auth.js
// Run this alongside your server to monitor authentication in real-time

const db = require('./database/db');

let lastUserCount = 0;

async function monitorUsers() {
  try {
    // Get current user count
    const countResult = await db.query('SELECT COUNT(*) FROM users');
    const currentCount = parseInt(countResult.rows[0].count);
    
    // Check for new users
    if (currentCount > lastUserCount) {
      console.log(`\n🎉 NEW USER DETECTED! Total users: ${currentCount}`);
      
      // Get the latest user
      const latestUser = await db.query(`
        SELECT 
          id,
          wallet_address,
          email,
          display_name,
          profile_picture_url,
          is_active,
          total_invested,
          portfolio_value,
          created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      const user = latestUser.rows[0];
      console.log('📧 Email:', user.email);
      console.log('💼 Wallet:', user.wallet_address.substring(0, 20) + '...');
      console.log('👤 Display Name:', user.display_name || '(not set)');
      console.log('🖼️  Profile Picture:', user.profile_picture_url ? 'Yes' : 'No');
      console.log('📅 Created:', new Date(user.created_at).toLocaleString());
      console.log('💰 Total Invested:', user.total_invested || 0);
      console.log('📊 Portfolio Value:', user.portfolio_value || 0);
      console.log('✅ Active:', user.is_active);
      console.log('-'.repeat(50));
      
      lastUserCount = currentCount;
    }
    
    // Show periodic status
    if (Date.now() % 30000 < 5000) { // Every ~30 seconds
      const activeUsers = await db.query(`
        SELECT COUNT(*) FROM users WHERE is_active = true
      `);
      
      const recentActivity = await db.query(`
        SELECT COUNT(*) FROM users 
        WHERE updated_at > NOW() - INTERVAL '1 hour'
      `);
      
      console.log(`\n📊 Status Update - ${new Date().toLocaleTimeString()}`);
      console.log(`   Total Users: ${currentCount}`);
      console.log(`   Active Users: ${activeUsers.rows[0].count}`);
      console.log(`   Recently Active (1h): ${recentActivity.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Monitor error:', error.message);
  }
}

async function showCurrentUsers() {
  try {
    const users = await db.query(`
      SELECT 
        id,
        email,
        display_name,
        created_at,
        is_active
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Current Users in Database:');
    console.log('-'.repeat(80));
    
    if (users.rows.length === 0) {
      console.log('No users found. Waiting for first sign-up...');
    } else {
      users.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.display_name || '(not set)'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
        console.log('');
      });
    }
    
    console.log('-'.repeat(80));
    
    // Store initial count
    const countResult = await db.query('SELECT COUNT(*) FROM users');
    lastUserCount = parseInt(countResult.rows[0].count);
    
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
  }
}

console.log('🔍 CoinFluence Authentication Monitor');
console.log('=====================================');
console.log('Monitoring for new user sign-ups...');
console.log('Press Ctrl+C to stop\n');

// Show current users on start
showCurrentUsers().then(() => {
  // Start monitoring
  setInterval(monitorUsers, 2000); // Check every 2 seconds
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping monitor...');
  process.exit(0);
});