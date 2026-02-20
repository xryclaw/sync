# Task 11: 日志标注与规则管理功能

> **新增功能：** 允许用户对未识别的日志事件进行标注，定义解析规则，实现持续学习和自动分类。

## 功能概述

**核心价值：**
- 系统自动发现未识别的日志模式
- 用户手动标注事件含义（如"进入副本"、"购买道具"）
- 定义匹配规则（正则表达式/关键字）
- 后续日志自动应用规则，持续优化

**工作流程：**
```
1. 上传日志 → 解析存储
2. 系统统计未识别事件模式
3. 用户查看 → 选择事件 → 添加标签 + 规则
4. 规则保存到数据库
5. 新日志上传时自动匹配规则 → 打标签
6. 用户持续标注 → 规则库不断完善
```

---

## 数据库设计

### 新增表结构

**1. event_labels 表（事件标签）**

```sql
CREATE TABLE IF NOT EXISTS event_labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label_name TEXT NOT NULL UNIQUE,        -- 标签名称（如"进入副本"）
  description TEXT,                        -- 标签描述
  color TEXT DEFAULT '#1890ff',           -- 显示颜色
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**2. event_rules 表（匹配规则）**

```sql
CREATE TABLE IF NOT EXISTS event_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label_id INTEGER NOT NULL,              -- 关联标签 ID
  rule_type TEXT NOT NULL,                -- 规则类型: regex/keyword/exact
  rule_pattern TEXT NOT NULL,             -- 匹配模式
  field_name TEXT DEFAULT 'event_name',   -- 匹配字段（event_name/raw_data）
  priority INTEGER DEFAULT 0,             -- 优先级（数字越大越优先）
  enabled INTEGER DEFAULT 1,              -- 是否启用
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (label_id) REFERENCES event_labels(id)
);
```

**3. log_labels 表（日志-标签关联）**

```sql
CREATE TABLE IF NOT EXISTS log_labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,                -- 关联日志 ID
  label_id INTEGER NOT NULL,              -- 关联标签 ID
  matched_rule_id INTEGER,                -- 匹配的规则 ID（NULL 表示手动标注）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (log_id) REFERENCES logs(id),
  FOREIGN KEY (label_id) REFERENCES event_labels(id),
  FOREIGN KEY (matched_rule_id) REFERENCES event_rules(id),
  UNIQUE(log_id, label_id)
);
```

**4. unknown_events 表（未识别事件统计）**

```sql
CREATE TABLE IF NOT EXISTS unknown_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_pattern TEXT NOT NULL UNIQUE,     -- 事件模式（用于分组）
  sample_raw_data TEXT,                   -- 样例原始数据
  occurrence_count INTEGER DEFAULT 1,     -- 出现次数
  first_seen DATETIME,                    -- 首次出现时间
  last_seen DATETIME,                     -- 最后出现时间
  is_labeled INTEGER DEFAULT 0            -- 是否已标注
);
```

---

## Task 11.1: 后端 - 标签管理 API

**Files:**
- Create: `backend/src/routes/labels.js`
- Create: `backend/src/services/labelService.js`
- Modify: `backend/src/config/database.js` (添加新表)

**Step 1: 更新数据库初始化**

在 `backend/src/config/database.js` 的 `initDatabase()` 函数中添加：

```javascript
// 事件标签表
db.run(`
  CREATE TABLE IF NOT EXISTS event_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label_name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#1890ff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 匹配规则表
db.run(`
  CREATE TABLE IF NOT EXISTS event_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL,
    rule_pattern TEXT NOT NULL,
    field_name TEXT DEFAULT 'event_name',
    priority INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (label_id) REFERENCES event_labels(id)
  )
`);

// 日志-标签关联表
db.run(`
  CREATE TABLE IF NOT EXISTS log_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    matched_rule_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_id) REFERENCES logs(id),
    FOREIGN KEY (label_id) REFERENCES event_labels(id),
    FOREIGN KEY (matched_rule_id) REFERENCES event_rules(id),
    UNIQUE(log_id, label_id)
  )
