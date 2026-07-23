import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ListOrdered,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { AppearanceEditor } from "@/components/book-appearance/appearance-editor";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useBookTemplate } from "@/hooks/use-book-template";
import type { Language } from "@/lib/i18n";
import { getTemplateAssetUrl } from "@/mock/template-catalog";
import {
  articleRepository,
  type Article,
} from "@/repositories/articleRepository";
import {
  authorRepository,
  type Author,
} from "@/repositories/authorRepository";
import {
  bookRepository,
  type Book,
  type BookLayoutSection,
  type BookUpdateInput,
} from "@/repositories/bookRepository";
import { templateRepository } from "@/repositories/templateRepository";
import {
  getFontFamilyStyle,
  type Template,
} from "@/types/template";
import { toast } from "sonner";

type StructureSaveStatus = "idle" | "saving" | "saved" | "error";

const copy = {
  en: {
    eyebrow: "Book structure",
    title: "Book Layout",
    description:
      "Combine finished page assets with approved articles. Main-content typography remains controlled by Template.",
    structure: "Book structure",
    structureDescription: "Drag sections to set the publication order",
    resources: "Page resources",
    sections: {
      cover: "Cover",
      contents: "Contents",
      preface: "Preface",
      articles: "Main content",
      principal_message: "Principal's message",
      teacher_message: "Teacher's message",
      afterword: "Afterword",
      closing: "Closing remarks",
      acknowledgement: "Acknowledgements",
      ending: "Ending",
      back_cover: "Back cover",
    },
    addPage: "Add page",
    contentsMenu: "Table of contents",
    contentsDescription:
      "Generate a compact, live contents page from approved articles in publication order, with one article per line.",
    generateContents: "Generate contents page",
    contentsGenerated: "Contents page is ready and placed after the cover.",
    contentsAlreadyGenerated: "Contents page is already in this book.",
    contentsOptions: "Contents entries",
    contentsOptionsHint:
      "Article titles are always shown. Choose whether to include author and class details.",
    compactContents: "Compact · one article per line",
    hideContents: "Hide contents page",
    showContents: "Show contents page",
    showContentsAuthor: "Show author",
    showContentsClass: "Show class",
    contentsEmpty: "Approved article titles will appear here after review.",
    customName: "Custom page name",
    customNamePlaceholder: "e.g. Class memories",
    commonPages: "Quick add",
    add: "Add",
    hideSection: "Hide section",
    showSection: "Show section",
    sectionHidden: "Hidden",
    renameSection: "Rename section",
    sectionName: "Section name",
    saveName: "Save name",
    cancel: "Cancel",
    savingStructure: "Saving structure...",
    structureSaved: "Structure saved",
    structureSaveError: "Could not save the book structure.",
    dragToReorder: "Drag to reorder",
    bodyLocked: "Main content is fixed and cannot be deleted or renamed.",
    automatic: "Automatic",
    imported: "Imported",
    notImported: "Not imported",
    emptyTitle: "Not uploaded yet.",
    emptyDescription: "Supports DOCX, PDF, PNG, JPG, JPEG, and WEBP.",
    supportedFormats: "Supported formats",
    recommendedFormat: "Recommended format",
    compatibleFormats: "Compatible formats",
    docx: "DOCX (recommended)",
    formatExplanation:
      "When Microsoft Word is installed, DOCX uses native Word PDF conversion for maximum fidelity. Otherwise, the compatible renderer preserves supported colors, fonts, paragraph layout, tables, and images.",
    coverFormats: "PNG · JPG · JPEG · WEBP · PDF",
    coverRecommendation: "A4 ratio · 300 DPI recommended",
    selectFile: "Choose file",
    uploadCover: "Upload cover",
    uploadBackCover: "Upload back cover",
    appearanceStudio: "Book Appearance Studio",
    appearanceStudioHint: "Design the cover, spine, and back cover together.",
    useAppearanceStudio: "Use Book Appearance Studio",
    noThemeCover: "I don't use theme covers",
    uploadCoverHint: "Upload the final cover and back-cover files instead.",
    appearanceSaved: "Book appearance saved.",
    appearanceSaveError: "Could not save book appearance.",
    openAppearanceStudio: "Open Book Appearance Studio",
    saveAndOpenLayout: "Save and open layout settings",
    fileName: "File",
    fileSize: "Size",
    uploadedAt: "Uploaded",
    preview: "Preview",
    replace: "Replace file",
    delete: "Delete file",
    deleting: "Deleting...",
    uploading: "Uploading...",
    uploadSuccess: "Upload successful.",
    deleteSuccess: "File deleted.",
    uploadFailed: "Upload failed. Please try again.",
    deleteFailed: "Could not delete the file.",
    unsupportedFormat: "Unsupported file format.",
    fileTooLarge: "File exceeds the 100 MB limit.",
    wordUploaded:
      "Word file uploaded. Native Word conversion will be used when available, with automatic compatible fallback.",
    unsupportedPageType: "Uploads for this page type are not available yet.",
    maxFileSize: "Maximum file size: 100 MB",
    articlesHeading: (count: number) =>
      `${count} approved article${count === 1 ? "" : "s"}`,
    articlesSource: "All content comes from Approved submissions.",
    templateControlled: "Formatting is controlled automatically by Template.",
    articlePageMode: "Article pagination",
    singleArticlePage: "New page for each article",
    flowArticles: "Flow articles continuously",
    articlePageModeHint:
      "Continuous flow lets multiple approved articles share a page without changing their submitted formatting.",
    savingArticlePageMode: "Saving pagination mode...",
    articlePageModeSaved: "Pagination mode saved.",
    articlePageModeSaveError: "Could not save pagination mode.",
    articleOrderHint: "Drag approved articles to set their publication order.",
    savingArticleOrder: "Saving article order...",
    articleOrderSaved: "Article order saved.",
    articleOrderSaveError: "Could not save the article order.",
    assignNumbersInOrder: "Generate numbers in current order",
    assignNumbersHint:
      "Uses the current article order and the number prefix and length configured in Settings.",
    assigningNumbers: "Generating numbers...",
    numbersAssigned: "Article numbers generated in the current order.",
    numberAssignmentError: "Could not generate article numbers.",
    sortAscending: (label: string) => `Sort by ${label} ascending`,
    sortDescending: (label: string) => `Sort by ${label} descending`,
    number: "No.",
    author: "Author",
    noArticles: "No approved articles yet.",
    noArticlesDescription: "Approve submissions in Review to add main content.",
    publicationPreview: "Publication preview",
    placeholder: "Placeholder preview",
    completeStructure: "Complete book structure",
    previewHint: "Select a section to open its full preview.",
    fullPreview: "Full section preview",
    backToStructure: "Back to book structure",
    filePreviewPending:
      "Use Preview in Page resources to view the uploaded file.",
    loading: "Loading book layout",
    errorTitle: "Unable to load book content.",
    errorDescription: "Please confirm that the backend is running.",
    reload: "Reload",
  },
  zh: {
    eyebrow: "书籍结构",
    title: "书籍排版",
    description:
      "组合已经制作好的页面资源与审核通过的文章；正文排版始终由 Template 统一控制。",
    structure: "整本书结构",
    structureDescription: "拖拽板块可调整出版顺序",
    resources: "页面资源管理",
    sections: {
      cover: "封面",
      contents: "目录",
      preface: "前言",
      articles: "正文",
      principal_message: "校长寄语",
      teacher_message: "教师寄语",
      afterword: "后记",
      closing: "结语",
      acknowledgement: "致谢",
      ending: "尾页",
      back_cover: "封底",
    },
    addPage: "添加板块",
    contentsMenu: "目录",
    contentsDescription: "按已审核通过文章及当前出版顺序，一键生成紧凑的实时目录页，每篇文章一行。",
    generateContents: "一键生成目录页",
    contentsGenerated: "目录页已生成，并排在封面之后。",
    contentsAlreadyGenerated: "本书已包含目录页。",
    contentsOptions: "目录条目",
    contentsOptionsHint: "文章标题始终显示；可选择是否显示作者与班级。",
    compactContents: "紧凑型 · 一篇文章一行",
    hideContents: "隐藏目录页",
    showContents: "显示目录页",
    showContentsAuthor: "显示作者",
    showContentsClass: "显示班级",
    contentsEmpty: "审核通过后，文章标题将显示在这里。",
    customName: "自定义板块名称",
    customNamePlaceholder: "例如：班级记忆",
    commonPages: "快捷添加",
    add: "添加",
    hideSection: "隐藏板块",
    showSection: "显示板块",
    sectionHidden: "已隐藏",
    renameSection: "重命名板块",
    sectionName: "板块名称",
    saveName: "保存名称",
    cancel: "取消",
    savingStructure: "正在保存结构……",
    structureSaved: "结构已保存",
    structureSaveError: "无法保存书籍结构。",
    dragToReorder: "拖拽排序",
    bodyLocked: "正文为固定板块，不能删除或重命名。",
    automatic: "自动生成",
    imported: "已导入",
    notImported: "未导入",
    emptyTitle: "尚未上传。",
    emptyDescription: "支持 DOCX、PDF、PNG、JPG、JPEG、WEBP。",
    supportedFormats: "支持格式",
    recommendedFormat: "推荐格式",
    compatibleFormats: "兼容格式",
    docx: "DOCX（推荐）",
    formatExplanation:
      "安装 Microsoft Word 时优先使用 Word 原生 PDF 转换以获得最高保真度；否则自动使用兼容渲染器，保留受支持的颜色、字体、段落、表格和图片格式。",
    coverFormats: "PNG · JPG · JPEG · WEBP · PDF",
    coverRecommendation: "推荐 A4 比例 · 300 DPI",
    selectFile: "选择文件",
    uploadCover: "上传封面",
    uploadBackCover: "上传封底",
    appearanceStudio: "书籍外观工作台",
    appearanceStudioHint: "统一设计封面、书脊和封底。",
    useAppearanceStudio: "使用书籍外观工作台",
    noThemeCover: "我不使用主题封面",
    uploadCoverHint: "改为上传最终的封面和封底文件。",
    appearanceSaved: "书籍外观已保存。",
    appearanceSaveError: "书籍外观保存失败。",
    openAppearanceStudio: "进入书籍外观工作台",
    saveAndOpenLayout: "保存并进入排版设置",
    fileName: "文件",
    fileSize: "大小",
    uploadedAt: "上传时间",
    preview: "预览",
    replace: "替换文件",
    delete: "删除文件",
    deleting: "正在删除……",
    uploading: "正在上传……",
    uploadSuccess: "上传成功。",
    deleteSuccess: "文件已删除。",
    uploadFailed: "上传失败，请重试。",
    deleteFailed: "无法删除文件。",
    unsupportedFormat: "不支持的文件格式。",
    fileTooLarge: "文件超过 100 MB 限制。",
    wordUploaded:
      "Word 文件已上传。可用时将使用 Word 原生转换，否则自动使用兼容渲染。",
    unsupportedPageType: "当前页面类型暂不支持上传。",
    maxFileSize: "文件大小上限：100 MB",
    articlesHeading: (count: number) => `共 ${count} 篇审核通过的文章`,
    articlesSource: "全部来自审核通过（Approved）的投稿。",
    templateControlled: "正文格式由 Template 自动控制。",
    articlePageMode: "文章分页",
    singleArticlePage: "每篇文章新页",
    flowArticles: "文章连续排版",
    articlePageModeHint:
      "连续排版会让多篇审核通过的文章共享页面，但不会改变投稿内容格式。",
    savingArticlePageMode: "正在保存分页方式……",
    articlePageModeSaved: "分页方式已保存。",
    articlePageModeSaveError: "无法保存分页方式。",
    articleOrderHint: "拖拽审核通过的文章可调整正文出版顺序。",
    savingArticleOrder: "正在保存正文顺序……",
    articleOrderSaved: "正文顺序已保存。",
    articleOrderSaveError: "无法保存正文顺序。",
    assignNumbersInOrder: "按当前顺序生成编号",
    assignNumbersHint: "使用当前正文顺序，以及设置中的编号前缀和位数生成。",
    assigningNumbers: "正在生成编号……",
    numbersAssigned: "已按当前顺序生成文章编号。",
    numberAssignmentError: "无法生成文章编号。",
    sortAscending: (label: string) => `按${label}升序排序`,
    sortDescending: (label: string) => `按${label}降序排序`,
    number: "编号",
    author: "作者",
    noArticles: "暂无审核通过的文章。",
    noArticlesDescription: "请先在审核页面通过投稿，正文将自动加入。",
    publicationPreview: "出版预览",
    placeholder: "占位预览",
    completeStructure: "整本书完整结构",
    previewHint: "点击任意板块，查看该板块的完整预览。",
    fullPreview: "板块完整预览",
    backToStructure: "返回整本书结构",
    filePreviewPending: "请在页面资源中点击“预览”查看已上传文件。",
    loading: "正在加载书籍排版",
    errorTitle: "无法加载书籍内容。",
    errorDescription: "请确认后端正在运行。",
    reload: "重新加载",
  },
} as const;

