# SLS 日志分析平台 - MVP 实施计划

> **For Claude:** 本计划基于 writing-plans 技能创建，用于指导 MVP 版本的逐步实施。

**目标：** 构建一个极简的日志分析工具，支持 CSV 上传、日志查询、表格展示和筛选功能。

**架构：** 后端使用 Node.js + Express + SQLite；前端使用 React + Vite + Ant Design；本地运行，无需 Docker。

**技术栈：**
- 后端：Node.js 20 + Express 4 + SQLite3 + Multer + csv-parser
- 前端：React 18 + Vite + Ant Design 5 + Axios
- 数据库：SQLite3（本地文件）

---

## 实施任务清单

### ✅ Task 0: 设计文档（已完成）
### 📝 Task 1: 项目初始化
### 📝 Task 2: 后端数据库设计
### 📝 Task 3: CSV 上传功能
### 📝 Task 4: 日志查询 API
### 📝 Task 5: 前端项目初始化
### 📝 Task 6: 上传页面
### 📝 Task 7: 日志查看页面
### 📝 Task 8: 测试与优化

---

## Task 1: 项目初始化

**Files:**
- Create: `sls-log-analyzer/README.md`
- Create: `sls-log-analyzer/.gitignore`
- Create: `sls-log-analyzer/backend/package.json`
- Create: `sls-log-analyzer/frontend/package.json`

**Step 1: 创建项目根目录**

```bash
mkdir sls-log-analyzer
cd sls-log-analyzer
```

**Step 2: 初始化 Git 仓库**

```bash
git init
```

**Step 3: 创建 .gitignore**

```gitignore
# Dependencies
node_modules/
npm-debug.log*

# Database
*.db
*.sqlite
*.sqlite3

# Uploads
uploads/
temp/

# Environment
.env
.env.local

# Build
dist/
build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

**Step 4: 创建 README.md**

```markdown
# SLS 日志分析平台 - MVP

## 功能
- CSV 日志文件上传
- 日志表格展示
- 时间范围筛选
- 日志级别筛选（Info/Error）
- 查看原始日志详情

## 技术栈
- 后端：Node.js + Express + SQLite
- 前端：React + Ant Design

## 快速开始

### 后端
```bash
cd backend
npm install
npm run dev
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

访问：http://localhost:3000
```

**Step 5: 创建后端目录结构**

```bash
mkdir -p backend/src/routes
mkdir -p backend/src/services
mkdir -p backend/database
mkdir -p backend/uploads
```

**Step 6: 初始化后端 package.json**

```bash
cd backend
npm init -y
```

修改 `backend/package.json`：

```json
{
  "name": "sls-log-analyzer-backend",
  "version": "1.0.0",
  "description": "SLS 日志分析平台后端",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "csv-parser": "^3.0.0",
    "sqlite3": "^5.1.6",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

**Step 7: 安装后端依赖**

```bash
npm install
```

**Step 8: 创建前端项目**

```bash
cd ..
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

**Step 9: 安装前端依赖**

```bash
npm install antd axios react-router-dom dayjs
```

**Step 10: 提交初始化**

```bash
cd ..
git add .
git commit -m "chore: 项目初始化"
```

---

## Task 2: 后端数据库设计

**Files:**
- Create: `backend/src/db.js`
- Create: `backend/.env.example`

**Step 1: 创建 .env.example**

```env
PORT=5000
NODE_ENV=development
DATABASE_PATH=./database/logs.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
```

**Step 2: 创建数据库初始化文件**

创建 `backend/src/db.js`：

```javascript
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
```

**Step 3: 测试数据库初始化**

创建临时测试文件 `backend/test-db.js`：

```javascript
require('dotenv').config();
const db = require('./src/db');

setTimeout(() => {
  db.all('SELECT name FROM sqlite_master WHERE type="table"', [], (err, rows) => {
    if (err) {
      console.error('查询失败:', err);
    } else {
      console.log('数据库表:', rows);
    }
    db.close();
  });
}, 1000);
```