`);

// 未识别事件统计表
db.run(`
  CREATE TABLE IF NOT EXISTS unknown_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_pattern TEXT NOT NULL UNIQUE,
    sample_raw_data TEXT,
    occurrence_count INTEGER DEFAULT 1,
    first_seen DATETIME,
    last_seen DATETIME,
    is_labeled INTEGER DEFAULT 0
  )
`);
```

**Step 2: 创建标签服务**

创建 `backend/src/services/labelService.js`：

```javascript
const db = require('../config/database');

class LabelService {
  /**
   * 创建新标签
   */
  static createLabel(labelName, description, color) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO event_labels (label_name, description, color)
        VALUES (?, ?, ?)
      `;
      
      db.run(sql, [labelName, description, color || '#1890ff'], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, labelName, description, color });
      });
    });
  }

  /**
   * 获取所有标签
   */
  static getAllLabels() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM event_labels ORDER BY created_at DESC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * 创建匹配规则
   */
  static createRule(labelId, ruleType, rulePattern, fieldName, priority) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO event_rules (label_id, rule_type, rule_pattern, field_name, priority)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [labelId, ruleType, rulePattern, fieldName || 'event_name', priority || 0], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  }

  /**
   * 获取标签的所有规则
   */
  static getRulesByLabel(labelId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM event_rules 
        WHERE label_id = ? AND enabled = 1
        ORDER BY priority DESC
      `;
      
      db.all(sql, [labelId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * 手动给日志打标签
   */
  static labelLog(logId, labelId) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR IGNORE INTO log_labels (log_id, label_id)
        VALUES (?, ?)
      `;
      
      db.run(sql, [logId, labelId], function(err) {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  /**
   * 批量给日志打标签
   */
  static batchLabelLogs(logIds, labelId) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT OR IGNORE INTO log_labels (log_id, label_id) VALUES (?, ?)`;
      const stmt = db.prepare(sql);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        logIds.forEach(logId => {
          stmt.run([logId, labelId]);
        });
        
        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve({ labeled: logIds.length });
        });
      });
    });
  }

  /**
   * 根据规则自动标注日志
   */
  static async autoLabelByRules() {
    const labels = await this.getAllLabels();
    let totalLabeled = 0;

    for (const label of labels) {
      const rules = await this.getRulesByLabel(label.id);
      
      for (const rule of rules) {
        const labeled = await this.applyRule(rule, label.id);
        totalLabeled += labeled;
      }
    }

    return { totalLabeled };
  }

  /**
   * 应用单个规则
   */
  static applyRule(rule, labelId) {
    return new Promise((resolve, reject) => {
      let sql;
      
      if (rule.rule_type === 'exact') {
        sql = `
          INSERT OR IGNORE INTO log_labels (log_id, label_id, matched_rule_id)
          SELECT id, ?, ? FROM logs WHERE ${rule.field_name} = ?
        `;
      } else if (rule.rule_type === 'keyword') {
        sql = `
          INSERT OR IGNORE INTO log_labels (log_id, label_id, matched_rule_id)
          SELECT id, ?, ? FROM logs WHERE ${rule.field_name} LIKE ?
        `;
      } else if (rule.rule_type === 'regex') {
        // SQLite 不原生支持正则，需要在应用层处理
        // 这里简化为 LIKE 匹配
        sql = `
          INSERT OR IGNORE INTO log_labels (log_id, label_id, matched_rule_id)
          SELECT id, ?, ? FROM logs WHERE ${rule.field_name} LIKE ?
        `;
      }
      
      const pattern = rule.rule_type === 'keyword' ? `%${rule.rule_pattern}%` : rule.rule_pattern;
      
      db.run(sql, [labelId, rule.id, pattern], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  /**
   * 获取日志的标签
   */
  static getLogLabels(logId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT el.*, ll.matched_rule_id
        FROM log_labels ll
        JOIN event_labels el ON ll.label_id = el.id
        WHERE ll.log_id = ?
      `;
      
      db.all(sql, [logId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = LabelService;
```

**Step 3: 创建标签路由**

创建 `backend/src/routes/labels.js`：

```javascript
const express = require('express');
const router = express.Router();
const LabelService = require('../services/labelService');

/**
 * POST /api/labels
 * 创建新标签
 */
router.post('/', async (req, res) => {
  try {
    const { labelName, description, color } = req.body;
    
    if (!labelName) {
      return res.status(400).json({ error: '标签名称不能为空' });
    }
    
    const result = await LabelService.createLabel(labelName, description, color);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: '创建失败', message: error.message });
  }
});

/**
 * GET /api/labels
 * 获取所有标签
 */
router.get('/', async (req, res) => {
  try {
    const labels = await LabelService.getAllLabels();
    res.json({ success: true, data: labels });
  } catch (error) {
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * POST /api/labels/:labelId/rules
 * 为标签创建匹配规则
 */
router.post('/:labelId/rules', async (req, res) => {
  try {
    const { labelId } = req.params;
    const { ruleType, rulePattern, fieldName, priority } = req.body;
    
    if (!ruleType || !rulePattern) {
      return res.status(400).json({ error: '规则类型和模式不能为空' });
    }
    
    const result = await LabelService.createRule(
      labelId, 
      ruleType, 
      rulePattern, 
      fieldName, 
      priority
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: '创建规则失败', message: error.message });
  }
});

/**
 * GET /api/labels/:labelId/rules
 * 获取标签的所有规则
 */
router.get('/:labelId/rules', async (req, res) => {
  try {
    const { labelId } = req.params;
    const rules = await LabelService.getRulesByLabel(labelId);
    res.json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * POST /api/labels/apply-log
 * 手动给日志打标签
 */
router.post('/apply-log', async (req, res) => {
  try {
    const { logId, labelId } = req.body;
    
    if (!logId || !labelId) {
      return res.status(400).json({ error: '日志 ID 和标签 ID 不能为空' });
    }
    
    await LabelService.labelLog(logId, labelId);
    res.json({ success: true, message: '标注成功' });
  } catch (error) {
    res.status(500).json({ error: '标注失败', message: error.message });
  }
});

/**
 * POST /api/labels/batch-apply
 * 批量给日志打标签
 */
router.post('/batch-apply', async (req, res) => {
  try {
    const { logIds, labelId } = req.body;
    
    if (!logIds || !Array.isArray(logIds) || !labelId) {
      return res.status(400).json({ error: '参数错误' });
    }
    
    const result = await LabelService.batchLabelLogs(logIds, labelId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: '批量标注失败', message: error.message });
  }
});

/**
 * POST /api/labels/auto-apply
 * 根据规则自动标注所有日志
 */
router.post('/auto-apply', async (req, res) => {
  try {
    const result = await LabelService.autoLabelByRules();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: '自动标注失败', message: error.message });
  }
});

/**
 * GET /api/labels/log/:logId
 * 获取日志的所有标签
 */
router.get('/log/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const labels = await LabelService.getLogLabels(logId);
    res.json({ success: true, data: labels });
  } catch (error) {
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

module.exports = router;
```

**Step 4: 在 app.js 中注册路由**

在 `backend/src/app.js` 中添加：

```javascript
app.use('/api/labels', require('./routes/labels'));
```

**Step 5: 测试标签 API**

```bash
# 创建标签
curl -X POST http://localhost:5000/api/labels \
  -H "Content-Type: application/json" \
  -d '{"labelName":"进入副本","description":"玩家进入游戏副本","color":"#52c41a"}'

# 创建规则
curl -X POST http://localhost:5000/api/labels/1/rules \
  -H "Content-Type: application/json" \
  -d '{"ruleType":"keyword","rulePattern":"Dungeon","fieldName":"event_name","priority":10}'

# 自动应用规则
curl -X POST http://localhost:5000/api/labels/auto-apply
```

**Step 6: 提交标签管理功能**

```bash
git add .
git commit -m "feat: 日志标签与规则管理 API"
```

---

## 下一步：前端标注界面

需要我继续写前端的标注管理页面吗？包括：
- 标签管理界面（创建/编辑/删除标签）
- 规则配置界面（添加匹配规则）
- 日志标注界面（查看未识别事件，批量打标签）
- 标签统计看板
