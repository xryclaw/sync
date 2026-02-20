# SLS Log Analyzer 2 - 开发计划 (Agent Harness)

## 概述

此计划旨在指导 SLS Log Analyzer 2 项目的渐进式开发。我们将严格遵循 "agent-harness" 方法论，确保每个开发步骤都具备明确的目标、配套的 Git 提交以及充分的测试，以避免上次开发中出现的非渐进式、缺乏提交和测试的问题。

**项目目标：** 构建一个 Web 平台，通过上传 CSV 日志文件，自动解析玩家行为链路，可视化展示操作时间线，并识别 bug 触发前的异常模式。

**Agent Harness 核心原则：**
1.  **渐进式开发 (Incremental Development)：** 将复杂任务拆解为尽可能小的、可独立验证的子任务。
2.  **明确的 Git 提交 (Dedicated Git Commits)：** 每个完成的子任务都将伴随一个清晰、有意义的 Git 提交消息。
3.  **全面的测试 (Thorough Testing)：** 在每个阶段，都会编写并执行相应的单元测试、集成测试或手动验证步骤。

## 架构与技术栈

-   **前端：** React 18 + Vite + Ant Design 5 + ECharts 5 + Axios
-   **后端：** Node.js 20 + Express 4 + Multer + csv-parser
-   **数据库：** SQLite3
-   **部署：** Docker + Docker Compose

## 项目结构

```
sls-log-analyzer2/
├── docs/                     # 项目文档和计划
│   └── PLAN.md               # 详细开发计划 (当前文件)
├── frontend/                 # React 前端应用
│   ├── src/                  
│   ├── public/               
│   ├── package.json          
│   └── ...                   
├── backend/                  # Node.js 后端应用
│   ├── src/                  
│   ├── uploads/              
│   ├── database/             
│   ├── package.json          
│   └── ...                   
├── docker-compose.yml        # Docker Compose 配置
├── .gitignore                # Git 忽略文件
└── README.md                 # 项目总览
```

## 实施任务清单

### 🚀 Task 1: 项目基础结构初始化与 Git 配置

**目标：** 初始化前后端项目目录，配置 Git 仓库，并完成首次提交。

**子任务 (Sub-tasks)：**
1.  创建 `sls-log-analyzer2` 根目录。
2.  创建 `backend/` 和 `frontend/` 目录。
3.  在 `sls-log-analyzer2` 根目录初始化 Git 仓库。
4.  创建 `.gitignore` 文件，包含常见忽略项（如 `node_modules`, `.env`, `uploads`, `database/*.sqlite`）。
5.  提交初始项目结构和 `.gitignore`。

**预期交付 (Expected Deliverables)：**
-   `sls-log-analyzer2` 目录下包含 `backend/` 和 `frontend/` 空目录。
-   Git 仓库已初始化，`.gitignore` 文件就位。
-   首次 Git 提交完成。

**Git 提交信息格式 (Git Commit Message Format)：**
`feat(init): 初始化项目基础结构并配置 Git`

**测试与验证 (Testing & Verification)：**
-   验证目录结构是否正确。
-   验证 `.gitignore` 文件内容是否符合预期。
-   运行 `git status` 确保工作区干净。
-   运行 `git log --oneline` 确认首次提交存在。

---

### ⚙️ Task 2: 后端项目初始化 (Node.js & Express)

**目标：** 初始化后端 Node.js 项目，安装 Express 等基础依赖，并搭建一个基本的 Express 服务器。

**子任务 (Sub-tasks)：**
1.  进入 `backend/` 目录。
2.  初始化 Node.js 项目 (`npm init -y`)。
3.  安装核心依赖：`express`, `cors`, `dotenv`, `sqlite3`。
4.  创建 `backend/src/app.js` 作为 Express 应用的入口。
5.  创建 `backend/src/config/database.js` 进行 SQLite 数据库连接和初始化（创建 `analysis_sessions` 和 `logs` 表）。
6.  在 `app.js` 中配置 CORS、JSON 解析、错误处理等基本中间件。
7.  添加一个根路由 `/` 返回简单的欢迎信息。
8.  在 `package.json` 中添加 `start` 和 `dev` 脚本。

**预期交付 (Expected Deliverables)：**
-   `backend/package.json` 和 `package-lock.json`。
-   `node_modules` 目录。
-   `backend/src/app.js` 和 `backend/src/config/database.js` 文件。
-   SQLite 数据库文件 `backend/database/sls_logs.sqlite`（首次启动后生成）。
-   一个运行中的 Express 服务器，可以通过 `http://localhost:5000/` 访问并返回欢迎信息。

