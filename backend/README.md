# OpenClassBook Backend / OpenClassBook 后端

FastAPI、SQLAlchemy 2.x、Pydantic v2 与 SQLite 构成的分层后端。Book CRUD 已接入真实 SQLite，其他业务路由仍为占位实现。

A layered backend built with FastAPI, SQLAlchemy 2.x, Pydantic v2, and SQLite. Book CRUD uses real SQLite persistence; other business routes remain placeholders.

## 运行 / Run

```bash
uv sync
uv run uvicorn app.main:app --reload
```

如果当前终端尚未识别 `uv` 命令，可将上述命令中的 `uv` 替换为 `python -m uv`。
If the current shell does not recognize `uv`, replace `uv` with `python -m uv`.

Swagger: `http://127.0.0.1:8000/docs`

开发环境默认允许来自 `localhost`、`127.0.0.1` 与私有局域网 IP 的前端请求，端口不限。可通过 `CORS_ORIGINS` 和 `CORS_ORIGIN_REGEX` 收紧或扩展来源。
During development, frontend requests from `localhost`, `127.0.0.1`, and private-LAN IPs are allowed on any port. Use `CORS_ORIGINS` and `CORS_ORIGIN_REGEX` to narrow or extend the allowed origins.

## Book API / 书籍接口

- `POST /api/v1/books`
- `GET /api/v1/books`
- `GET /api/v1/books/{id}`
- `PATCH /api/v1/books/{id}`
- `DELETE /api/v1/books/{id}`

## 检查 / Check

```bash
uv run ruff check .
uv run pytest
```

## 分层 / Layers

```text
API -> Service -> Repository -> SQLAlchemy -> SQLite
```

- `app/api/v1`: REST 路由 / REST routes
- `app/services`: 业务层 / business layer
- `app/repositories`: 数据访问层 / data-access layer
- `app/models`: SQLAlchemy 模型 / SQLAlchemy models
- `app/schemas`: Pydantic 请求与响应模型 / Pydantic request and response models
- `alembic`: 迁移预留 / migration placeholder
