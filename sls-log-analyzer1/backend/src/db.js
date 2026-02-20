const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'logs.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  } else {
    console.log('SQLite 数据库连接成功:', dbPath);
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // 日志表
    db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        uid TEXT,
        datetime TEXT NOT NULL,
        level TEXT,
        resp TEXT,
        sid TEXT,
        device TEXT,
        client_ver TEXT,
        pack_ver TEXT,
        country TEXT,
        store TEXT,
        raw_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 索引
    db.run('CREATE INDEX IF NOT EXISTS idx_datetime ON logs(datetime)');
    db.run('CREATE INDEX IF NOT EXISTS idx_level ON logs(level)');
    db.run('CREATE INDEX IF NOT EXISTS idx_session ON logs(session_id)');

    // 上传会话表
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT,
        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_logs INTEGER,
        error_count INTEGER,
        uid TEXT
      )
    `);

    console.log('数据库表初始化完成');
  });
}

module.exports = db;
