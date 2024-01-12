const mysql = require('mysql2');
const config = require('../config.js');

const pool = mysql.createPool({
  host: config.host,
  user: config.user,
  password: config.password,
  database: config.db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

async function queryDatabaseBilling(sql) {
  try {
    const [rows, fields] = await promisePool.query(sql);
    return rows;
  } catch (err) {
    console.error('Error executing query:', err);
    throw err;
  }
}

module.exports = queryDatabaseBilling;