interface BookLayoutPageProps {
  basePath: string;
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

export function BookLayoutPage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: BookLayoutPageProps) {
  const pageCopy = copy[language];
  const { template, setTemplate } = useBookTemplate(bookId);
  const [book, setBook] = useState<Book | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [sections, setSections] = useState<BookLayoutSection[]>([]);
  const [structureStatus, setStructureStatus] =
    useState<StructureSaveStatus>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [layoutView, setLayoutView] = useState<"appearance" | "layout">("appearance");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    Promise.all([
      bookRepository.get(bookId),
      articleRepository.listByBook(bookId),
      authorRepository.listByBook(bookId),
    ])
      .then(([loadedBook, loadedArticles, loadedAuthors]) => {
        if (!active) return;
        const loadedSections = getBookSections(loadedBook);
        setBook(loadedBook);
        setArticles(loadedArticles);
        setAuthors(loadedAuthors);
        setSections(loadedSections);
        setLayoutView(isAppearanceStudioActive(loadedBook) ? "appearance" : "layout");
      })
      .catch(() => active && setHasError(true))
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [bookId, reloadKey]);

  const approvedArticles = useMemo(
    () => orderApprovedArticles(articles, book?.layout_article_order),
    [articles, book?.layout_article_order],
  );
  const contentsSection = sections.find((section) => section.preset === "contents");
  const shellProps = {
    activeSection: "Layout" as const,
    basePath,
    bookTitle: book?.title,
    language,
    onNavigate,
    onToggleLanguage,
    ownerName: book?.owner_name,
  };
  const persistSections = async (nextSections: BookLayoutSection[]) => {
    if (!book) return false;
    const previousSections = sections;
    setSections(nextSections);
    setStructureStatus("saving");
    try {
      const updatedBook = await bookRepository.update(book.id, {
        layout_sections: nextSections,
      });
      setBook(updatedBook);
      setSections(getBookSections(updatedBook));
      setStructureStatus("saved");
      return true;
    } catch {
      setSections(previousSections);
      setStructureStatus("error");
      return false;
    }
  };
  const setAppearanceStudioActive = async (active: boolean) => {
    if (!book) return false;
    const frontReference = active ? `theme:${template.templateId}:cover` : null;
    const backReference = active ? `theme:${template.templateId}:cover_back` : null;
    const nextSections = sections.map((section) =>
      section.preset === "cover"
        ? { ...section, file: frontReference }
        : section.preset === "back_cover"
          ? { ...section, file: backReference }
          : section,
    );
    try {
      const updatedBook = await bookRepository.update(book.id, {
        appearance_metadata: {
          ...(book.appearance_metadata ?? {}),
          cover_mode: active ? "studio" : "upload",
        },
        cover_file: frontReference,
        back_cover_file: backReference,
        layout_sections: nextSections,
      });
      setBook(updatedBook);
      setSections(getBookSections(updatedBook));
      setLayoutView(active ? "appearance" : "layout");
      return true;
    } catch {
      toast.error(pageCopy.appearanceSaveError);
      return false;
    }
  };
  const setSectionHidden = async (section: BookLayoutSection) => {
    if (!isHideableLayoutSection(section)) return false;
    return persistSections(
      sections.map((item) =>
        item.id === section.id ? { ...item, hidden: !item.hidden } : item,
      ),
    );
  };
  const generateContentsPage = async () => {
    if (contentsSection) {
      const restored = await persistSections(
        sections.map((section) =>
          section.id === contentsSection.id
            ? { ...section, hidden: false }
            : section,
        ),
      );
      if (restored) {
        toast.success(pageCopy.contentsAlreadyGenerated);
      }
      return;
    }
    const nextContents: BookLayoutSection = {
      id: `contents-${crypto.randomUUID()}`,
      kind: "page",
      preset: "contents",
      name: null,
      file: null,
      hidden: false,
      show_author: true,
      show_class: false,
    };
    const coverIndex = sections.findIndex((section) => section.preset === "cover");
    const nextSections = [...sections];
    nextSections.splice(Math.max(coverIndex + 1, 0), 0, nextContents);
    if (await persistSections(nextSections)) {
      toast.success(pageCopy.contentsGenerated);
    }
  };
  const updateContentsOptions = async (
    options: Pick<BookLayoutSection, "show_author" | "show_class">,
  ) => {
    if (!contentsSection) return false;
    return persistSections(
      sections.map((section) =>
        section.id === contentsSection.id ? { ...section, ...options } : section,
      ),
    );
  };
  const refreshBook = async () => {
    const updatedBook = await bookRepository.get(bookId);
    setBook(updatedBook);
    setSections(getBookSections(updatedBook));
  };

  if (isLoading) {
    return (
      <DashboardLayout {...shellProps}>
        <LayoutSkeleton label={pageCopy.loading} />
      </DashboardLayout>
    );
  }

  if (hasError || !book || !sections.length) {
    return (
      <DashboardLayout {...shellProps}>
        <LoadError
          description={pageCopy.errorDescription}
          onReload={() => setReloadKey((value) => value + 1)}
          reload={pageCopy.reload}
          title={pageCopy.errorTitle}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...shellProps}>
      <header className="border-b border-border pb-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">
          {pageCopy.eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
          {pageCopy.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {pageCopy.description}
        </p>
      </header>

      {layoutView === "appearance" ? (
        <AppearanceStudio
          book={book}
          language={language}
          onOpenLayout={() => setLayoutView("layout")}
          onSaved={refreshBook}
          onTemplateChange={setTemplate}
          onUseUploads={() => setAppearanceStudioActive(false)}
          template={template}
        />
      ) : (
      <section className="mt-6">
        <ContentsWorkspace
          articles={approvedArticles}
          authors={authors}
          book={book}
          copy={pageCopy}
          contentsSection={contentsSection}
          onGenerate={generateContentsPage}
          onOptionsChange={updateContentsOptions}
          onToggleHidden={setSectionHidden}
          status={structureStatus}
          template={template}
        />
      </section>
      )}
    </DashboardLayout>
  );
}

function AppearanceStudio({
  book,
  language,
  onOpenLayout,
  onSaved,
  onTemplateChange,
  onUseUploads,
  template,
}: {
  book: Book;
  language: Language;
  onOpenLayout: () => void;
  onSaved: () => Promise<void>;
  onTemplateChange: (template: Template | ((current: Template) => Template)) => void;
  onUseUploads: () => Promise<boolean>;
  template: Template;
}) {
  const pageCopy = copy[language];
  const [title, setTitle] = useState(book.title);
  const [subtitle, setSubtitle] = useState(book.subtitle ?? "");
  const [ownerName, setOwnerName] = useState(book.owner_name);
  const [school, setSchool] = useState(book.school ?? "");
  const [publisher, setPublisher] = useState(book.publisher ?? "");
  const [description, setDescription] = useState(book.description ?? "");
  const [metadata, setMetadata] = useState<Record<string, string>>(
    book.appearance_metadata ?? {},
  );
  const [status, setStatus] = useState<StructureSaveStatus>("idle");

  useEffect(() => {
    setTitle(book.title);
    setSubtitle(book.subtitle ?? "");
    setOwnerName(book.owner_name);
    setSchool(book.school ?? "");
    setPublisher(book.publisher ?? "");
    setDescription(book.description ?? "");
    setMetadata(book.appearance_metadata ?? {});
  }, [book]);

  const updateData = (key: string, value: string) => {
    setStatus("idle");
    if (key === "title") setTitle(value);
    else if (key === "subtitle") setSubtitle(value);
    else if (key === "author") setOwnerName(value);
    else if (key === "school") setSchool(value);
    else if (key === "publisher") setPublisher(value);
    else if (key === "summary") setDescription(value);
    else setMetadata((current) => ({ ...current, [key]: value }));
  };
  const save = async () => {
    setStatus("saving");
    const layoutSections = getBookSections(book).map((section) =>
      section.preset === "cover"
        ? { ...section, file: `theme:${template.templateId}:cover` }
        : section.preset === "back_cover"
          ? { ...section, file: `theme:${template.templateId}:cover_back` }
          : section,
    );
    const update: BookUpdateInput = {
      title,
      subtitle: subtitle || null,
      owner_name: ownerName,
      school: school || null,
      publisher: publisher || null,
      description: description || null,
      appearance_metadata: { ...metadata, cover_mode: "studio" },
      cover_file: `theme:${template.templateId}:cover`,
      back_cover_file: `theme:${template.templateId}:cover_back`,
      layout_sections: layoutSections,
    };
    try {
      await Promise.all([
        templateRepository.save(book.id, template),
        bookRepository.update(book.id, update),
      ]);
      await onSaved();
      setStatus("saved");
      toast.success(pageCopy.appearanceSaved);
      onOpenLayout();
    } catch {
      setStatus("error");
      toast.error(pageCopy.appearanceSaveError);
    }
  };
  const authorClassName =
    book.class_collection_mode === "fixed"
      ? book.class_fixed_value
      : book.class_collection_mode === "template"
        ? book.class_name_template?.replace(
            "{value}",
            book.class_value_style === "chinese" ? "三" : "3",
          ) ?? null
        : null;

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{pageCopy.appearanceStudioHint}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={status === "saving"}
            onClick={() => void onUseUploads()}
            type="button"
            variant="outline"
          >
            {pageCopy.noThemeCover}
          </Button>
          <Button disabled={status === "saving"} onClick={() => void save()} type="button">
            {status === "saving" ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : null}
            {status === "saving" ? pageCopy.savingStructure : pageCopy.saveAndOpenLayout}
          </Button>
        </div>
      </div>
      <AppearanceEditor
        data={{
          title,
          subtitle,
          author: ownerName,
          school,
          className: metadata.className ?? authorClassName,
          teacher: metadata.teacher,
          editor: metadata.editor,
          publisher,
          summary: description,
          copyright: metadata.copyright,
          year: metadata.year || new Date().getFullYear().toString(),
          edition: metadata.edition,
          estimatedPageCount: Math.max(40, (book.approved_article_count || book.article_count || 1) * 4),
        }}
        language={language}
        onChange={(next) => {
          setStatus("idle");
          onTemplateChange(next);
        }}
        onDataChange={updateData}
        template={template}
      />
    </section>
  );
}