**Git 提交信息格式 (Git Commit Message Format)：**
`feat(backend): 初始化后端 Express 项目及数据库配置`

**测试与验证 (Testing & Verification)：**
1.  运行 `npm run dev` 启动后端服务。
2.  使用 `curl http://localhost:5000/` 或浏览器访问，验证返回内容。
3.  验证 `backend/database/sls_logs.sqlite` 文件是否生成。
4.  连接到 SQLite 数据库，检查 `analysis_sessions` 和 `logs` 表是否已创建且结构正确。
5.  编写一个简单的 Jest 或 Supertest 测试文件（例如 `backend/test/app.test.js`），测试根路由 `/` 的响应。

---

### 📤 Task 3: 后端 CSV 文件上传与解析功能

**目标：** 实现 CSV 文件上传接口，能够接收文件，解析其内容，并将日志数据存储到 SQLite 数据库。

**子任务 (Sub-tasks)：**
1.  安装 `multer` 和 `csv-parser` 依赖。
2.  创建 `backend/src/middleware/fileUpload.js` 实现文件上传中间件。
3.  创建 `backend/src/services/csvParser.js` 实现 CSV 解析和数据存储逻辑。
4.  创建 `backend/src/routes/upload.js` 定义 `/api/upload` 路由，整合上传中间件和解析服务。
5.  在 `app.js` 中注册 `upload` 路由。

**预期交付 (Expected Deliverables)：**
-   文件上传和解析成功后，日志数据存储在 `sls_logs.sqlite` 数据库中。
-   `/api/upload` 接口能够接收 CSV 文件并返回解析结果。
-   `analysis_sessions` 表中新增会话记录。

**Git 提交信息格式 (Git Commit Message Format)：**
`feat(backend): 实现 CSV 文件上传与解析服务`

**测试与验证 (Testing & Verification)：**
1.  准备一个示例 `test.csv` 文件。
2.  使用 Postman 或 `curl` 命令测试 `/api/upload` 接口，上传 `test.csv` 文件。
3.  验证接口返回的 JSON 数据是否包含正确的 `sessionId`, `totalLogs`, `uniqueUsers`, `errorCount`。
4.  通过 SQLite 客户端检查数据库，确认 `logs` 和 `analysis_sessions` 表中数据是否正确插入。
5.  编写单元测试（例如 `backend/test/csvParser.test.js`），测试 `CSVParser` 的解析逻辑和数据存储。
6.  编写集成测试（例如 `backend/test/upload.test.js`），测试 `/api/upload` 路由的完整功能。

---

### 📊 Task 4: 后端玩家行为分析 API

**目标：** 实现一系列 API 接口，用于查询玩家行为时间线、错误上下文和行为统计。

**子任务 (Sub-tasks)：**
1.  创建 `backend/src/services/behaviorAnalyzer.js`，包含：
    *   `getUserTimeline(uid, startTime, endTime)`：获取指定用户的行为时间线。
    *   `getErrorContext(uid, beforeMinutes)`：查找 error 前的操作序列。
    *   `getUserBehaviorStats(uid)`：统计用户行为模式。
2.  创建 `backend/src/routes/analysis.js` 定义 `/api/analysis` 路由，暴露上述分析功能。
3.  在 `app.js` 中注册 `analysis` 路由。

**预期交付 (Expected Deliverables)：**
-   `/api/analysis/timeline/:uid` 接口返回用户行为时间线。
-   `/api/analysis/error-context/:uid` 接口返回错误前操作上下文。
-   `/api/analysis/stats/:uid` 接口返回用户行为统计。

**Git 提交信息格式 (Git Commit Message Format)：**
`feat(backend): 开发玩家行为分析 API 接口`

**测试与验证 (Testing & Verification)：**
1.  确保数据库中有足够的测试数据（通过 Task 3 上传）。
2.  使用 Postman 或 `curl` 命令测试所有分析 API 接口，验证其正确性和返回数据格式。
3.  编写单元测试（例如 `backend/test/behaviorAnalyzer.test.js`），测试 `BehaviorAnalyzer` 服务的核心逻辑。
4.  编写集成测试（例如 `backend/test/analysis.test.js`），测试 `/api/analysis` 路由的端到端功能。

---

### 🖼️ Task 5: 前端项目初始化 (React & Ant Design)

**目标：** 初始化前端 React 项目，安装 Ant Design 等基础依赖，并搭建一个基本的应用框架。

