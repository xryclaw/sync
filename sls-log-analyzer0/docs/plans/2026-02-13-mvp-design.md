# SLS 日志分析平台 - MVP 设计文档

**创建时间：** 2026-02-13  
**设计方法：** 使用 brainstorming 技能通过对话式需求分析完成

---

## 📋 需求总结

### 核心问题
- 每天手动查阅阿里云 SLS 日志，分析玩家行为，定位 bug 触发路径
- 日志包含大量 info 和 error 打点，需要追溯 bug 前的操作序列
- 很多日志无法判断含义，需要持续标注和学习

### 关键决策
1. **主要场景**：事后调查型 - 快速定位单个玩家问题
2. **展示方式**：表格列表（数据与显示分离，预留扩展接口）
3. **开发策略**：MVP 优先 - 先做查询分析，标注功能后续迭代
4. **数据格式**：标准 CSV（第一行列名，包含 uid、_datetime_、resp、_level_ 等字段）
5. **部署方式**：本地运行（Windows），验证后再考虑服务器部署
6. **数据来源**：CSV 已经是单个玩家的筛选数据，不需要按 uid 查询

---

## 🎯 MVP 功能范围

### 核心流程
```
上传 CSV（单个玩家数据）→ 解析存储 → 表格展示全部日志 → 筛选 error/时间范围
```

### 必需功能
1. CSV 文件上传（单个玩家）
2. 表格展示所有日志
3. 时间范围筛选
4. 按日志级别筛选（Info/Error）
5. 查看原始日志详情
6. 数据结构预留多用户支持（uid 字段保留）

### 暂不实现
- ❌ 日志标注功能
- ❌ 规则引擎
- ❌ 可视化图表（时间线、流程图）
- ❌ 多用户权限管理
- ❌ Docker 部署

---

## 🏗️ 技术架构

### 技术选型
- **后端**：Node.js 20 + Express 4 + SQLite3
- **前端**：React 18 + Vite + Ant Design 5
- **数据库**：SQLite（轻量级，无需安装）
- **部署**：本地运行（npm run dev）

### 数据流
```
CSV 文件 → Multer 接收 → csv-parser 解析 → SQLite 存储 → REST API 查询 → 前端表格展示
```

### 架构优势
- SQLite 无需安装，数据文件在本地，方便备份
- 数据与显示分离：后端只提供 JSON API，前端可以随时换成图表视图
- 保留 uid 字段：虽然当前是单人数据，但数据结构支持后续多人分析

---

## 💾 数据库设计

### logs 表（核心）
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,                    -- 关联上传会话
  uid TEXT,                              -- 用户 ID
  datetime TEXT NOT NULL,                -- 时间戳（_datetime_）
  level TEXT,                            -- 日志级别（_level_）
  resp TEXT,                             -- 事件内容
  sid TEXT,                              -- 会话 ID
  device TEXT,                           -- 设备型号
  client_ver TEXT,                       -- 客户端版本
  pack_ver TEXT,                         -- 包版本
  country TEXT,                          -- 国家
  store TEXT,                            -- 商店渠道
  raw_json TEXT,                         -- 完整原始数据（JSON）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_datetime ON logs(datetime);
CREATE INDEX idx_level ON logs(level);
CREATE INDEX idx_session ON logs(session_id);
```

### sessions 表（上传记录）
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT,                        -- 原始文件名
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_logs INTEGER,                    -- 日志总数
  error_count INTEGER,                   -- error 数量
  uid TEXT                               -- 主要用户 ID（从数据中提取）
);
```

### 设计要点
- `raw_json` 保存完整原始数据，方便后续扩展字段
- 索引优化查询性能（按时间、级别筛选）
- `session_id` 关联：支持查看"这次上传的所有日志"

---

## 🔌 后端 API 设计

### 1. 上传 CSV
```
POST /api/upload
Content-Type: multipart/form-data

Body:
  file: <CSV 文件>

Response:
{
  "success": true,
  "data": {
    "sessionId": 1,
    "totalLogs": 150,
    "errorCount": 5,
    "uid": "1438618757466"
  }
}
```

### 2. 获取日志列表
```
GET /api/logs?sessionId=1&level=Error&startTime=xxx&endTime=xxx&keyword=xxx

Response:
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "datetime": "2026-02-13T14:26:41.6590370+09:00",
        "level": "Info",
        "resp": "ServerTimeSync: deltaTime: 235...",
        "device": "iPhone15,4",
        "client_ver": "1.92.21.2152"
      }
    ],
    "total": 150
  }
}
```

### 3. 获取日志详情
```
GET /api/logs/:id

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "datetime": "2026-02-13T14:26:41.6590370+09:00",
    "level": "Info",
    "resp": "ServerTimeSync...",
    "raw_json": "{...}"  // 完整原始数据
  }
}
```

### 4. 获取上传历史
```
GET /api/sessions

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "file_name": "player_1438618757466.csv",
      "upload_time": "2026-02-13T13:45:00Z",
      "total_logs": 150,
      "error_count": 5,
      "uid": "1438618757466"
    }
  ]
}
```

