# SLS 日志分析平台 - 完整实施计划

> **For Claude:** 本计划基于 writing-plans 技能创建，用于指导 Web 可视化日志分析平台的开发。

**目标：** 构建一个 Web 平台，通过上传 CSV 日志文件，自动解析玩家行为链路，可视化展示操作时间线，并识别 bug 触发前的异常模式。

**架构：** 前端使用 React + Ant Design + ECharts 实现文件上传和可视化；后端使用 Node.js + Express 处理 CSV 解析和数据分析；数据存储使用 SQLite 本地数据库；部署采用 Docker 容器化方案。

**技术栈：**
- 前端：React 18 + Vite + Ant Design 5 + ECharts 5 + Axios
- 后端：Node.js 20 + Express 4 + Multer + csv-parser
- 数据库：SQLite3
- 部署：Docker + Docker Compose

---

## 项目结构

```
sls-log-analyzer/
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/      # 组件
│   │   ├── pages/           # 页面
│   │   ├── services/        # API 调用
│   │   └── utils/           # 工具函数
│   ├── package.json
│   └── vite.config.js
├── backend/                  # Node.js 后端
│   ├── src/
│   │   ├── routes/          # 路由
│   │   ├── services/        # 业务逻辑
│   │   ├── models/          # 数据模型
│   │   └── utils/           # 工具函数
│   ├── uploads/             # 临时上传目录
│   ├── database/            # SQLite 数据库
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 实施任务清单

### ✅ Task 1: 项目初始化
### ✅ Task 2: 后端基础架构
### ✅ Task 3: CSV 文件上传功能
### 🔄 Task 4: 玩家行为分析 API
### 📝 Task 5: 前端项目初始化
### 📝 Task 6: 文件上传页面
### 📝 Task 7: 时间线可视化组件
### 📝 Task 8: 异常分析页面
### 📝 Task 9: Docker 部署配置
### 📝 Task 10: 测试与优化

---

## Task 4: 玩家行为分析 API

**Files:**
- Create: `backend/src/routes/analysis.js`
- Create: `backend/src/services/behaviorAnalyzer.js`

**Step 1: 创建行为分析服务**

创建文件 `backend/src/services/behaviorAnalyzer.js`：

```javascript
const db = require('../config/database');

class BehaviorAnalyzer {
  /**
   * 获取指定用户的行为时间线
   */
  static getUserTimeline(uid, startTime, endTime) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM logs 
        WHERE uid = ? 
        AND datetime BETWEEN ? AND ?
        ORDER BY datetime ASC
      `;
      
      db.all(sql, [uid, startTime, endTime], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * 查找 error 前的操作序列
   */
  static async getErrorContext(uid, beforeMinutes = 5) {
    return new Promise((resolve, reject) => {
      const sql = `
        WITH error_logs AS (
          SELECT id, datetime, event_name, raw_data
          FROM logs
          WHERE uid = ? AND event_type = 'error'
          ORDER BY datetime DESC
        )
        SELECT 
          e.id as error_id,
          e.datetime as error_time,
          e.event_name as error_event,
          l.*
        FROM error_logs e
        LEFT JOIN logs l ON l.uid = ?
        WHERE l.datetime BETWEEN 
          datetime(e.datetime, '-' || ? || ' minutes') 
          AND e.datetime
        ORDER BY e.datetime DESC, l.datetime ASC
      `;
      
      db.all(sql, [uid, uid, beforeMinutes], (err, rows) => {
        if (err) reject(err);
        else {
          const grouped = this.groupByError(rows);
          resolve(grouped);
        }
      });
    });
  }

  /**
   * 按 error 分组操作序列
   */
  static groupByError(rows) {
    const result = [];
    let currentError = null;
    let currentSequence = [];

    rows.forEach(row => {
      if (row.error_id !== currentError) {
        if (currentError !== null) {
          result.push({
            errorId: currentError,
            errorTime: currentSequence[0].error_time,
            errorEvent: currentSequence[0].error_event,
            beforeActions: currentSequence
          });
        }
        currentError = row.error_id;
        currentSequence = [];
      }
      currentSequence.push(row);
    });

    if (currentSequence.length > 0) {
      result.push({
        errorId: currentError,
        errorTime: currentSequence[0].error_time,
        errorEvent: currentSequence[0].error_event,
        beforeActions: currentSequence
      });
    }

    return result;
  }

  /**
   * 统计用户行为模式
   */
  static async getUserBehaviorStats(uid) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          event_name,
          COUNT(*) as count,
          MIN(datetime) as first_occurrence,
          MAX(datetime) as last_occurrence
        FROM logs
        WHERE uid = ?
        GROUP BY event_name
        ORDER BY count DESC
      `;
      