运行测试：

```bash
node test-db.js
```

预期输出：
```
SQLite 数据库连接成功: ./database/logs.db
数据库表初始化完成
数据库表: [ { name: 'logs' }, { name: 'sessions' } ]
```

**Step 4: 删除测试文件**

```bash
rm test-db.js
```

**Step 5: 提交数据库设计**

```bash
git add .
git commit -m "feat: 数据库设计与初始化"
```

---

## Task 3: CSV 上传功能

**Files:**
- Create: `backend/src/services/csvParser.js`
- Create: `backend/src/routes/upload.js`
- Create: `backend/src/app.js`

**Step 1: 创建 CSV 解析服务**

创建 `backend/src/services/csvParser.js`：

```javascript
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../db');

class CSVParser {
  static async parseAndStore(filePath, fileName) {
    return new Promise((resolve, reject) => {
      const logs = [];
      let errorCount = 0;
      let uid = null;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // 提取 uid（取第一条的 uid）
            if (!uid && row.uid) {
              uid = row.uid;
            }

            // 统计 error
            if (row._level_ && row._level_.toLowerCase() === 'error') {
              errorCount++;
            }

            logs.push({
              uid: row.uid || '',
              datetime: row._datetime_ || '',
              level: row._level_ || 'Info',
              resp: row.resp || '',
              sid: row.sid || '',
              device: row.device || '',
              client_ver: row.clientVer || '',
              pack_ver: row.packVer || '',
              country: row.country || '',
              store: row.store || '',
              raw_json: JSON.stringify(row)
            });
          } catch (err) {
            console.error('解析行失败:', err.message);
          }
        })
        .on('end', async () => {
          try {
            // 创建会话
            const sessionId = await this.createSession(fileName, logs.length, errorCount, uid);
            
            // 批量插入日志
            await this.batchInsertLogs(logs, sessionId);
            
            resolve({
              sessionId,
              totalLogs: logs.length,
              errorCount,
              uid
            });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', reject);
    });
  }

  static createSession(fileName, totalLogs, errorCount, uid) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO sessions (file_name, total_logs, error_count, uid)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(sql, [fileName, totalLogs, errorCount, uid], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  static batchInsertLogs(logs, sessionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO logs (session_id, uid, datetime, level, resp, sid, device, client_ver, pack_ver, country, store, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = db.prepare(sql);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        logs.forEach(log => {
          stmt.run([
            sessionId,
            log.uid,
            log.datetime,
            log.level,
            log.resp,
            log.sid,
            log.device,
            log.client_ver,
            log.pack_ver,
            log.country,
            log.store,
            log.raw_json
          ]);
        });
        
        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
}

module.exports = CSVParser;
```

**Step 2: 创建上传路由**

创建 `backend/src/routes/upload.js`：

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CSVParser = require('../services/csvParser');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('只支持 CSV 文件'), false);
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    console.log('开始解析文件:', req.file.originalname);
    
    const result = await CSVParser.parseAndStore(req.file.path, req.file.originalname);
    
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      message: '文件上传并解析成功',
      data: result
    });
  } catch (error) {
    console.error('上传处理失败:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '文件处理失败', 
      message: error.message 
    });
  }
});

router.get('/sessions', (req, res) => {
  const db = require('../db');
  
  db.all('SELECT * FROM sessions ORDER BY upload_time DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '查询失败', message: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

module.exports = router;
```

**Step 3: 创建主应用文件**

创建 `backend/src/app.js`：

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 路由
app.use('/api/upload', require('./routes/upload'));

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '服务器内部错误', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
```

**Step 4: 创建 .env 文件**

```bash
cp .env.example .env
```

**Step 5: 测试后端启动**

```bash
npm run dev
```

预期输出：
```
SQLite 数据库连接成功: ./database/logs.db
数据库表初始化完成
后端服务运行在 http://localhost:5000
```

**Step 6: 提交上传功能**

```bash
git add .
git commit -m "feat: CSV 上传功能"
```

---

