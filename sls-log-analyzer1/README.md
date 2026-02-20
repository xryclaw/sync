# SLS 日志分析平台 - MVP

## 功能
- CSV 日志文件上传
- 日志表格展示
- 时间范围筛选
- 日志级别筛选（Info/Error）
- 查看原始日志详情

## 技术栈
- 后端：Node.js + Express + SQLite
- 前端：React + Ant Design + Vite

## 🚀 快速开始（推荐）

### 一键启动
```powershell
.\start.ps1
```

启动后访问：
- 前端：http://localhost:5173
- 后端：http://localhost:3000

### 其他命令
```powershell
.\stop.ps1      # 停止服务
.\restart.ps1   # 重启服务
.\status.ps1    # 查看状态
```

详细说明请查看 [SCRIPTS_GUIDE.md](./SCRIPTS_GUIDE.md)

## 📦 手动启动（开发模式）

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

## 📖 文档

- [脚本使用指南](./SCRIPTS_GUIDE.md) - 一键启动/停止脚本详细说明
- [开发报告](./DEVELOPMENT_REPORT.md) - 项目开发过程记录
- [设计文档](./docs/plans/) - MVP 设计与实施计划