function ContentsWorkspace({
  articles,
  authors,
  book,
  copy: pageCopy,
  contentsSection,
  onGenerate,
  onOptionsChange,
  onToggleHidden,
  status,
  template,
}: {
  articles: Article[];
  authors: Author[];
  book: Book;
  copy: (typeof copy)[Language];
  contentsSection: BookLayoutSection | undefined;
  onGenerate: () => Promise<void>;
  onOptionsChange: (
    options: Pick<BookLayoutSection, "show_author" | "show_class">,
  ) => Promise<boolean>;
  onToggleHidden: (section: BookLayoutSection) => Promise<boolean>;
  status: StructureSaveStatus;
  template: Template;
}) {
  const showAuthor = contentsSection?.show_author ?? true;
  const showClass = contentsSection?.show_class ?? false;
  const isSaving = status === "saving";

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,0.85fr)_minmax(300px,0.7fr)]">
      <section className="rounded-xl border border-border bg-card p-5 shadow-xl sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <ListOrdered className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {pageCopy.contentsMenu}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              {pageCopy.generateContents}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {pageCopy.contentsDescription}
            </p>
            <p className="mt-2 text-xs font-medium text-blue-400">
              {pageCopy.compactContents}
            </p>
          </div>
        </div>
        <Button
          className="mt-6 w-full"
          disabled={isSaving}
          onClick={() => void onGenerate()}
          type="button"
        >
          {isSaving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <ListOrdered className="mr-2 size-4" />}
          {pageCopy.generateContents}
        </Button>

        {contentsSection ? (
          <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">
              {pageCopy.contentsOptions}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {pageCopy.contentsOptionsHint}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                <span>{pageCopy.showContentsAuthor}</span>
                <input
                  checked={showAuthor}
                  disabled={isSaving}
                  onChange={(event) =>
                    void onOptionsChange({
                      show_author: event.target.checked,
                      show_class: showClass,
                    })
                  }
                  type="checkbox"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                <span>{pageCopy.showContentsClass}</span>
                <input
                  checked={showClass}
                  disabled={isSaving}
                  onChange={(event) =>
                    void onOptionsChange({
                      show_author: showAuthor,
                      show_class: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
              </label>
            </div>
            <Button
              className="mt-3 w-full"
              disabled={isSaving}
              onClick={() => void onToggleHidden(contentsSection)}
              type="button"
              variant="outline"
            >
              {contentsSection.hidden ? pageCopy.showContents : pageCopy.hideContents}
            </Button>
          </div>
        ) : null}
      </section>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <header className="border-b border-border px-4 py-4">
          <h2 className="text-xs font-semibold text-foreground">
            {pageCopy.publicationPreview}
          </h2>
        </header>
        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto bg-muted/30 p-4">
          <ContentsPagePreview
            articles={articles}
            authors={authors}
            book={book}
            copy={pageCopy}
            section={contentsSection}
            template={template}
          />
        </div>
      </section>
    </div>
  );
}

function ContentsPagePreview({
  articles,
  authors,
  book,
  copy: pageCopy,
  section,
  template,
}: {
  articles: Article[];
  authors: Author[];
  book: Book;
  copy: (typeof copy)[Language];
  section: BookLayoutSection | undefined;
  template: Template;
}) {
  const authorById = new Map(authors.map((author) => [author.id, author]));
  const entries = articles.map((article, index) => ({
    article,
    author: authorById.get(article.author_id),
    index,
  }));
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(entries.length / 18)) },
    (_, pageIndex) => entries.slice(pageIndex * 18, pageIndex * 18 + 18),
  );
  const showAuthor = section?.show_author ?? true;
  const showClass = section?.show_class ?? false;

  return (
    <div className="space-y-4">
      {pages.map((pageEntries, pageIndex) => (
        <article
          className="mx-auto flex w-full max-w-[250px] flex-col overflow-hidden text-slate-800 shadow-[0_18px_50px_rgba(0,0,0,0.4)] ring-1 ring-black/10"
          key={pageIndex}
          style={{
            aspectRatio: getPreviewAspectRatio(template),
            backgroundColor: template.backgroundColor,
            backgroundImage: `url(${getTemplateAssetUrl(template.templateId, "article_background")})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
            padding: previewPageMargins[template.pageMargin],
          }}
        >
          <header className="border-b pb-1.5 text-center" style={{ borderColor: `${template.accentColor}66` }}>
            <p className="text-[7px] font-semibold uppercase tracking-[0.22em]" style={{ color: template.accentColor }}>
              Contents · 目录
            </p>
            <h3
              className="mt-1 line-clamp-2 text-[13px] leading-4"
              style={{
                color: template.themeColor,
                fontFamily: getFontFamilyStyle(template.titleFont),
                fontWeight: template.titleBold ? 700 : 400,
              }}
            >
              {book.title}
            </h3>
          </header>
          {pageEntries.length ? (
            <ol className="mt-2 min-h-0 flex-1 space-y-0.5">
              {pageEntries.map(({ article, author, index }) => {
                const detail = [
                  showAuthor ? author?.name : "",
                  showClass ? author?.class_name ?? "" : "",
                ].filter(Boolean).join(" · ");
                return (
                  <li className="grid grid-cols-[18px_minmax(0,1fr)] items-baseline gap-1.5 border-b border-slate-500/15 py-1" key={article.id}>
                    <span className="text-[7px] font-semibold" style={{ color: template.accentColor }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 truncate text-[8px] leading-3" style={{ color: template.themeColor }}>
                      <span className="font-medium">
                        {article.title}
                      </span>
                      {detail ? <span className="text-slate-500"> · {detail}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-[9px] leading-4 text-slate-500">
              {pageCopy.contentsEmpty}
            </div>
          )}
          <footer className="mt-2 text-center text-[7px] tracking-[0.16em]" style={{ color: template.accentColor }}>
            {pageIndex + 1}
          </footer>
        </article>
      ))}
    </div>
  );
}

function getBookSections(book: Book): BookLayoutSection[] {
  if (book.layout_sections?.length) {
    const sections = book.layout_sections.map((section) => ({
      ...section,
      hidden: section.hidden ?? false,
      show_author: section.show_author ?? true,
      show_class: section.show_class ?? false,
    }));
    if (!sections.some((section) => section.preset === "cover")) {
      sections.unshift({ id: "cover", kind: "page", preset: "cover", name: null, file: book.cover_file, hidden: false, show_author: true, show_class: false });
    }
    if (!sections.some((section) => section.preset === "back_cover")) {
      sections.push({ id: "back_cover", kind: "page", preset: "back_cover", name: null, file: book.back_cover_file, hidden: false, show_author: true, show_class: false });
    }
    return sections;
  }
  return [
    { id: "cover", kind: "page", preset: "cover", name: null, file: book.cover_file, hidden: false, show_author: true, show_class: false },
    {
      id: "preface",
      kind: "page",
      preset: "preface",
      name: null,
      file: book.preface_file,
      hidden: false,
      show_author: true,
      show_class: false,
    },
    { id: "articles", kind: "articles", preset: "articles", name: null, file: null, hidden: false, show_author: true, show_class: false },
    {
      id: "afterword",
      kind: "page",
      preset: "afterword",
      name: null,
      file: book.afterword_file,
      hidden: false,
      show_author: true,
      show_class: false,
    },
    {
      id: "acknowledgement",
      kind: "page",
      preset: "acknowledgement",
      name: null,
      file: book.acknowledgement_file,
      hidden: false,
      show_author: true,
      show_class: false,
    },
    {
      id: "ending",
      kind: "page",
      preset: "ending",
      name: null,
      file: null,
      hidden: false,
      show_author: true,
      show_class: false,
    },
    {
      id: "back_cover",
      kind: "page",
      preset: "back_cover",
      name: null,
      file: book.back_cover_file,
      hidden: false,
      show_author: true,
      show_class: false,
    },
  ];
}

function isHideableLayoutSection(section: BookLayoutSection) {
  return section.kind === "page" && section.preset !== "cover" && section.preset !== "back_cover";
}

function isAppearanceStudioActive(book: Book) {
  const mode = book.appearance_metadata?.cover_mode;
  if (mode === "studio") return true;
  if (mode === "upload") return false;
  if (
    /^theme:[a-z0-9-]+:(cover|cover_back)$/.test(book.cover_file ?? "") ||
    /^theme:[a-z0-9-]+:(cover|cover_back)$/.test(book.back_cover_file ?? "")
  ) {
    return true;
  }
  return !book.cover_file && !book.back_cover_file;
}

function compareArticleNumbers(left: Article, right: Article) {
  if (!left.number) return right.number ? 1 : left.id - right.id;
  if (!right.number) return -1;
  return (
    left.number.localeCompare(right.number, undefined, {
      numeric: true,
      sensitivity: "base",
    }) || left.id - right.id
  );
}

function orderApprovedArticles(
  articles: Article[],
  articleOrder: number[] | null | undefined,
) {
  const positions = new Map(
    (articleOrder ?? []).map((articleId, index) => [articleId, index]),
  );
  return articles
    .filter((article) => article.status === "approved")
    .sort((left, right) => {
      const leftPosition = positions.get(left.id);
      const rightPosition = positions.get(right.id);
      if (leftPosition !== undefined && rightPosition !== undefined) {
        return leftPosition - rightPosition;
      }
      if (leftPosition !== undefined) return -1;
      if (rightPosition !== undefined) return 1;
      return compareArticleNumbers(left, right);
    });
}

const previewPageMargins = {
  narrow: "7% 8%",
  normal: "9% 11%",
  wide: "12% 14%",
};

function getPreviewAspectRatio(template: Template) {
  if (template.pageSize === "custom") {
    return `${template.customPageWidth} / ${template.customPageHeight}`;
  }
  return {
    a4: "210 / 297",
    a5: "148 / 210",
    b5: "176 / 250",
  }[template.pageSize];
}

function LayoutSkeleton({ label }: { label: string }) {
  return (
    <div aria-label={label} className="animate-pulse" role="status">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted/70" />
      <div className="mt-6 grid gap-5 xl:grid-cols-[230px_minmax(410px,1fr)_minmax(300px,0.72fr)]">
        <div className="h-[590px] rounded-xl border border-border bg-muted/30" />
        <div className="h-[590px] rounded-xl border border-border bg-muted/30" />
        <div className="h-[590px] rounded-xl border border-border bg-muted/30" />
      </div>
    </div>
  );
}

function LoadError({
  description,
  onReload,
  reload,
  title,
}: {
  description: string;
  onReload: () => void;
  reload: string;
  title: string;
}) {
  return (
    <div className="mx-auto mt-20 max-w-lg rounded-xl border border-border bg-card px-7 py-12 text-center">
      <AlertCircle className="mx-auto size-5 text-rose-400" />
      <h1 className="mt-5 text-lg font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button
        className="mt-6 h-9 rounded-lg px-4 text-xs"
        onClick={onReload}
        type="button"
      >
        <RefreshCw className="mr-2 size-3.5" />
        {reload}
      </Button>
    </div>
  );
}
