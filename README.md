# ClassBook CMS

ClassBook CMS is an open-source content management system for schools to collect essays, manage submissions, and generate print-ready PDF books.

ClassBook CMS 是一个面向学校的开源内容管理系统项目骨架，用于后续支持作文收集、投稿管理，以及生成可直接印刷的 PDF 图书。

当前版本只完成项目结构搭建，不包含任何业务功能。

## 技术栈

- 前端：React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- 后端：FastAPI
- 数据库：SQLite
- 包管理器：pnpm
- 容器化：Docker + Docker Compose

## 项目结构

```text
classbook-cms/
├─ frontend/              # React 前端应用
├─ backend/               # FastAPI 后端应用
├─ .github/workflows/     # GitHub Actions 基础检查
├─ docker-compose.yml     # 本地容器编排
├─ pnpm-workspace.yaml    # pnpm 工作区配置
└─ README.md              # 项目说明
```

## 环境准备

请先安装：

- Node.js 20+
- pnpm 9+
- Python 3.12+
- Docker Desktop（可选，用于容器运行）

## 本地开发

### 1. 安装前端依赖

```bash
pnpm install
```

### 2. 安装后端依赖

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Windows PowerShell 可以使用：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

### 3. 启动前端

```bash
pnpm --filter frontend dev
```

默认地址：

```text
http://localhost:5173
```

### 4. 启动后端

```bash
cd backend
uvicorn app.main:app --reload
```

默认地址：

```text
http://localhost:8000
```

FastAPI 自动文档：

```text
http://localhost:8000/docs
```

## 使用 Docker 启动

```bash
docker compose up --build
```

启动后：

- 前端：http://localhost:5173
- 后端：http://localhost:8000

## 常用命令

```bash
# 前端代码检查
pnpm --filter frontend lint

# 前端构建
pnpm --filter frontend build

# 后端代码检查
cd backend
ruff check .

# 后端测试
cd backend
pytest
```

## 当前状态

本项目目前只包含基础项目结构、配置文件和占位页面。

下一步可以按需继续添加：

- 用户登录
- 作文收集
- 投稿管理
- 审稿流程
- PDF 图书生成
- 管理后台页面
