const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(__dirname, '../../database/sls_logs.sqlite');

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Could not connect to database', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

async function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 创建分析会话表
      db.run(`
        CREATE TABLE IF NOT EXISTS analysis_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_name TEXT NOT NULL,
          file_name TEXT NOT NULL,
          total_logs INTEGER DEFAULT 0,
          unique_users INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) {
          console.error('Error creating analysis_sessions table:', err.message);
          return reject(err);
        }
        console.log('Table analysis_sessions created or already exists.');
      });

      // 创建日志表
      db.run(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          uid TEXT,
          sid TEXT,
          event_type TEXT,
          event_name TEXT,
          datetime TEXT,
          store TEXT,
          pack_version TEXT,
          client_version TEXT,
          raw_data TEXT,
          FOREIGN KEY (session_id) REFERENCES analysis_sessions(id)
        );
      `, (err) => {
        if (err) {
          console.error('Error creating logs table:', err.message);
          return reject(err);
        }
        console.log('Table logs created or already exists.');
        resolve();
      });
    });
  });
}

module.exports = {
  db,
  initDatabase
};