      db.all(sql, [uid], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = BehaviorAnalyzer;
```

**Step 2: 创建分析路由**

创建文件 `backend/src/routes/analysis.js`：

```javascript
const express = require('express');
const router = express.Router();
const BehaviorAnalyzer = require('../services/behaviorAnalyzer');

/**
 * GET /api/analysis/timeline/:uid
 * 获取用户行为时间线
 */
router.get('/timeline/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { startTime, endTime } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ error: '缺少时间范围参数' });
    }
    
    const timeline = await BehaviorAnalyzer.getUserTimeline(uid, startTime, endTime);
    
    res.json({
      success: true,
      data: {
        uid,
        totalEvents: timeline.length,
        timeline
      }
    });
  } catch (error) {
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * GET /api/analysis/error-context/:uid
 * 获取 error 前的操作上下文
 */
router.get('/error-context/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { beforeMinutes = 5 } = req.query;
    
    const context = await BehaviorAnalyzer.getErrorContext(uid, parseInt(beforeMinutes));
    
    res.json({
      success: true,
      data: {
        uid,
        errorCount: context.length,
        contexts: context
      }
    });
  } catch (error) {
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

/**
 * GET /api/analysis/stats/:uid
 * 获取用户行为统计
 */
router.get('/stats/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const stats = await BehaviorAnalyzer.getUserBehaviorStats(uid);
    
    res.json({
      success: true,
      data: {
        uid,
        behaviorPatterns: stats
      }
    });
  } catch (error) {
    res.status(500).json({ error: '查询失败', message: error.message });
  }
});

module.exports = router;
```

**Step 3: 在 app.js 中注册分析路由**

在 `backend/src/app.js` 中添加：

```javascript
app.use('/api/analysis', require('./routes/analysis'));
```

**Step 4: 测试分析 API**

运行后端：
```bash
cd backend
npm run dev
```

测试命令（使用 PowerShell）：
```powershell
# 测试时间线查询
curl "http://localhost:5000/api/analysis/timeline/1828911786474?startTime=2026-02-12T00:00:00Z`&endTime=2026-02-13T00:00:00Z"

# 测试 error 上下文
curl "http://localhost:5000/api/analysis/error-context/1828911786474?beforeMinutes=10"

# 测试行为统计
curl "http://localhost:5000/api/analysis/stats/1828911786474"
```

预期响应示例：
```json
{
  "success": true,
  "data": {
    "uid": "1828911786474",
    "totalEvents": 45,
    "timeline": [...]
  }
}
```

**Step 5: 提交分析功能**

```bash
git add .
git commit -m "feat: 玩家行为分析 API"
```

---

## Task 5: 前端项目初始化

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`

**Step 1: 创建前端目录**

```bash
mkdir frontend
cd frontend
```

**Step 2: 初始化 Vite + React 项目**

```bash
npm create vite@latest . -- --template react
```

**Step 3: 安装依赖**

```bash
npm install
npm install antd echarts echarts-for-react axios dayjs
```

**Step 4: 配置 vite.config.js**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
```

**Step 5: 创建主应用文件**

创建 `frontend/src/App.jsx`：

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Layout from './components/Layout';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/analysis/:uid" element={<AnalysisPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
```

**Step 6: 安装路由**

```bash
npm install react-router-dom
```

**Step 7: 测试前端启动**

```bash
npm run dev
```

预期输出：
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

**Step 8: 提交前端初始化**

```bash
git add .
git commit -m "feat: 前端项目初始化"
```

---

## Task 6: 文件上传页面

**Files:**
- Create: `frontend/src/pages/UploadPage.jsx`
- Create: `frontend/src/services/api.js`
- Create: `frontend/src/components/Layout.jsx`

**Step 1: 创建 API 服务**

创建 `frontend/src/services/api.js`：

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const uploadCSV = (file, sessionName) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionName', sessionName);
  
  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const getSessions = () => {
  return api.get('/upload/sessions');
};

export const getUserTimeline = (uid, startTime, endTime) => {
  return api.get(`/analysis/timeline/${uid}`, {
    params: { startTime, endTime }
  });
};

export const getErrorContext = (uid, beforeMinutes = 5) => {
  return api.get(`/analysis/error-context/${uid}`, {
    params: { beforeMinutes }
  });
};

export const getUserStats = (uid) => {
  return api.get(`/analysis/stats/${uid}`);
};

export default api;
```

**Step 2: 创建布局组件**

创建 `frontend/src/components/Layout.jsx`：

```jsx
import { Layout as AntLayout, Menu } from 'antd';
import { UploadOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Content } = AntLayout;

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <UploadOutlined />,
      label: '上传日志'
    },
    {
      key: '/sessions',
      icon: <BarChartOutlined />,
      label: '分析会话'
    }
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ color: 'white', fontSize: '20px', marginRight: '50px' }}>
          SLS 日志分析平台
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content style={{ padding: '24px' }}>
        {children}
      </Content>
    </AntLayout>
  );
}

