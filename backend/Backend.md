# OpenClassBook 后端设计（Backend）

> 本文档描述 OpenClassBook 的后端架构、数据模型、接口设计原则以及开发规范。

---

# 一、设计目标

OpenClassBook 的后端只有一个目标：

**稳定、安全、简单地支撑一本书的整个出版流程。**

后端不负责排版。

后端不负责界面。

后端只负责：

- 保存数据
- 管理业务
- 提供 API
- 保证数据一致性

---

# 二、整体架构

```
React
        │
        ▼
FastAPI
        │
Service
        │
Repository
        │
SQLite
```

各层职责：

React

负责页面展示。

FastAPI

负责提供 REST API。

Service

负责业务逻辑。

Repository

负责数据库读写。

SQLite

负责数据持久化。

任何业务逻辑不得直接写入 API。

---

# 三、核心业务模型

OpenClassBook 围绕五个核心对象展开。

## Book

一本书。

包含：

- 负责人
- 书名
- 简介
- 邀请码
- Layout 中的板块顺序与正文出版顺序
- 创建时间

一本 Book 拥有：

- 一个 Template
- 多个 Author
- 多篇 Article

---

## Template

一本书唯一的出版模板。

负责定义：

- 标题格式
- 正文格式
- 图片规则
- 编号规则
- 页面规则

整个系统只有一份 Template。

所有页面共享。

---

## Author

投稿作者。

包含：

- 数据库内部 UUID（不向用户展示）
- 姓名
- 所属书籍
- 创建时间
- 更新时间

一个 Author：

只能属于一本书。

姓名只是 Display Name，不作为唯一身份。

一个 Author 可以拥有多篇 Article。

---

## Article

投稿内容。

Article 永远只保存内容。

包括：

- 标题
- 正文
- 图片
- 编号

**Article 不保存任何排版信息。**

排版全部来自 Template。

编号规则由 Book 的编号模式决定：

- 不使用编号：投稿时编号为空，管理员可在排版阶段按全书顺序统一编号
- 自动生成编号：作者新建文章时输入想要认领的编号，编号在整本书内唯一
- 导入已有编号：作者只能认领管理员已导入的编号

---

## Review

审核状态。

包括：

- Pending
- Approved
- Rejected

Review 属于 Article。

---

# 四、数据关系

```
Book

├── Template (1:1)

├── Authors (1:N)

└── Articles (1:N)

Author (1)

↓

Article (N)

Article

↓

Review Status
```

---

# 五、后端职责

后端负责：

- 创建一本书
- 保存模板
- 保存作者
- 保存文章
- 修改审核状态
- 返回数据

后端不负责：

- PDF 排版
- 页面样式
- 字体计算
- 实时预览

这些全部属于前端。

---

# 六、REST API 设计原则

统一采用 REST 风格。

例如：

Book

POST /books

GET /books/{id}

PATCH /books/{id}

Template

GET /books/{id}/template

PATCH /books/{id}/template

Authors

GET /books/{id}/authors

GET /books/{id}/authors/search?name={name}

POST /books/{id}/authors

PATCH /authors/{id}

GET /authors/{id}/preview

Articles

GET /books/{id}/articles

GET /authors/{id}/articles

PATCH /books/{id}/articles/numbers

PATCH /books/{id}/articles/order

POST /articles

GET /articles/{id}

PATCH /articles/{id}

Review

PATCH /articles/{id}/status

---

# 七、Repository 模式

所有数据库访问必须经过 Repository。

禁止：

```
API → SQLite
```

统一采用：

```
API

↓

Service

↓

Repository

↓

SQLite
```

方便以后替换数据库。

---

# 八、前后端职责

前端：

负责：

- 编辑
- 预览
- 页面
- 交互

后端：

负责：

- 数据
- 权限
- 保存
- 查询

职责必须保持清晰。

---

# 九、开发原则

1.

Template 是唯一格式来源（Single Source of Truth）。

任何排版规则不得保存在 Article 中。

---

2.

Article 永远只保存内容。

包括：

- 标题
- 正文
- 图片

不得保存：

- 字体
- 字号
- 行距
- 对齐方式

---

3.

所有业务必须围绕一本 Book。

不得出现独立 Article。

所有数据都属于某一本书。

---

4.

所有数据库访问必须经过 Repository。

禁止直接操作数据库。

---

5.

所有接口返回 JSON。

不返回 HTML。

---

# 十、当前开发阶段

当前阶段：

- SQLite
- FastAPI
- 本地运行
- 单机版

暂不开发：

- 登录系统
- 云同步
- 多用户权限
- Docker
- PostgreSQL
- Redis

优先完成：

一本书

↓

多人投稿

↓

审核

↓

导出 PDF

形成完整闭环。

后续再扩展更多能力。
