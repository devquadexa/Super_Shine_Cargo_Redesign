/**
 * MySQL Database Import Script
 * Automatically creates the super_shine_cargo database, tables, and imports initial data
 * from init-mysql.sql using credentials configured in backend-api/.env
 *
 * Usage:
 *   node database/import-mysql.js
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  multipleStatements: true
};

async function importDatabase() {
  console.log('🔄 Connecting to MySQL server at ' + config.host + ':' + config.port + ' as ' + config.user + '...');

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL server.');
  } catch (err) {
    console.error('❌ Failed to connect to MySQL server:');
    console.error('   ' + err.message);
    console.error('\nPlease verify your credentials in backend-api/.env:');
    console.error('   DB_HOST=' + config.host);
    console.error('   DB_PORT=' + config.port);
    console.error('   DB_USER=' + config.user);
    console.error('   DB_PASSWORD=<your_mysql_password>');
    process.exit(1);
  }

  const sqlFilePath = path.join(__dirname, 'init-mysql.sql');
  if (!fs.existsSync(sqlFilePath)) {
    console.error('❌ init-mysql.sql file not found at ' + sqlFilePath);
    await connection.end();
    process.exit(1);
  }

  console.log('📖 Reading ' + sqlFilePath + '...');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('🚀 Executing SQL schema and data import...');
  try {
    await connection.query(sqlContent);
    console.log('✅ Database `super_shine_cargo` initialized and all records imported successfully!');

    // Show imported tables
    await connection.query('USE `super_shine_cargo`;');
    const [tables] = await connection.query('SHOW TABLES;');
    console.log(`📊 Total tables created: ${tables.length}`);
    tables.forEach(t => console.log('   - ' + Object.values(t)[0]));
  } catch (err) {
    console.error('❌ Error executing SQL script:');
    console.error('   ' + err.message);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('🔒 Connection closed.');
  }
}

importDatabase();
