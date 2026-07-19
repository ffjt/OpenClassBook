# OpenClassBook templates / OpenClassBook 模板

Each first-party or community template is a self-contained folder:

```text
templates/<template-id>/
  cover.png
  cover_back.png
  chapter.png
  article_background.png
  ending.png
  theme.json
```

All PNG assets must be opaque `1080 x 1440` images. Article backgrounds must keep the central safe area readable: top `120px`, bottom `140px`, left/right `80px`. Decorations belong only on corners, headers, footers, and outer edges.

每套官方或社区模板均为独立目录。所有 PNG 必须为不透明的 `1080 x 1440` 图片；正文背景应保留上 `120px`、下 `140px`、左右各 `80px` 的安全区域，装饰只能位于四角、页眉、页脚和页面边缘。

After adding a folder, register its bilingual catalog metadata in `frontend/src/mock/template-catalog.ts`. No selector or renderer component changes are required.

新增目录后，仅需在 `frontend/src/mock/template-catalog.ts` 注册中英文目录信息，无需修改模板选择器或渲染组件。
