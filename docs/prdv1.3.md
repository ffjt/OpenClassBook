OpenClassBook：高品质模板系统（Template System）开发需求
项目目标

OpenClassBook 不只是一个作文排版工具，而是一个现代、高品质的作文集设计平台。

用户应能够在几分钟内生成一本具有出版社质感的作文集，而不是传统 Word 模板。

模板必须具有统一的视觉语言、优秀的留白、现代出版设计风格，并兼顾打印与电子阅读。

一、整体设计理念

模板设计遵循以下原则：

现代（Modern）
极简（Minimal）
高级（Premium）
出版物风格（Editorial Design）
儿童友好（Children Publishing）
留白充足（Whitespace First）

禁止出现以下问题：

廉价 Word 艺术字
大面积花边
彩虹渐变
发光描边字体
素材堆砌
装饰覆盖正文
杂乱无章的背景

整体视觉参考：

Microsoft Fluent Design
Apple Books
Notion
Penguin Books
高端儿童绘本
精品出版社排版

我们的目标不是做"淘宝作文模板"，而是做"出版社作文集"。

二、模板系统

新增 Template System。

每个模板包含：

template/

cover.png

cover_back.png

chapter.png

article_background.png

ending.png

theme.json

theme.json

{
  "name": "Spring Blossom",
  "primaryColor": "#72A8D8",
  "secondaryColor": "#F5D7D7",
  "accentColor": "#E7B45F",
  "textColor": "#333333",
  "fontFamily": "Source Han Serif SC",
  "cornerStyle": "soft"
}

所有页面共享同一主题。

切换模板后：

封面
封底
正文背景
章节页
尾页

全部同步更新。

三、正文背景（Article Background）

这是整个产品最重要的升级。

核心原则

背景永远不能影响阅读。

正文必须保持极高可读性。

正文安全区域必须保持接近纯白。

建议安全区域：

Top: 120px

Bottom: 140px

Left: 80px

Right: 80px

正文区域禁止：

花朵
树枝
山峰
鸟
云
光效
装饰图形

所有装饰只能出现在：

四角
页眉
页脚
左右边缘

形成自然视觉引导，而不是干扰阅读。

四、封面设计

重新设计 Cover。

禁止淘宝风。

禁止：

艺术字
发光
彩虹渐变
复杂边框
廉价素材

封面采用现代出版设计。

布局建议：

作文集

ESSAY COLLECTION

姓名

班级

学校

年份

使用统一字体体系。

整体采用：

大量留白

统一配色

统一插画

统一装饰语言

五、章节页（Chapter）

新增章节页。

例如：

第一单元

成长

Chapter 01

背景可以比正文稍丰富。

但仍保持：

留白

高级

现代

六、尾页（Ending）

新增尾页。

例如：

感谢阅读

成长不会结束。

文字会一直陪伴我们。

底部加入统一风格插画。

例如：

校园
山脉
飞鸟
云层
树林
夕阳
打开的书本

整体作为一本书的结束页。

七、默认内置模板

第一版建议内置：

自然系列
春日桃花
夏日森林
秋日银杏
冬日暖阳
国风系列
青山云雾
水墨宣纸
新中式留白
校园系列
校园晨光
毕业季
少年梦想
绘本系列
北欧森林
海洋童话
星空梦想

总计：

12 套模板。

八、ImageGen 自动生成素材

模板素材默认不依赖网络下载。

优先使用 GPT Image 自动生成。

开发时可通过：

imagegen.env

调用 gpt-image2。

注意：

仅生成：

1080 × 1440

PNG

不要透明背景

不要生成 4K

所有模板图片均保持统一风格。

九、ImageGen 提示词规范

生成背景时必须遵循以下规则。

通用要求
Premium editorial illustration

Modern publishing design

Minimalist

Soft watercolor texture

Elegant composition

Large negative space

Premium children's publishing

High readability

Decorations only around page edges

Safe text area in center

No objects behind text

Subtle paper texture

Print friendly

Soft color palette

Consistent illustration style
严禁生成
Objects overlapping text

Complex center illustration

Heavy shadows

Strong gradients

Busy backgrounds

Clipart

Cartoon stickers

WordArt style

Low-quality decorations

Excessive flowers
十、模板统一规范

所有模板必须满足：

✓ 同一套色彩体系

✓ 同一字体体系

✓ 同一装饰语言

✓ 同一插画风格

✓ 同一排版风格

✓ 同一留白规则

不同模板仅改变：

插画主题
主色
点缀元素
氛围

而不改变整体版式。

十一、未来扩展

模板系统需要支持插件化。

建议目录结构：

templates/

spring-blossom/

misty-mountain/

forest/

campus/

ocean/

minimal/

ink/

autumn/

winter/

storybook/

graduation/

dream/

后续用户或社区可以直接新增模板，无需修改代码。

产品目标

最终让 OpenClassBook 不只是“在线作文排版工具”，而是一个一键生成出版社级作文集的平台。

每个模板都应具备以下特征：

第一眼高级，而非花哨。
优先保证阅读体验，而非装饰效果。
所有装饰服务于内容，而不是喧宾夺主。
兼顾电子阅读与 A4 打印效果。
整体达到现代出版物和精品儿童绘本的视觉水准，而非传统 Word 模板。

设计理念：让孩子的作文值得一本真正漂亮的书。