**子任务 (Sub-tasks)：**
1.  进入 `frontend/` 目录。
2.  初始化 Vite + React 项目 (`npm create vite@latest . -- --template react`)。
3.  安装核心依赖：`antd`, `echarts`, `echarts-for-react`, `axios`, `dayjs`, `react-router-dom`。
4.  配置 `vite.config.js`，包括端口和 API 代理。
5.  创建 `frontend/src/main.jsx` 和 `frontend/src/App.jsx`。
6.  创建 `frontend/src/components/Layout.jsx` 提供统一布局和导航。
7.  配置 Ant Design 的国际化。

**预期交付 (Expected Deliverables)：**
-   `frontend/package.json` 和 `package-lock.json`。
-   `node_modules` 目录。
-   `frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/src/components/Layout.jsx` 文件。
-   一个运行中的 React 应用，可以通过 `http://localhost:3000/` 访问并显示基本布局和导航。

**Git 提交信息格式 (Git Commit Message Format)：**
`feat(frontend): 初始化前端 React 项目与 Ant Design 框架`

**测试与验证 (Testing & Verification)：**
1.  运行 `npm run dev` 启动前端服务。
2.  在浏览器中访问 `http://localhost:3000/`，验证应用是否正常加载。
3.  检查控制台，确保没有明显的错误或警告。
4.  验证 Ant Design 组件（如导航菜单）是否正常显示。
5.  编写简单的 Cypress 或 Playwright E2E 测试，验证前端应用的启动和基本路由跳转。

---

### ⬆️ Task 6: 前端文件上传页面

**目标：** 实现前端文件上传页面，用户可以通过此页面选择 CSV 文件，输入会话名称，并上传至后端。同时，展示历史上传会话列表。

**子任务 (Sub-tasks)：**
1.  创建 `frontend/src/services/api.js`，封装后端 API 调用。
2.  创建 `frontend/src/pages/UploadPage.jsx`。
3.  在 `UploadPage.jsx` 中实现文件选择、会话名称输入、上传按钮。
4.  集成 Ant Design 的 `Upload` 组件 (`Dragger`) 和 `Input`、`Button`、`Table` 组件。
5.  实现上传逻辑，调用后端 `/api/upload` 接口。
6.  实现会话列表加载和展示，调用后端 `/api/upload/sessions` 接口。
7.  在 `App.jsx` 中配置 `/` 路由指向 `UploadPage`。
8.  更新 `Layout.jsx` 中的导航菜单，添加“上传日志”和“分析会话”项。

**预期交付 (Expected Deliverables)：**
-   用户界面能够上传 CSV 文件并显示上传进度和结果。
-   页面下方显示历史上传会话列表。
-   上传成功后，列表能及时更新。

**Git 提交信息格式 (Git Commit Message Format)：**
`feat(frontend): 实现文件上传页面及历史会话展示`

**测试与验证 (Testing & Verification)：**
1.  启动前后端服务。
2.  在浏览器中访问 `http://localhost:3000/`。
3.  手动测试文件上传功能：选择一个 `test.csv` 文件，输入会话名称，点击上传。
4.  验证上传成功后，页面提示信息正确，且历史会话列表中出现新记录。
5.  验证上传失败时，页面能正确显示错误信息。
6.  刷新页面，验证历史会话列表数据持久化。
7.  编写 Cypress 或 Playwright E2E 测试，自动化测试文件上传和会话列表刷新功能。

---

### 📈 Task 7: 前端时间线可视化组件

**目标：** 开发一个可重用的时间线可视化组件，用于展示玩家行为时间线数据。

**子任务 (Sub-tasks)：**
1.  创建 `frontend/src/components/TimelineChart.jsx`。
2.  使用 ECharts 绘制时间线图表，展示用户的 `event_name` 和 `datetime`。
3.  支持时间范围筛选和缩放功能。
4.  在图表上高亮显示 `error` 事件。
5.  点击事件点时，显示详细的 `raw_data` 或关键信息。

**预期交付 (Expected Deliverables)：**
-   一个能够接收时间线数据并渲染交互式 ECharts 时间线图表的 React 组件。
-   图表具有基本的缩放和事件详情显示功能。

**Git 提交信息格式 (Git Commit Message Format)：**
`feat(frontend): 开发玩家行为时间线可视化组件`

**测试与验证 (Testing & Verification)：**
1.  在 `AnalysisPage.jsx` 中集成 `TimelineChart` 组件，传入模拟数据或通过后端 API 获取数据。
2.  在浏览器中验证图表渲染是否正确，数据点是否对应。
3.  测试缩放功能，确保图表能够平滑地放大和缩小。
4.  测试点击事件点，验证详细信息是否正确显示。
5.  编写 Jest/React Testing Library 单元测试，测试组件的渲染和基本交互。
6.  编写 Cypress 或 Playwright E2E 测试，验证图表在实际数据下的行为和交互。

---

### 🚨 Task 8: 前端异常分析页面

