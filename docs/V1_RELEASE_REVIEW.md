# OpenClassBook V1.0 Release Review / V1.0 发布审查

Date / 日期: 2026-07-15

## Recommendation / 发布建议

**GO** for trusted local-machine and private-LAN use. **NO-GO** for a public internet or multi-tenant deployment until authentication and authorization are implemented.

**建议发布**到可信本机与私有局域网环境。在身份认证和权限系统完成前，**不建议**部署到公网或多租户环境。

## Resolved release blockers / 已解决的发布阻断项

- The generated/imported article-number UI now persists a real number pool, and the backend rejects missing, duplicate, out-of-pool, and already-claimed numbers. / 自动生成与导入编号现在会真实持久化，后端会拒绝缺失、重复、池外和已认领编号。
- Free subtitles and per-image placement metadata now survive save/refresh and appear on review/PDF surfaces. / 自由副标题与单图位置元数据可跨保存、刷新持久化，并显示在审核与 PDF 链路中。
- The frontend container now serves a production build through Nginx; the backend uses the uv lockfile, a non-root user, health checks, and persistent data/upload volumes. / 前端容器改为 Nginx 托管生产构建；后端使用 uv 锁文件、非 root 用户、健康检查及数据与上传持久卷。
- Dead settings navigation, an unused placeholder page, outdated V0.1 copy, and the incorrect repository link were removed or corrected. / 已清理无效设置入口、未使用占位页、过期 V0.1 文案与错误仓库链接。
- A bilingual error boundary, real 404 page, route/hero animations, and reduced-motion behavior were added. / 新增中英文错误边界、真实 404 页面、路由与首页动效，并支持减少动态效果。
- CI now enforces frozen installs, frontend tests, lint, builds, backend tests, and locked Python dependencies. / CI 现在强制锁定安装、前端测试、代码检查、构建、后端测试与 Python 锁文件。
- Python dependency audit is clean after upgrading the vulnerable test dependency. / 升级存在漏洞的测试依赖后，Python 依赖审计已清零。

## Verification evidence / 验证证据

```text
Frontend: ESLint + 6 Vitest tests + TypeScript/Vite production build
Backend: Ruff + 34 pytest integration tests
Security: pip-audit — No known vulnerabilities found
Containers: both images built; backend health/version/non-root checked;
            Nginx health and SPA fallback checked
Browser: create → number pool → invite → join → claim → save → refresh
         → submit → approve → generate PDF → 404
```

## Accepted V1 limitations / V1 接受的限制

- No accounts, authentication, authorization, cloud sync, or concurrent collaborative editing. / 不包含账号、身份认证、权限、云同步或多人实时协作。
- SQLite is appropriate for the documented single-machine workflow, not high-concurrency deployment. / SQLite 适用于文档约定的单机场景，不适合高并发部署。
- Compatibility upgrades currently run in `init_db()`; Alembic revision history should replace this before a hosted V2 migration strategy. / 当前兼容升级由 `init_db()` 执行；托管版 V2 前应改为正式 Alembic 版本迁移。
- `book-layout-page.tsx` remains a large orchestration surface. Split section editing, article ordering, and preview into tested modules before major V2 features. / `book-layout-page.tsx` 仍是大型编排页面；V2 大功能前应拆分板块编辑、文章排序与预览模块并补测试。
- Frontend tests cover the new number import core, while full browser E2E is still manual. Add automated Playwright coverage in V2. / 前端测试已覆盖编号导入核心，但完整浏览器 E2E 仍为手动验收；V2 应补自动化 Playwright。
- The npm registry audit endpoint returned HTTP 410 during review. Dependabot is enabled, but this run does not claim a clean npm vulnerability audit. / 审查期间 npm registry 审计端点返回 HTTP 410；已启用 Dependabot，但本次不宣称 npm 漏洞审计为零。
