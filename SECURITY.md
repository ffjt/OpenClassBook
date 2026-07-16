# Security Policy / 安全策略

## Supported version / 支持版本

Security fixes are provided for the latest V1.x release. 安全修复面向最新的 V1.x 版本。

## Reporting a vulnerability / 报告漏洞

Please use GitHub's private security advisory for this repository. Include reproduction steps, affected versions, and impact. Do not open a public issue before a fix is available.

请使用本仓库的 GitHub 私有安全公告功能，并提供复现步骤、受影响版本和影响范围。在修复发布前，请勿创建公开 Issue。

## Deployment boundary / 部署边界

OpenClassBook V1.0 is a local-first application without authentication or authorization. It is intended for a trusted machine or private LAN. Do not expose the FastAPI service directly to the public internet. Use backups before upgrading important SQLite data.

OpenClassBook V1.0 是本地优先应用，不包含身份认证与权限系统，仅适用于可信设备或私有局域网。请勿将 FastAPI 服务直接暴露在公网；升级重要 SQLite 数据前请先备份。
