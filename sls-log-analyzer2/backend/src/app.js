const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/database');

dotenv.config(); // 加载 .env 文件中的环境变量

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // 启用 CORS
app.use(express.json()); // 解析 JSON 格式的请求体

const uploadRoutes = require('./routes/upload');

// Database initialization
db.initDatabase().catch(err => {
  console.error('Failed to initialize database:', err.message);
  process.exit(1); // 数据库初始化失败，退出应用
});

// Routes
app.use('/api/upload', uploadRoutes); // 注册上传路由
app.get('/', (req, res) => {
  res.status(200).json({ message: 'SLS Log Analyzer Backend is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
