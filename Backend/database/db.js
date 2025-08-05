// backend/db/db.js

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  user: process.env.PG_USER || 'your_user',
  password: process.env.PG_PASSWORD || 'your_password',
  database: process.env.PG_DATABASE || 'your_db_name',
  port: process.env.PG_PORT || 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