### 关键实现
- CSV 解析：使用 `csv-parser` 流式读取，避免大文件内存溢出
- 批量插入：使用事务（BEGIN/COMMIT）提升性能
- 分页查询：支持 `limit` 和 `offset` 参数（预留）

### 错误处理
- CSV 格式错误 → 返回 400 + 错误提示
- 文件过大（>50MB）→ 返回 413
- 数据库错误 → 返回 500 + 日志记录

---

## 🎨 前端界面设计

### 页面结构（单页应用）

#### 1. 上传页面（首页）
- **拖拽上传区域**（Ant Design Upload.Dragger）
  - 支持点击选择文件
  - 支持拖拽上传
  - 显示上传进度
- **上传历史列表**（Table 组件）
  - 列：文件名、上传时间、日志数、错误数、用户 ID
  - 点击行 → 跳转到日志查看页

#### 2. 日志查看页
- **顶部筛选栏**
  - 时间范围选择器（DatePicker.RangePicker）
  - 日志级别下拉框（All / Info / Error）
  - 关键字搜索框（搜索 resp 字段）
  - 筛选按钮 + 重置按钮
  
- **日志表格**（Table 组件）
  - 列：时间、级别、事件内容（resp）、设备、版本
  - Error 行高亮显示（红色背景）
  - 支持按时间排序
  - 点击行 → 展开详情抽屉
  
- **详情抽屉**（Drawer 组件）
  - 显示完整原始数据（JSON 格式化）
  - 复制按钮（一键复制 JSON）
  - 关闭按钮

### 交互细节
- 表格支持排序（按时间）
- Error 日志默认置顶显示
- 加载状态提示（Spin 组件）
- 空数据提示（Empty 组件）
- 上传成功后自动跳转到日志查看页

### 设计理由
- 单页应用简单直接，无需复杂路由
- Ant Design 组件开箱即用，快速搭建
- 表格 + 抽屉模式：列表浏览 + 详情查看，符合日志分析习惯

---

## 📁 项目结构

```
sls-log-analyzer/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express 主应用
│   │   ├── db.js               # SQLite 数据库初始化
│   │   ├── routes/
│   │   │   ├── upload.js       # 上传路由
│   │   │   └── logs.js         # 日志查询路由
│   │   └── services/
│   │       └── csvParser.js    # CSV 解析逻辑
│   ├── database/               # SQLite 数据库文件
│   ├── uploads/                # 临时上传目录
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # 主应用
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx  # 上传页面
│   │   │   └── LogsPage.jsx    # 日志查看页面
│   │   ├── components/
│   │   │   └── Layout.jsx      # 布局组件
│   │   └── services/
│   │       └── api.js          # API 调用封装
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 启动流程

### 开发环境
```bash
# 1. 安装依赖
cd backend && npm install
cd frontend && npm install

# 2. 启动后端（端口 5000）
cd backend && npm run dev

# 3. 启动前端（端口 3000）
cd frontend && npm run dev

# 4. 浏览器访问 http://localhost:3000
```

### 依赖包清单

**后端：**
```json
{
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

**前端：**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "antd": "^5.12.0",
    "axios": "^1.6.2",
    "dayjs": "^1.11.10"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

---

## ⏱️ 开发时间估算

- **后端开发**：4-6 小时
  - 数据库初始化：1 小时
  - CSV 解析服务：2 小时
  - API 路由：1-2 小时
  - 测试调试：1 小时

- **前端开发**：4-6 小时
  - 项目初始化：1 小时
  - 上传页面：1-2 小时
  - 日志查看页面：2-3 小时
  - 样式调整：1 小时

- **测试调试**：2-3 小时
  - 功能测试：1 小时
  - 边界情况测试：1 小时
  - 性能优化：1 小时

**总计：10-15 小时**

---

## 🔮 后续扩展方向

### 第二阶段（标注功能）
- 日志标签管理
- 规则引擎（正则/关键字匹配）
- 自动标注 + 手动标注
- 标注数据持久化

### 第三阶段（可视化）
- 时间线图表（ECharts）
- 流程图视图
- 异常模式识别
- 对比分析（正常 vs 异常用户）

### 第四阶段（团队协作）
- 多用户权限管理
- Docker 部署
- 数据隔离
- 协作标注

---

## ✅ 设计验证

### 核心价值验证
- ✅ 快速上传 CSV，立即查看日志
- ✅ 筛选 error 日志，快速定位问题
- ✅ 查看完整原始数据，不丢失信息
- ✅ 数据结构预留扩展，支持后续迭代

### YAGNI 原则
- ✅ 只做必需功能，不过度设计
- ✅ 数据与显示分离，方便后续扩展
- ✅ 本地运行，快速验证价值

---

**设计完成时间：** 2026-02-13  
**下一步：** 使用 writing-plans 技能生成详细实施计划
