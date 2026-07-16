# Contributing / 参与贡献

Thank you for improving OpenClassBook. 感谢你参与改进 OpenClassBook。

## Before coding / 开始开发前

1. Read `PRD.md` before changing create, invite, join, numbering, or submission flows. 修改创建、邀请、加入、编号或投稿流程前，请先阅读 `PRD.md`。
2. Read `backend/Backend.md` before changing backend contracts. 修改后端数据契约前，请先阅读 `backend/Backend.md`。
3. Keep both English and Simplified Chinese UI copy complete. 中英文界面文案必须同步完整。
4. Prefer established libraries and small, focused code. 优先使用成熟库，保持代码精简且职责聚焦。

## Architecture rules / 架构规则

- Preserve `API → Service → Repository → SQLite`. 保持 `API → Service → Repository → SQLite` 分层。
- Keep formatting in the book Template, never in Article records. 排版规则只属于书籍 Template，不得写入 Article。
- Keep frontend API access behind repositories. 前端 API 调用统一放在 repository 中。
- Preserve route intent and existing visual language unless a redesign is explicitly proposed. 未明确提出重设计时，保持现有路由语义与视觉语言。

## Pull request checks / 拉取请求检查

```bash
pnpm install --frozen-lockfile
pnpm check

cd backend
uv sync --frozen --group dev
uv run ruff check app tests
uv run pytest -q
```

For persistence fixes, verify the API round trip, refresh the page, and check the downstream preview or export surface.

涉及持久化的修复，需要验证 API 往返、页面刷新，以及下游预览或导出页面。

Keep commits focused and explain user-visible behavior in both languages where relevant.

提交应保持聚焦；涉及用户可见行为时，请同时说明中英文影响。
