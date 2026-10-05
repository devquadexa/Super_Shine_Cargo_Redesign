const mysql = require('mysql2/promise');

const requiredEnvVars = ['DB_USER'];
const missingEnvVars = requiredEnvVars.filter(varName => process.env[varName] === undefined);

if (missingEnvVars.length > 0) {
  console.warn('⚠️ Missing recommended MySQL environment variables:', missingEnvVars.join(', '));
}

const config = {
  host: process.env.DB_HOST || process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'super_shine_cargo',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: true, // Prevents unintended timezone shifts on date/time columns
  multipleStatements: true
};

console.log('📊 MySQL Database Configuration:');
console.log(`   Host: ${config.host}:${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Password: ${config.password ? '*'.repeat(config.password.length) : '(empty)'}`);

let pool = null;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
};

const getConnection = async () => {
  try {
    const currentPool = getPool();
    const connection = await currentPool.getConnection();
    return connection;
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('Please verify:');
    console.error('  1. MySQL Server is running');
    console.error('  2. Database credentials are correct in backend-api/.env');
    console.error('  3. Database exists and user has privileges');
    throw err;
  }
};

const query = async (sqlText, params = []) => {
  const currentPool = getPool();
  const [rows, fields] = await currentPool.query(sqlText, params);
  return rows;
};

const execute = async (sqlText, params = []) => {
  const currentPool = getPool();
  const [result] = await currentPool.execute(sqlText, params);
  return result;
};

const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('MySQL pool closed');
  }
};

module.exports = {
  getPool,
  getConnection,
  query,
  execute,
  closePool,
  config
};
