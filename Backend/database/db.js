// Backend/database/db.js
// Enhanced database connection with proper error handling and logging

const { Pool } = require('pg');

// Database configuration with environment variable fallbacks
const config = {
  host: process.env.PG_HOST || 'localhost',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'LinT8ihor62_',
  database: process.env.PG_DATABASE || 'TokenFactory',
  port: parseInt(process.env.PG_PORT) || 5432,
  
  // Connection pool settings
  max: 20,                    // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error if connection takes longer than 2 seconds
  
  // SSL configuration (disable for local development)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create connection pool
const pool = new Pool(config);

// Log connection details (without password)
console.log('🔗 Database Configuration:');
console.log(`   Host: ${config.host}:${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Pool Max: ${config.max} connections`);
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

// Handle pool events
pool.on('connect', (client) => {
  console.log('✅ New database client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err.message);
  console.error('   Client:', client ? 'Connected' : 'Disconnected');
});

pool.on('remove', (client) => {
  console.log('🔌 Database client removed from pool');
});

// Test initial connection
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as server_time, version() as pg_version');
    console.log('🎉 Database connection successful!');
    console.log(`   Server Time: ${result.rows[0].server_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:');
    console.error(`   Error: ${err.message}`);
    console.error(`   Code: ${err.code}`);
    console.error(`   Attempting to connect to: ${config.host}:${config.port}/${config.database}`);
    return false;
  }
}

// Enhanced query function with error handling and logging
async function query(text, params = []) {
  const start = Date.now();
  
  try {
    // Log query in development
    if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
      console.log('🔍 Executing query:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      if (params.length > 0) {
        console.log('   Parameters:', params);
      }
    }
    
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1000ms)
    if (duration > 1000) {
      console.warn(`⚠️  Slow query detected (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    console.error('❌ Database query error:');
    console.error(`   Query: ${text.substring(0, 200)}`);
    console.error(`   Error: ${err.message}`);
    console.error(`   Code: ${err.code}`);
    console.error(`   Duration: ${duration}ms`);
    
    // Re-throw the error for the caller to handle
    throw err;
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Health check function
async function healthCheck() {
  try {
    const result = await query('SELECT 1 as healthy');
    return {
      healthy: true,
      timestamp: new Date().toISOString(),
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    };
  } catch (err) {
    return {
      healthy: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔌 Closing database connections...');
  try {
    await pool.end();
    console.log('✅ Database connections closed gracefully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error closing database connections:', err.message);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🔌 Received SIGTERM, closing database connections...');
  try {
    await pool.end();
    console.log('✅ Database connections closed gracefully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error closing database connections:', err.message);
    process.exit(1);
  }
});

// Test connection on startup
testConnection().then(success => {
  if (!success) {
    console.error('🚨 Database connection failed on startup!');
    console.error('   Please check your database configuration and ensure PostgreSQL is running.');
    console.error('   Connection details:');
    console.error(`     Host: ${config.host}:${config.port}`);
    console.error(`     Database: ${config.database}`);
    console.error(`     User: ${config.user}`);
  }
});

module.exports = {
  query,
  transaction,
  healthCheck,
  pool,
  
  // For backward compatibility
  client: pool
};