**目标：** 实现异常分析页面，展示特定错误的上下文信息，并提供对用户行为模式的洞察。

**子任务 (Sub-tasks)：**
1.  创建 `frontend/src/pages/AnalysisPage.jsx`。
2.  在该页面中，接收 `uid` 参数，并调用后端 API 获取玩家行为时间线、错误上下文和行为统计数据。
3.  集成 `TimelineChart` 组件展示时间线。
4.  设计 UI 展示错误上下文（例如，在错误发生前 n 分钟的操作序列）。
5.  设计 UI 展示玩家行为统计数据（例如，最常执行的操作，操作频率）。
6.  提供会话选择或用户选择功能，以便分析不同会话或不同用户的数据。

**预期交付 (Expected Deliverables)：**
-   一个能够展示单个用户行为时间线、错误上下文和行为统计的分析页面。
-   页面布局清晰，信息展示直观。

**Git 提交信息格式 (Git Commit Message Format)：**
`feat(frontend): 构建异常分析页面及数据展示`

**测试与验证 (Testing & Verification)：**
1.  启动前后端服务，并上传一些包含错误日志的 CSV 文件。
2.  在 `UploadPage` 中选择一个已上传的会话，点击“分析”按钮或导航到 `/analysis/:uid` 路由。
3.  验证时间线图表是否正确加载并显示数据。
4.  验证错误上下文信息是否准确无误。
5.  验证行为统计数据是否正确展示。
6.  编写 Cypress 或 Playwright E2E 测试，自动化测试异常分析页面的数据加载和展示功能。

---

### 🐳 Task 9: Docker 部署配置

**目标：** 为整个应用配置 Docker 和 Docker Compose，实现便捷的容器化部署。

**子任务 (Sub-tasks)：**
1.  在 `backend/` 目录下创建 `Dockerfile.backend`。
2.  在 `frontend/` 目录下创建 `Dockerfile.frontend`。
3.  在项目根目录创建 `docker-compose.yml`，编排前后端服务和数据库。
4.  配置数据持久化（例如，SQLite 数据库文件映射到宿主机）。
5.  配置 `.env` 文件处理敏感信息。

**预期交付 (Expected Deliverables)：**
-   可独立构建的前后端 Docker 镜像。
-   一个功能齐全的 `docker-compose.yml` 文件，能够一键启动整个应用栈。
-   数据（SQLite 文件）能够在容器重启后持久化。

**Git 提交信息格式 (Git Commit Message Format)：**
`chore(docker): 添加 Docker 容器化部署配置`

**测试与验证 (Testing & Verification)：**
1.  运行 `docker-compose build` 验证镜像能否成功构建。
2.  运行 `docker-compose up -d` 启动所有服务。
3.  在浏览器中访问前端应用（通常是 `http://localhost:3000`），验证其功能。
4.  上传 CSV 文件，重启 Docker Compose，验证数据是否持久化。
5.  运行 `docker-compose down` 停止并清理服务。

---

### ✅ Task 10: 测试与优化

**目标：** 完善单元测试和集成测试，进行性能优化，并提升用户体验。

**子任务 (Sub-tasks)：**
1.  **代码审查：** 对整个代码库进行审查，确保代码质量、可读性和一致性。
2.  **测试覆盖：** 确保关键模块（如 CSV 解析、行为分析服务）拥有高测试覆盖率。
3.  **性能优化：**
    *   针对大文件上传和解析进行性能测试和优化。
    *   优化数据库查询，添加索引。
    *   前端代码拆分（Code Splitting）和懒加载。
4.  **错误处理：** 完善前后端的错误捕获和用户友好提示。
5.  **用户体验 (UX) 改进：**
    *   优化加载状态和反馈。
    *   响应式设计。
    *   国际化支持（如果需要）。
6.  **文档更新：** 更新 `README.md`，添加部署指南和使用说明。

**预期交付 (Expected Deliverables)：**
-   高代码质量和测试覆盖率。
-   应用在大数据量下仍能保持良好性能。
-   完善的错误处理和用户体验。
-   最新的部署和使用文档。

**Git 提交信息格式 (Git Commit Message Format)：**
`chore(refactor): 完善测试、性能优化及用户体验改进`

**测试与验证 (Testing & Verification)：**
1.  运行所有单元测试、集成测试和 E2E 测试，确保通过。
2.  使用性能分析工具（如 Lighthouse, Node.js Profiler）进行性能测试，确认优化效果。
3.  进行压力测试，验证应用在大并发和大数据量下的稳定性。
4.  进行用户验收测试 (UAT)，收集用户反馈并根据需要进行调整。
5.  验证文档是否清晰、准确、完整。
