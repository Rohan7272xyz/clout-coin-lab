// Backend/set-admin.js
// Script to set a user as admin

const db = require('./database/db');
require('dotenv').config();

async function setAdmin(email) {
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node set-admin.js your-email@example.com');
    process.exit(1);
  }
  
  try {
    console.log(`🔧 Setting admin status for: ${email}`);
    
    // Check if user exists
    const userCheck = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length === 0) {
      console.error(`❌ User with email "${email}" not found`);
      console.log('   Please make sure the user has signed up first.');
      process.exit(1);
    }
    
    const user = userCheck.rows[0];
    console.log(`✅ Found user: ${user.display_name || user.email}`);
    console.log(`   Current status: ${user.status || 'browser'}`);
    
    // Update to admin
    const result = await db.query(
      `UPDATE users 
       SET status = 'admin',
           status_updated_by = 'system',
           status_updated_at = CURRENT_TIMESTAMP
       WHERE email = $1
       RETURNING *`,
      [email]
    );
    
    if (result.rows.length > 0) {
      console.log(`\n✅ Successfully updated user to ADMIN status!`);
      console.log(`   User: ${result.rows[0].email}`);
      console.log(`   Status: ${result.rows[0].status}`);
      console.log(`   Wallet: ${result.rows[0].wallet_address}`);
      
      // Show all admins
      const admins = await db.query(
        `SELECT email, display_name, created_at 
         FROM users 
         WHERE status = 'admin'
         ORDER BY created_at`
      );
      
      console.log(`\n📊 Current Admin Users (${admins.rows.length}):`);
      console.log('=====================================');
      admins.rows.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email} (${admin.display_name || 'No name'})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin:', error.message);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];
setAdmin(email);