export default Layout;
```

**Step 3: 创建上传页面**

创建 `frontend/src/pages/UploadPage.jsx`：

```jsx
import { useState } from 'react';
import { Upload, Button, Input, Card, message, Table } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { uploadCSV, getSessions } from '../services/api';

const { Dragger } = Upload;

function UploadPage() {
  const [sessionName, setSessionName] = useState('');
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sessions, setSessions] = useState([]);

  const handleUpload = async () => {
    if (!sessionName) {
      message.error('请输入会话名称');
      return;
    }
    
    if (fileList.length === 0) {
      message.error('请选择文件');
      return;
    }

    setUploading(true);
    
    try {
      const response = await uploadCSV(fileList[0], sessionName);
      message.success('上传成功！');
      console.log('解析结果:', response.data);
      
      // 清空表单
      setFileList([]);
      setSessionName('');
      
      // 刷新会话列表
      loadSessions();
    } catch (error) {
      message.error('上传失败: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await getSessions();
      setSessions(response.data.data);
    } catch (error) {
      message.error('加载会话列表失败');
    }
  };

  const uploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      setFileList([file]);
      return false;
    },
    fileList,
    accept: '.csv'
  };

  const columns = [
    {
      title: '会话名称',
      dataIndex: 'session_name',
      key: 'session_name'
    },
    {
      title: '文件名',
      dataIndex: 'file_name',
      key: 'file_name'
    },
    {
      title: '日志总数',
      dataIndex: 'total_logs',
      key: 'total_logs'
    },
    {
      title: '用户数',
      dataIndex: 'unique_users',
      key: 'unique_users'
    },
    {
      title: '错误数',
      dataIndex: 'error_count',
      key: 'error_count'
    },
    {
      title: '上传时间',
      dataIndex: 'upload_time',
      key: 'upload_time'
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card title="上传 CSV 日志文件" style={{ marginBottom: 24 }}>
        <Input
          placeholder="输入会话名称"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 CSV 格式，最大 50MB
          </p>
        </Dragger>
        
        <Button
          type="primary"
          onClick={handleUpload}
          loading={uploading}
          style={{ marginTop: 16 }}
          icon={<UploadOutlined />}
        >
          {uploading ? '上传中...' : '开始上传'}
        </Button>
      </Card>

      <Card title="历史会话">
        <Button onClick={loadSessions} style={{ marginBottom: 16 }}>
          刷新列表
        </Button>
        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="id"
        />
      </Card>
    </div>
  );
}

export default UploadPage;
```

**Step 4: 测试上传页面**

启动前后端：
```bash
# 终端 1 - 后端
cd backend
npm run dev

# 终端 2 - 前端
cd frontend
npm run dev
```

访问 http://localhost:3000，测试文件上传功能。

**Step 5: 提交上传页面**

```bash
git add .
git commit -m "feat: 文件上传页面"
```

---

## 后续任务概要

### Task 7: 时间线可视化组件
- 使用 ECharts 绘制时间线图
- 支持缩放、筛选、高亮 error 事件
- 显示详细事件信息

### Task 8: 异常分析页面
- 展示 error 前的操作序列
- 对比正常/异常用户行为
- 生成分析报告

### Task 9: Docker 部署配置
- 编写 Dockerfile（前端 + 后端）
- 配置 docker-compose.yml
- 数据持久化配置

### Task 10: 测试与优化
- 单元测试
- 性能优化（大文件处理）
- 错误处理完善

---

## 执行建议

**计划已保存到：** `docs/plans/2026-02-13-sls-log-analyzer-complete.md`

**两种执行方式：**

1. **子代理驱动（推荐）** - 在当前会话中，每个任务派发一个子代理执行，任务间人工审查
2. **手动执行** - 按照计划逐步实施，每完成一个 Task 提交一次

**下一步：** 
- 如果选择子代理驱动，我可以立即开始执行 Task 1
- 如果手动执行，可以从 Task 1 开始按步骤操作

需要我开始执行吗？
