## Task 3: CSV 文件上传功能

**Files:**
- Create: `backend/src/routes/upload.js`
- Create: `backend/src/middleware/fileUpload.js`
- Create: `backend/src/services/csvParser.js`
- Test: `backend/src/routes/upload.test.js`

**Step 1: 创建文件上传中间件**

```javascript
// backend/src/middleware/fileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
    cb(null, true);
  } else {
    cb(new Error('只支持 CSV 文件格式'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

module.exports = upload;
```

**Step 2: 创建 CSV 解析服务**

```javascript
// backend/src/services/csvParser.js
const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/database');

class CSVParser {
  /**
   * 解析 CSV 文件并存入数据库
   * @param {string} filePath - CSV 文件路径
   * @param {string} sessionName - 分析会话名称
   * @returns {Promise<Object>} 解析结果统计
   */
  static async parseAndStore(filePath, sessionName) {
    return new Promise((resolve, reject) => {
      const logs = [];
      const stats = {
        total: 0,
        errors: 0,
        uniqueUsers: new Set()
      };

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            const logEntry = this.parseLogRow(row);
            logs.push(logEntry);
            stats.total++;
            stats.uniqueUsers.add(logEntry.uid);
            
            if (logEntry.event_type === 'error') {
              stats.errors++;
            }
          } catch (err) {
            console.error('解析行失败:', err.message);
          }
        })
        .on('end', async () => {
          try {
            // 创建分析会话
            const sessionId = await this.createSession(sessionName, filePath, stats);
            
            // 批量插入日志
            await this.batchInsertLogs(logs);
            
            resolve({
              sessionId,
              totalLogs: stats.total,
              uniqueUsers: stats.uniqueUsers.size,
              errorCount: stats.errors
            });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', reject);
    });
  }

  /**
   * 解析单行日志
   */
  static parseLogRow(row) {
    // 示例日志格式：
    // resp:MainUIChatSubMediator OnItemClick--------------
    // Drag stack:EMPTY
    // uid:1828911786474
    // _datetime_:2026-02-12T18:33:35.7421010-08:00
    
    const respMatch = row.resp || row.message || '';
    const eventName = respMatch.split(' ')[0] || 'unknown';
    
    return {
      uid: row.uid || '',
      sid: row.sid || '',
      event_type: row.level || 'info',
      event_name: eventName,
      datetime: row._datetime_ || row.datetime || new Date().toISOString(),
      store: row.store || '',
      pack_version: row.packVer || '',
      client_version: row.clientVer || '',
      raw_data: JSON.stringify(row)
    };
  }

  /**
   * 创建分析会话
   */
  static createSession(sessionName, fileName, stats) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO analysis_sessions (session_name, file_name, total_logs, unique_users, error_count)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        sessionName,
        fileName,
        stats.total,
        stats.uniqueUsers.size,
        stats.errors
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  /**
   * 批量插入日志
   */
  static batchInsertLogs(logs) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO logs (uid, sid, event_type, event_name, datetime, store, pack_version, client_version, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = db.prepare(sql);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        logs.forEach(log => {
          stmt.run([
            log.uid,
            log.sid,
            log.event_type,
            log.event_name,
            log.datetime,
            log.store,
            log.pack_version,
            log.client_version,
            log.raw_data
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

**Step 3: 创建上传路由**

```javascript
// backend/src/routes/upload.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const CSVParser = require('../services/csvParser');
const fs = require('fs');

/**
 * POST /api/upload
 * 上传 CSV 文件并解析
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const { sessionName } = req.body;
    if (!sessionName) {
      return res.status(400).json({ error: '缺少会话名称' });
    }

    console.log(`开始解析文件: ${req.file.originalname}`);
    
    const result = await CSVParser.parseAndStore(req.file.path, sessionName);
    
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      message: '文件上传并解析成功',
      data: result
    });
  } catch (error) {
    console.error('上传处理失败:', error);
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '文件处理失败', 
      message: error.message 
    });
  }
});

/**
 * GET /api/upload/sessions
 * 获取所有分析会话列表
 */
router.get('/sessions', (req, res) => {
  const db = require('../config/database');
  
  db.all('SELECT * FROM analysis_sessions ORDER BY upload_time DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '查询失败', message: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

module.exports = router;
```

**Step 4: 在 app.js 中注册路由**

```javascript
// 在 backend/src/app.js 中添加
app.use('/api/upload', require('./routes/upload'));
```

**Step 5: 测试上传功能**

使用 curl 测试：
```bash
curl -X POST http://localhost:5000/api/upload \
  -F "file=@test.csv" \
  -F "sessionName=测试会话"
```

预期响应：
```json
{
  "success": true,
  "message": "文件上传并解析成功",
  "data": {
    "sessionId": 1,
    "totalLogs": 150,
    "uniqueUsers": 5,
    "errorCount": 3
  }
}
```

**Step 6: 提交上传功能**

```bash
git add .
git commit -m "feat: CSV 文件上传和解析功能"
```

---

