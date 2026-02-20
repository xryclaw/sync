# SLS 日志分析平台

## 项目简介

一个用于分析阿里云 SLS 日志的 Web 平台，帮助快速定位玩家行为问题和 bug 触发路径。

## 功能特性

- CSV 日志文件上传
- 日志表格展示
- 时间范围筛选
- 日志级别筛选（Info/Error）
- 查看原始日志详情

## 技术栈

- **后端**：Node.js 20 + Express 4 + SQLite3
- **前端**：React 18 + Vite + Ant Design 5
- **数据库**：SQLite（本地文件）

## 项目状态

🚧 **开发中** - MVP 阶段

## 文档

- [MVP 设计文档](docs/plans/2026-02-13-mvp-design.md)
- [实施计划](docs/plans/2026-02-13-mvp-implementation.md)
- [日志标注功能（后续）](docs/plans/2026-02-13-task11-log-labeling.md)
- [项目总结](docs/plans/2026-02-13-summary.md)

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

## 开发时间估算

- 后端开发：4-6 小时
- 前端开发：4-6 小时
- 测试调试：2-3 小时
- **总计：10-15 小时**

## 后续计划

- [ ] 完成 MVP 开发
- [ ] 功能测试
- [ ] 添加日志标注功能
- [ ] 可视化图表（时间线、流程图）
- [ ] Docker 部署

## 创建时间

2026-02-13

## 使用技能

- brainstorming（需求分析）
- writing-plans（实施计划）
