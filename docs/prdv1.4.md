OpenClassBook Book Appearance System PRD

Version 1.0

以后整个书籍外观都归这个模块管理。

一、产品目标

Book Appearance System 用于管理一本书的所有外观设计。

包括：

Front Cover（封面）
Spine（书脊）
Back Cover（封底）

系统采用"模板 + 元数据 + 自动排版"的设计理念。

管理员无需具备设计能力，即可生成专业出版级书籍外观。

二、设计原则

Book Appearance 不允许自由拖拽。

系统采用：

Content First

用户负责：

输入内容

模板负责：

设计
排版
配色
字体
留白
视觉统一

最终保证所有官方模板具有一致的出版品质。

三、模块结构
Book Appearance

├── Front Cover
│
├── Spine
│
├── Back Cover
│
└── Preview
四、Front Cover（封面）
功能

用于展示：

书名
副标题
作者
学校
年份

管理员无需手动排版。

系统根据模板自动完成布局。

封面组成
Front Cover

Illustration

+

Typography

Illustration：

AI生成。

Typography：

系统生成。

两者完全独立。

Typography

包含：

Book Title
Subtitle
Author
School
Publisher
Year

系统自动：

字号
行距
对齐
缩放
换行
Safe Area

模板提供：

Typography Safe Area。

所有文字必须位于 Safe Area 内。

不得超出。

Hero Area

模板提供：

Hero Area。

文字不得覆盖 Hero。

Live Preview

修改任意字段：

立即更新封面。

无需刷新。

五、Spine（书脊）

书脊由系统自动生成。

默认内容：

书名

作者

OpenClassBook

支持：

左对齐
居中
右对齐

支持：

横排
竖排（默认）
自动宽度

系统根据最终书籍页数自动计算：

书脊厚度。

例如：

40页

↓

约4mm
160页

↓

约13mm

不同宽度：

自动调整：

字号
是否显示作者
是否显示 Logo
Logo

默认：

OpenClassBook Logo。

未来：

支持学校 Logo。

六、Back Cover（封底）

封底采用固定出版布局。

不允许自由设计。

内容

包括：

内容简介
编者
学校
出版时间
OpenClassBook Logo

未来支持：

ISBN
条形码
二维码
内容简介

默认：

支持：

300~600字。

自动排版。

支持：

两端对齐。

自动分页。

Footer

底部固定区域：

包括：

OpenClassBook

Logo

Copyright
七、Appearance Metadata

每个模板提供：

interface BookAppearanceTemplate {

    frontCover

    spine

    backCover

}
Front

包含：

hero

typography

palette

lighting

prompt
Spine

包含：

font

color

alignment

logo
Back

包含：

background

summaryArea

footerArea

palette
八、Preview

新增：

Book Preview。

不是：

仅看封面。

而是：

整本书。

┌────────────┬──────┬────────────┐
│            │      │            │
│ Back Cover │Spine │Front Cover │
│            │      │            │
└────────────┴──────┴────────────┘

实时更新。

九、导出

导出：

PDF。

生成：

完整封面展开图。

包括：

Front Cover
Spine
Back Cover

供印刷厂直接使用。

未来支持：

PNG

SVG

高分辨率 TIFF（预留）。

十、高级设置

默认隐藏。

高级用户可以修改：

Front Cover：

字体
字重
字号
字距
行距
颜色

Spine：

字体
Logo
排列方向

Back Cover：

简介区域高度
Footer 高度
Logo 大小

普通管理员无需修改。

十一、官方模板规范

所有官方模板必须提供：

Front Cover
Hero
Typography Profile
Safe Area
Hero Area
Palette
Spine
Font
Alignment
Logo Style
Back Cover
Background
Summary Area
Footer Area

否则不得作为官方模板发布。

十二、未来扩展

Book Appearance System 采用元数据驱动，未来可扩展：

精装封面（Hardcover）
护封（Dust Jacket）
环衬（Endpaper）
腰封（Book Band）
烫金（Foil Stamping）
UV 局部上光效果（作为导出标注）
多语言封面
出版社品牌模板

无需修改现有渲染架构。

十三、产品价值

Book Appearance System 将封面、书脊、封底统一纳入同一套出版设计体系，通过模板、元数据和自动排版，确保整本书拥有一致的视觉风格和专业的出版品质。

系统遵循"用户负责内容，模板负责设计"的理念，使教师和学生无需专业设计经验，也能完成符合印刷规范的书籍外观设计。同时，元数据驱动的架构为未来增加更多官方模板和出版样式提供了良好的扩展能力。