import { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  BookOpenText,
  Check,
  FileImage,
  FileText,
  Files,
  Image,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Replace,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useBookTemplate } from "@/hooks/use-book-template";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { paginateArticle } from "@/components/author-editor/live-article-preview";
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
  type LayoutSectionPreset,
} from "@/repositories/bookRepository";
import {
  getUploadErrorCode,
  uploadRepository,
  type UploadedFileMetadata,
  type UploadType,
} from "@/repositories/uploadRepository";
import { getFontFamilyStyle, type Template } from "@/types/template";
import { toast } from "sonner";

type StructureSaveStatus = "idle" | "saving" | "saved" | "error";
type ArticleOrderSaveStatus = StructureSaveStatus;

const commonSectionPresets: LayoutSectionPreset[] = [
  "preface",
  "principal_message",
  "teacher_message",
  "afterword",
  "closing",
  "acknowledgement",
];
const maxUploadSize = 100 * 1024 * 1024;

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
      preface: "Preface",
      articles: "Main content",
      principal_message: "Principal's message",
      teacher_message: "Teacher's message",
      afterword: "Afterword",
      closing: "Closing remarks",
      acknowledgement: "Acknowledgements",
      back_cover: "Back cover",
    },
    addPage: "Add page",
    customName: "Custom page name",
    customNamePlaceholder: "e.g. Class memories",
    commonPages: "Quick add",
    add: "Add",
    deleteSection: "Delete section",
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
      "Word files are stored as-is and will be processed automatically during export.",
    coverFormats: "PNG · JPG · JPEG · WEBP · PDF",
    coverRecommendation: "A4 ratio · 300 DPI recommended",
    selectFile: "Choose file",
    uploadCover: "Upload cover",
    uploadBackCover: "Upload back cover",
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
      "Word file uploaded. It will be processed automatically during export.",
    unsupportedPageType: "Uploads for this page type are not available yet.",
    maxFileSize: "Maximum file size: 100 MB",
    articlesHeading: (count: number) =>
      `${count} approved article${count === 1 ? "" : "s"}`,
    articlesSource: "All content comes from Approved submissions.",
    templateControlled: "Formatting is controlled automatically by Template.",
    articleOrderHint: "Drag approved articles to set their publication order.",
    savingArticleOrder: "Saving article order...",
    articleOrderSaved: "Article order saved.",
    articleOrderSaveError: "Could not save the article order.",
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
      preface: "前言",
      articles: "正文",
      principal_message: "校长寄语",
      teacher_message: "教师寄语",
      afterword: "后记",
      closing: "结语",
      acknowledgement: "致谢",
      back_cover: "封底",
    },
    addPage: "添加板块",
    customName: "自定义板块名称",
    customNamePlaceholder: "例如：班级记忆",
    commonPages: "快捷添加",
    add: "添加",
    deleteSection: "删除板块",
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
    formatExplanation: "Word 文件保持原样存储，将在导出时自动处理。",
    coverFormats: "PNG · JPG · JPEG · WEBP · PDF",
    coverRecommendation: "推荐 A4 比例 · 300 DPI",
    selectFile: "选择文件",
    uploadCover: "上传封面",
    uploadBackCover: "上传封底",
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
    wordUploaded: "Word 文件已上传，将在导出时自动处理。",
    unsupportedPageType: "当前页面类型暂不支持上传。",
    maxFileSize: "文件大小上限：100 MB",
    articlesHeading: (count: number) => `共 ${count} 篇审核通过的文章`,
    articlesSource: "全部来自审核通过（Approved）的投稿。",
    templateControlled: "正文格式由 Template 自动控制。",
    articleOrderHint: "拖拽审核通过的文章可调整正文出版顺序。",
    savingArticleOrder: "正在保存正文顺序……",
    articleOrderSaved: "正文顺序已保存。",
    articleOrderSaveError: "无法保存正文顺序。",
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
  const { template } = useBookTemplate(bookId);
  const [book, setBook] = useState<Book | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [sections, setSections] = useState<BookLayoutSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("cover");
  const [previewSectionId, setPreviewSectionId] = useState<string | null>(null);
  const [focusedArticleId, setFocusedArticleId] = useState<number | null>(null);
  const [structureStatus, setStructureStatus] =
    useState<StructureSaveStatus>("idle");
  const [articleOrderStatus, setArticleOrderStatus] =
    useState<ArticleOrderSaveStatus>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
        setSelectedSectionId((current) =>
          loadedSections.some((section) => section.id === current)
            ? current
            : loadedSections[0].id,
        );
        setPreviewSectionId(null);
        setFocusedArticleId(null);
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
  const authorNames = useMemo(
    () => new Map(authors.map((author) => [author.id, author.name])),
    [authors],
  );
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? sections[0];
  const previewSection =
    sections.find((section) => section.id === previewSectionId) ?? null;
  const shellProps = {
    activeSection: "Layout" as const,
    basePath,
    bookTitle: book?.title,
    language,
    onNavigate,
    onToggleLanguage,
    ownerName: book?.owner_name,
  };
  const selectSection = (section: BookLayoutSection) => {
    setSelectedSectionId(section.id);
    setPreviewSectionId(null);
    setFocusedArticleId(null);
  };
  const openSectionPreview = (section: BookLayoutSection) => {
    setSelectedSectionId(section.id);
    setPreviewSectionId(section.id);
    if (section.kind !== "articles") setFocusedArticleId(null);
  };
  const openArticlePreview = (articleId: number) => {
    const articleSection = sections.find((section) => section.kind === "articles");
    if (!articleSection) return;
    setSelectedSectionId(articleSection.id);
    setPreviewSectionId(articleSection.id);
    setFocusedArticleId(articleId);
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
  const persistArticleOrder = async (articleIds: number[]) => {
    if (!book) return false;
    const previousOrder = book.layout_article_order;
    setBook((current) =>
      current ? { ...current, layout_article_order: articleIds } : current,
    );
    setArticleOrderStatus("saving");
    try {
      const updatedArticles = await articleRepository.saveLayoutOrder(
        book.id,
        articleIds,
      );
      const updates = new Map(
        updatedArticles.map((article) => [article.id, article]),
      );
      setArticles((current) =>
        current.map((article) => updates.get(article.id) ?? article),
      );
      setArticleOrderStatus("saved");
      return true;
    } catch {
      setBook((current) =>
        current ? { ...current, layout_article_order: previousOrder } : current,
      );
      setArticleOrderStatus("error");
      return false;
    }
  };
  const addSection = async (
    preset: LayoutSectionPreset | null,
    name: string | null,
  ) => {
    const newSection: BookLayoutSection = {
      id: `section-${crypto.randomUUID()}`,
      kind: "page",
      preset,
      name,
      file: null,
    };
    const selectedIndex = sections.findIndex(
      (section) => section.id === selectedSectionId,
    );
    const nextSections = [...sections];
    nextSections.splice(selectedIndex < 0 ? sections.length : selectedIndex + 1, 0, newSection);
    if (await persistSections(nextSections)) {
      setSelectedSectionId(newSection.id);
      setPreviewSectionId(null);
    }
  };
  const deleteSection = async (section: BookLayoutSection) => {
    if (section.kind === "articles") return;
    const index = sections.findIndex((item) => item.id === section.id);
    const nextSections = sections.filter((item) => item.id !== section.id);
    const fallback = nextSections[Math.min(index, nextSections.length - 1)];
    if (await persistSections(nextSections)) {
      if (selectedSectionId === section.id) setSelectedSectionId(fallback.id);
      if (previewSectionId === section.id) setPreviewSectionId(null);
    }
  };
  const renameSection = async (section: BookLayoutSection, name: string) => {
    if (section.kind === "articles") return false;
    return persistSections(
      sections.map((item) =>
        item.id === section.id ? { ...item, name, preset: null } : item,
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

  if (hasError || !book || !selectedSection) {
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

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[230px_minmax(410px,1fr)_minmax(300px,0.72fr)]">
        <StructurePanel
          copy={pageCopy}
          onAdd={addSection}
          onDelete={deleteSection}
          onReorder={persistSections}
          selected={selectedSection}
          onSelect={selectSection}
          sections={sections}
          status={structureStatus}
        />
        <ResourceManager
          articles={approvedArticles}
          authorNames={authorNames}
          book={book}
          copy={pageCopy}
          focusedArticleId={focusedArticleId}
          language={language}
          onAssetChanged={refreshBook}
          onArticlePreview={openArticlePreview}
          onArticleReorder={persistArticleOrder}
          onRename={renameSection}
          orderStatus={articleOrderStatus}
          section={selectedSection}
        />
        <PublicationStructurePreview
          articles={approvedArticles}
          authorNames={authorNames}
          book={book}
          copy={pageCopy}
          focusedArticleId={focusedArticleId}
          onBack={() => {
            setPreviewSectionId(null);
            setFocusedArticleId(null);
          }}
          onPreview={openSectionPreview}
          previewSection={previewSection}
          selected={selectedSection}
          sections={sections}
          template={template}
        />
      </div>
    </DashboardLayout>
  );
}

function StructurePanel({
  copy: pageCopy,
  onAdd,
  onDelete,
  onReorder,
  onSelect,
  selected,
  sections,
  status,
}: {
  copy: (typeof copy)[Language];
  onAdd: (preset: LayoutSectionPreset | null, name: string | null) => Promise<void>;
  onDelete: (section: BookLayoutSection) => Promise<void>;
  onReorder: (sections: BookLayoutSection[]) => Promise<boolean>;
  onSelect: (section: BookLayoutSection) => void;
  selected: BookLayoutSection;
  sections: BookLayoutSection[];
  status: StructureSaveStatus;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const finishSorting = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || status === "saving") return;
    const oldIndex = sections.findIndex((section) => section.id === active.id);
    const newIndex = sections.findIndex((section) => section.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    void onReorder(arrayMove(sections, oldIndex, newIndex));
  };

  return (
    <aside className="overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-24">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div>
          <h2 className="text-xs font-semibold text-foreground">
            {pageCopy.structure}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {status === "saving"
              ? pageCopy.savingStructure
              : status === "saved"
                ? pageCopy.structureSaved
                : status === "error"
                  ? pageCopy.structureSaveError
                  : pageCopy.structureDescription}
          </p>
        </div>
        <button
          aria-label={pageCopy.addPage}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setIsAdding((current) => !current)}
          type="button"
        >
          {isAdding ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
        </button>
      </header>
      {isAdding ? (
        <AddSectionPanel copy={pageCopy} onAdd={onAdd} status={status} />
      ) : null}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={finishSorting}
        sensors={sensors}
      >
        <SortableContext
          items={sections.map((section) => section.id)}
          strategy={verticalListSortingStrategy}
        >
          <nav aria-label={pageCopy.structure} className="p-2">
            {sections.map((section, index) => (
              <SortableSectionRow
                copy={pageCopy}
                disabled={status === "saving"}
                index={index}
                key={section.id}
                onDelete={onDelete}
                onSelect={onSelect}
                section={section}
                selected={selected.id === section.id}
              />
            ))}
          </nav>
        </SortableContext>
      </DndContext>
    </aside>
  );
}

function SortableSectionRow({
  copy: pageCopy,
  disabled,
  index,
  onDelete,
  onSelect,
  section,
  selected,
}: {
  copy: (typeof copy)[Language];
  disabled: boolean;
  index: number;
  onDelete: (section: BookLayoutSection) => Promise<void>;
  onSelect: (section: BookLayoutSection) => void;
  section: BookLayoutSection;
  selected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id, disabled });
  const file = section.file;
  const SectionIcon = getSectionIcon(section);
  const label = getSectionLabel(section, pageCopy);

  return (
    <div
      className={cn(
        "group mb-0.5 flex items-center gap-1 rounded-lg",
        isDragging && "relative z-10 bg-card opacity-70 shadow-lg",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`${label} · ${pageCopy.dragToReorder}`}
        className={cn(
          "flex min-w-0 flex-1 cursor-grab touch-none items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors active:cursor-grabbing",
          selected
            ? "border-blue-500/25 bg-blue-500/[0.08]"
            : "border-transparent hover:bg-muted/50",
        )}
        onClick={() => onSelect(section)}
        type="button"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <SectionIcon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-foreground">
            {label}
          </span>
          <span className="mt-1 block text-[10px] text-muted-foreground">
            {section.kind === "articles"
              ? pageCopy.automatic
              : file
                ? pageCopy.imported
                : pageCopy.notImported}
          </span>
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
      </button>
      {section.kind === "page" ? (
        <button
          aria-label={`${pageCopy.deleteSection}: ${label}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-300 focus:opacity-100 group-hover:opacity-100"
          disabled={disabled}
          onClick={() => void onDelete(section)}
          type="button"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function AddSectionPanel({
  copy: pageCopy,
  onAdd,
  status,
}: {
  copy: (typeof copy)[Language];
  onAdd: (preset: LayoutSectionPreset | null, name: string | null) => Promise<void>;
  status: StructureSaveStatus;
}) {
  const [name, setName] = useState("");
  const addCustomSection = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    await onAdd(null, trimmedName);
    setName("");
  };

  return (
    <div className="border-t border-border p-3">
      <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {pageCopy.customName}
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          className="h-9 min-w-0 rounded-lg px-3 text-xs"
          disabled={status === "saving"}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void addCustomSection();
          }}
          placeholder={pageCopy.customNamePlaceholder}
          value={name}
        />
        <button
          aria-label={pageCopy.add}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          disabled={!name.trim() || status === "saving"}
          onClick={() => void addCustomSection()}
          type="button"
        >
          {status === "saving" ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
        </button>
      </div>
      <p className="mt-3 text-[10px] font-medium text-muted-foreground">
        {pageCopy.commonPages}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {commonSectionPresets.map((preset) => (
          <button
            className="rounded-md border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            disabled={status === "saving"}
            key={preset}
            onClick={() => void onAdd(preset, null)}
            type="button"
          >
            {getPresetLabel(preset, pageCopy)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResourceManager({
  articles,
  authorNames,
  book,
  copy: pageCopy,
  focusedArticleId,
  language,
  onAssetChanged,
  onArticlePreview,
  onArticleReorder,
  onRename,
  orderStatus,
  section,
}: {
  articles: Article[];
  authorNames: Map<number, string>;
  book: Book;
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  language: Language;
  onAssetChanged: () => Promise<void>;
  onArticlePreview: (articleId: number) => void;
  onArticleReorder: (articleIds: number[]) => Promise<boolean>;
  onRename: (section: BookLayoutSection, name: string) => Promise<boolean>;
  orderStatus: ArticleOrderSaveStatus;
  section: BookLayoutSection;
}) {
  const label = getSectionLabel(section, pageCopy);
  return (
    <section className="min-h-[590px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <header className="flex h-14 items-center justify-between border-b border-border px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {pageCopy.resources}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-foreground">
            {label}
          </h2>
        </div>
        <Badge
          className={cn(
            "rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]",
            section.kind === "articles" || section.file
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {section.kind === "articles"
            ? pageCopy.automatic
            : section.file
              ? pageCopy.imported
              : pageCopy.notImported}
        </Badge>
      </header>

      {section.kind === "articles" ? (
        <MainContentManager
          articles={articles}
          authorNames={authorNames}
          copy={pageCopy}
          focusedArticleId={focusedArticleId}
          onArticlePreview={onArticlePreview}
          onReorder={onArticleReorder}
          orderStatus={orderStatus}
        />
      ) : (
        <PageAssetManager
          book={book}
          copy={pageCopy}
          language={language}
          onAssetChanged={onAssetChanged}
          onRename={onRename}
          section={section}
        />
      )}
    </section>
  );
}

function PageAssetManager({
  book,
  copy: pageCopy,
  language,
  onAssetChanged,
  onRename,
  section,
}: {
  book: Book;
  copy: (typeof copy)[Language];
  language: Language;
  onAssetChanged: () => Promise<void>;
  onRename: (section: BookLayoutSection, name: string) => Promise<boolean>;
  section: BookLayoutSection;
}) {
  const file = section.file;
  const isCover = section.preset === "cover" || section.preset === "back_cover";
  const uploadType = getUploadType(section);
  const inputRef = useRef<HTMLInputElement>(null);
  const [metadata, setMetadata] = useState<UploadedFileMetadata | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showWordMessage, setShowWordMessage] = useState(false);
  const uploadLabel =
    section.preset === "cover"
      ? pageCopy.uploadCover
      : section.preset === "back_cover"
        ? pageCopy.uploadBackCover
        : pageCopy.selectFile;
  const previewUrl = uploadType
    ? uploadRepository.getFileUrl(book.id, uploadType)
    : null;

  useEffect(() => {
    setMetadata(null);
    setErrorMessage(null);
    setShowWordMessage(false);
    if (!file || !uploadType) return;

    let active = true;
    uploadRepository
      .getMetadata(book.id, uploadType, file)
      .then((value) => active && setMetadata(value))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [book.id, file, uploadType]);

  const chooseFile = () => inputRef.current?.click();
  const handleFile = async (selectedFile: File | undefined) => {
    if (!selectedFile || !uploadType) return;
    const validationError = validateUploadFile(selectedFile, uploadType);
    if (validationError) {
      const message =
        validationError === "file_too_large"
          ? pageCopy.fileTooLarge
          : pageCopy.unsupportedFormat;
      setErrorMessage(message);
      toast.error(message);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setErrorMessage(null);
    setProgress(0);
    try {
      const uploaded = await uploadRepository.upload(
        book.id,
        uploadType,
        selectedFile,
        setProgress,
      );
      setMetadata(uploaded);
      setProgress(100);
      toast.success(pageCopy.uploadSuccess);
      await onAssetChanged();
    } catch (error) {
      const code = getUploadErrorCode(error);
      const message =
        code === "file_too_large"
          ? pageCopy.fileTooLarge
          : code === "unsupported_file_format"
            ? pageCopy.unsupportedFormat
            : pageCopy.uploadFailed;
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  const deleteFile = async () => {
    if (!uploadType) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await uploadRepository.delete(book.id, uploadType);
      setMetadata(null);
      toast.success(pageCopy.deleteSuccess);
      await onAssetChanged();
    } catch {
      setErrorMessage(pageCopy.deleteFailed);
      toast.error(pageCopy.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };
  const previewFile = () => {
    if (!file || !previewUrl) return;
    if (getFileExtension(file) === "DOCX") {
      setShowWordMessage(true);
      return;
    }
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-5 sm:p-6">
      <SectionNameEditor
        copy={pageCopy}
        onRename={onRename}
        section={section}
      />
      {file ? (
        <div className="rounded-xl border border-border bg-muted/25 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-blue-400">
              {isImageFile(file) ? (
                <FileImage className="size-4" />
              ) : (
                <FileText className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {getFileName(file)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {getFileExtension(file)}
              </p>
            </div>
          </div>
          {isImageFile(file) && previewUrl ? (
            <img
              alt={getFileName(file)}
              className="mt-4 max-h-64 w-full rounded-lg border border-border bg-background object-contain"
              src={previewUrl}
            />
          ) : null}
          <dl className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <FileMetadata
              label={pageCopy.fileSize}
              value={metadata ? formatFileSize(metadata.file_size) : "—"}
            />
            <FileMetadata
              label={pageCopy.uploadedAt}
              value={formatDate(metadata?.uploaded_at ?? book.updated_at, language)}
            />
          </dl>
          {showWordMessage ? (
            <p className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2.5 text-xs leading-5 text-blue-300">
              {pageCopy.wordUploaded}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              className="h-9 rounded-lg px-3 text-xs"
              disabled={progress !== null || isDeleting}
              onClick={previewFile}
              type="button"
              variant="outline"
            >
              <FileImage className="mr-2 size-3.5" />
              {pageCopy.preview}
            </Button>
            <Button
              className="h-9 rounded-lg px-3 text-xs"
              disabled={progress !== null || isDeleting || !uploadType}
              onClick={chooseFile}
              type="button"
              variant="outline"
            >
              <Replace className="mr-2 size-3.5" />
              {pageCopy.replace}
            </Button>
            <Button
              className="h-9 rounded-lg px-3 text-xs"
              disabled={progress !== null || isDeleting || !uploadType}
              onClick={() => void deleteFile()}
              type="button"
              variant="outline"
            >
              {isDeleting ? (
                <LoaderCircle className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-3.5" />
              )}
              {isDeleting ? pageCopy.deleting : pageCopy.delete}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
            {isCover ? <Image className="size-4" /> : <Files className="size-4" />}
          </span>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            {pageCopy.emptyTitle}
          </h3>
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
            {isCover ? pageCopy.coverRecommendation : pageCopy.emptyDescription}
          </p>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {pageCopy.supportedFormats}
        </p>
        {isCover ? (
          <>
            <p className="mt-3 text-sm font-medium text-foreground">
              {pageCopy.coverFormats}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {pageCopy.coverRecommendation}
            </p>
          </>
        ) : (
          <>
            <FormatRow label={pageCopy.recommendedFormat} value={pageCopy.docx} />
            <FormatRow
              label={pageCopy.compatibleFormats}
              value="PDF · PNG · JPG · JPEG · WEBP"
            />
            <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              {pageCopy.formatExplanation}
            </p>
          </>
        )}
      </div>

      {progress !== null ? (
        <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-blue-300">
            <span>{pageCopy.uploading}</span>
            <span>{progress}%</span>
          </div>
          <Progress className="mt-3 h-1.5" value={progress} />
        </div>
      ) : null}
      <input
        accept={getAcceptedFormats(uploadType)}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />
      {!file ? (
        <Button
          className="mt-5 w-full"
          disabled={!uploadType || progress !== null}
          onClick={chooseFile}
          type="button"
        >
          <Upload className="mr-2 size-4" />
          {uploadLabel}
        </Button>
      ) : null}
      <p
        className={cn(
          "mt-2 text-center text-[11px]",
          errorMessage ? "text-rose-400" : "text-muted-foreground",
        )}
      >
        {errorMessage ||
          (uploadType ? pageCopy.maxFileSize : pageCopy.unsupportedPageType)}
      </p>
    </div>
  );
}

function SectionNameEditor({
  copy: pageCopy,
  onRename,
  section,
}: {
  copy: (typeof copy)[Language];
  onRename: (section: BookLayoutSection, name: string) => Promise<boolean>;
  section: BookLayoutSection;
}) {
  const currentLabel = getSectionLabel(section, pageCopy);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentLabel);

  useEffect(() => {
    setName(currentLabel);
    setIsEditing(false);
  }, [currentLabel, section.id]);

  const saveName = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    if (await onRename(section, trimmedName)) setIsEditing(false);
  };

  return (
    <div className="mb-5 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {pageCopy.sectionName}
          </p>
          {!isEditing ? (
            <p className="mt-1 text-sm font-medium text-foreground">
              {currentLabel}
            </p>
          ) : null}
        </div>
        {!isEditing ? (
          <button
            aria-label={pageCopy.renameSection}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            <Pencil className="size-3.5" />
          </button>
        ) : null}
      </div>
      {isEditing ? (
        <div className="mt-3 flex gap-2">
          <Input
            aria-label={pageCopy.sectionName}
            className="h-9 rounded-lg px-3 text-xs"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void saveName();
            }}
            value={name}
          />
          <button
            aria-label={pageCopy.saveName}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            disabled={!name.trim()}
            onClick={() => void saveName()}
            type="button"
          >
            <Check className="size-3.5" />
          </button>
          <button
            aria-label={pageCopy.cancel}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
            onClick={() => {
              setName(currentLabel);
              setIsEditing(false);
            }}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MainContentManager({
  articles,
  authorNames,
  copy: pageCopy,
  focusedArticleId,
  onArticlePreview,
  onReorder,
  orderStatus,
}: {
  articles: Article[];
  authorNames: Map<number, string>;
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  onArticlePreview: (articleId: number) => void;
  onReorder: (articleIds: number[]) => Promise<boolean>;
  orderStatus: ArticleOrderSaveStatus;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const finishSorting = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || orderStatus === "saving") return;
    const oldIndex = articles.findIndex((article) => article.id === active.id);
    const newIndex = articles.findIndex((article) => article.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    void onReorder(
      arrayMove(articles, oldIndex, newIndex).map((article) => article.id),
    );
  };
  const orderMessage =
    orderStatus === "saving"
      ? pageCopy.savingArticleOrder
      : orderStatus === "saved"
        ? pageCopy.articleOrderSaved
        : orderStatus === "error"
          ? pageCopy.articleOrderSaveError
          : pageCopy.articleOrderHint;

  return (
    <div className="p-5 sm:p-6">
      <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.06] p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <BookOpenText className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {pageCopy.articlesHeading(articles.length)}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
              {pageCopy.articlesSource}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              {pageCopy.templateControlled}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              {pageCopy.bodyLocked}
            </p>
            <p
              className={cn(
                "mt-1 text-xs leading-5",
                orderStatus === "error"
                  ? "text-rose-400"
                  : orderStatus === "saved"
                    ? "text-emerald-400"
                    : "text-blue-300",
              )}
            >
              {orderMessage}
            </p>
          </div>
        </div>
      </div>

      {articles.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[64px_minmax(0,1fr)_minmax(90px,0.45fr)] gap-3 border-b border-border bg-muted/35 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>{pageCopy.number}</span>
            <span>{pageCopy.sections.articles}</span>
            <span>{pageCopy.author}</span>
          </div>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={finishSorting}
            sensors={sensors}
          >
            <SortableContext
              items={articles.map((article) => article.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="max-h-[380px] divide-y divide-border overflow-y-auto">
                {articles.map((article) => (
                  <SortableArticleRow
                    article={article}
                    authorName={
                      authorNames.get(article.author_id) ??
                      `${pageCopy.author} #${article.author_id}`
                    }
                    copy={pageCopy}
                    disabled={orderStatus === "saving"}
                    focused={focusedArticleId === article.id}
                    key={article.id}
                    onPreview={onArticlePreview}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="mt-5 flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
          <BookOpenText className="size-5 text-muted-foreground" />
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            {pageCopy.noArticles}
          </h3>
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
            {pageCopy.noArticlesDescription}
          </p>
        </div>
      )}
    </div>
  );
}

function SortableArticleRow({
  article,
  authorName,
  copy: pageCopy,
  disabled,
  focused,
  onPreview,
}: {
  article: Article;
  authorName: string;
  copy: (typeof copy)[Language];
  disabled: boolean;
  focused: boolean;
  onPreview: (articleId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: article.id, disabled });

  return (
    <div
      className={cn(
        "flex items-center bg-card transition-colors hover:bg-muted/40",
        focused && "bg-blue-500/[0.08]",
        isDragging && "relative z-10 opacity-70 shadow-lg",
      )}
      data-article-row={article.id}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`${pageCopy.preview}: ${article.title}`}
        className="grid min-w-0 flex-1 cursor-grab touch-none grid-cols-[64px_minmax(0,1fr)_minmax(90px,0.45fr)] items-center gap-3 px-4 py-3 text-left active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/30"
        onClick={() => onPreview(article.id)}
        type="button"
      >
        <span className="font-mono text-xs text-muted-foreground">
          {article.number || "—"}
        </span>
        <span className="truncate text-sm font-medium text-foreground">
          {article.title}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {authorName}
        </span>
      </button>
    </div>
  );
}

function PublicationStructurePreview({
  articles,
  authorNames,
  book,
  copy: pageCopy,
  focusedArticleId,
  onBack,
  onPreview,
  previewSection,
  selected,
  sections,
  template,
}: {
  articles: Article[];
  authorNames: Map<number, string>;
  book: Book;
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  onBack: () => void;
  onPreview: (section: BookLayoutSection) => void;
  previewSection: BookLayoutSection | null;
  selected: BookLayoutSection;
  sections: BookLayoutSection[];
  template: Template;
}) {
  return (
    <aside className="overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-24 xl:max-h-[calc(100vh-7.5rem)]">
      <header className="flex items-center justify-between border-b border-border px-4 py-4">
        <div>
          <h2 className="text-xs font-semibold text-foreground">
            {pageCopy.publicationPreview}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {previewSection
              ? getSectionLabel(previewSection, pageCopy)
              : pageCopy.completeStructure}
          </p>
        </div>
        {previewSection ? (
          <button
            aria-label={pageCopy.backToStructure}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="size-3" />
            {pageCopy.backToStructure}
          </button>
        ) : (
          <Badge className="rounded-md text-[9px]">
            {pageCopy.placeholder}
          </Badge>
        )}
      </header>
      {previewSection ? (
        <SectionFullPreview
          articles={articles}
          authorNames={authorNames}
          book={book}
          copy={pageCopy}
          focusedArticleId={focusedArticleId}
          section={previewSection}
          template={template}
        />
      ) : (
        <div className="overflow-y-auto bg-muted/30 p-4 xl:max-h-[calc(100vh-12rem)]">
          <p className="mb-4 text-center text-[11px] leading-5 text-muted-foreground">
            {pageCopy.previewHint}
          </p>
          {sections.map((section, index) => {
            const SectionIcon = getSectionIcon(section);
            const label = getSectionLabel(section, pageCopy);
            return (
              <div key={section.id}>
                <button
                  className={cn(
                    "mx-auto flex min-h-20 w-full max-w-[220px] items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-blue-500/35 hover:bg-blue-500/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    selected.id === section.id
                      ? "border-blue-500/35 ring-2 ring-blue-500/10"
                      : "border-border",
                  )}
                  onClick={() => onPreview(section)}
                  type="button"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <SectionIcon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-foreground">
                      {label}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                      {section.kind === "articles"
                        ? pageCopy.articlesHeading(articles.length)
                        : section.file
                          ? getFileName(section.file)
                          : pageCopy.notImported}
                    </span>
                  </span>
                </button>
                {index < sections.length - 1 ? (
                  <ArrowDown className="mx-auto my-1.5 size-3.5 text-muted-foreground/60" />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function SectionFullPreview({
  articles,
  authorNames,
  book,
  copy: pageCopy,
  focusedArticleId,
  section,
  template,
}: {
  articles: Article[];
  authorNames: Map<number, string>;
  book: Book;
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  section: BookLayoutSection;
  template: Template;
}) {
  return (
    <div className="overflow-y-auto bg-muted/30 p-4 xl:max-h-[calc(100vh-12rem)]">
      <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {pageCopy.fullPreview}
      </p>
      {section.kind === "articles" ? (
        <ArticleSectionPreview
          articles={articles}
          authorNames={authorNames}
          copy={pageCopy}
          focusedArticleId={focusedArticleId}
          template={template}
        />
      ) : (
        <PageSectionPreview
          book={book}
          copy={pageCopy}
          section={section}
          template={template}
        />
      )}
    </div>
  );
}

function PageSectionPreview({
  book,
  copy: pageCopy,
  section,
  template,
}: {
  book: Book;
  copy: (typeof copy)[Language];
  section: BookLayoutSection;
  template: Template;
}) {
  const file = section.file;
  const isCover = section.preset === "cover" || section.preset === "back_cover";
  const label = getSectionLabel(section, pageCopy);

  return (
    <article
      className="mx-auto flex w-full max-w-[250px] flex-col overflow-hidden bg-[#fffefa] text-slate-800 shadow-[0_18px_50px_rgba(0,0,0,0.4)] ring-1 ring-black/10"
      style={{
        aspectRatio: getPreviewAspectRatio(template),
        padding: previewPageMargins[template.pageMargin],
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        {isCover && !file ? (
          <>
            <Image className="size-7 text-slate-300" />
            <h3 className="mt-6 font-serif text-xl font-semibold tracking-[-0.04em] text-slate-900">
              {book.title}
            </h3>
            <p className="mt-3 text-[10px] text-slate-500">
              {label} · {pageCopy.notImported}
            </p>
          </>
        ) : (
          <>
            <FileText className="size-7 text-slate-300" />
            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              {label}
            </h3>
            <p className="mt-3 break-all text-[10px] leading-5 text-slate-500">
              {file ? getFileName(file) : pageCopy.emptyTitle}
            </p>
            {file ? (
              <p className="mt-4 text-[10px] leading-4 text-slate-400">
                {pageCopy.filePreviewPending}
              </p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

function ArticleSectionPreview({
  articles,
  authorNames,
  copy: pageCopy,
  focusedArticleId,
  template,
}: {
  articles: Article[];
  authorNames: Map<number, string>;
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  template: Template;
}) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const pages = useMemo(
    () =>
      articles.flatMap((article) =>
        paginateArticle(
          article.content || "—",
          article.image ?? "",
          -1,
          template,
        ).map((page, articlePageIndex) => ({
          article,
          articlePageIndex,
          page,
        })),
      ),
    [articles, template],
  );

  useEffect(() => {
    if (focusedArticleId === null) return;
    const pageList = pagesRef.current;
    const scrollContainer = pageList?.parentElement;
    const target = pageList?.querySelector<HTMLElement>(
      `[data-article-first-page="${focusedArticleId}"]`,
    );
    if (!pageList || !scrollContainer || !target) return;
    scrollContainer.scrollTop = target.offsetTop - pageList.offsetTop;
  }, [focusedArticleId, pages]);

  if (!articles.length) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-5 text-center">
        <BookOpenText className="size-5 text-muted-foreground" />
        <h3 className="mt-4 text-sm font-semibold text-foreground">
          {pageCopy.noArticles}
        </h3>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {pageCopy.noArticlesDescription}
        </p>
      </div>
    );
  }

  const previewScale = 0.54;
  const titleSize = Math.max(
    10,
    Math.min(template.titleSize * previewScale, 18),
  );
  const bodySize = Math.max(
    7.5,
    Math.min(template.bodySize * previewScale, 9.5),
  );

  return (
    <div className="space-y-4" ref={pagesRef}>
      {pages.map(({ article, articlePageIndex, page }, pageIndex) => {
        const isFirstPage = articlePageIndex === 0;
        const authorName =
          authorNames.get(article.author_id) ??
          `${pageCopy.author} #${article.author_id}`;

        return (
          <article
            className={cn(
              "mx-auto flex w-full max-w-[250px] flex-col overflow-hidden bg-[#fffefa] text-slate-800 shadow-[0_18px_50px_rgba(0,0,0,0.4)] ring-black/10",
              focusedArticleId === article.id && isFirstPage
                ? "ring-2 ring-blue-500/40"
                : "ring-1",
            )}
            data-article-first-page={isFirstPage ? article.id : undefined}
            key={`${article.id}-${articlePageIndex}`}
            style={{
              aspectRatio: getPreviewAspectRatio(template),
              padding: previewPageMargins[template.pageMargin],
            }}
          >
            {isFirstPage ? (
              <>
                {template.showNumber &&
                template.numberPosition === "above" ? (
                  <p
                    className="text-[8px] font-medium tracking-[0.14em] text-slate-400"
                    style={{ textAlign: template.titleAlign }}
                  >
                    {article.number || "—"}
                  </p>
                ) : null}
                <div
                  className={cn(
                    "mt-2",
                    template.showNumber && template.numberPosition === "left"
                      ? "grid grid-cols-[auto_1fr] items-baseline gap-2"
                      : "block",
                  )}
                >
                  {template.showNumber &&
                  template.numberPosition === "left" ? (
                    <span className="text-[8px] font-medium tracking-[0.14em] text-slate-400">
                      {article.number || "—"}
                    </span>
                  ) : null}
                  <h3
                    className="text-slate-950"
                    style={{
                      fontFamily: getFontFamilyStyle(template.titleFont),
                      fontSize: `${titleSize}px`,
                      fontWeight: template.titleBold ? 700 : 400,
                      lineHeight: 1.25,
                      textAlign: template.titleAlign,
                    }}
                  >
                    {article.title}
                  </h3>
                </div>
                <p
                  className="mt-1 text-[7px] text-slate-500"
                  style={{ textAlign: template.titleAlign }}
                >
                  {authorName}
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 text-[7px] text-slate-400">
                <span className="truncate">{article.title}</span>
                <span className="shrink-0">{authorName}</span>
              </div>
            )}

            <div
              className="min-h-0 flex-1 overflow-hidden break-words whitespace-pre-wrap text-slate-700"
              style={{
                fontFamily: getFontFamilyStyle(template.bodyFont),
                fontSize: `${bodySize}px`,
                lineHeight: template.lineHeight,
                marginTop: isFirstPage
                  ? `${template.titleSpacing * previewScale}px`
                  : "8px",
                textAlign: template.justify ? "justify" : "left",
              }}
            >
              {page.lines.map((line, lineIndex) => (
                <p
                  key={`${lineIndex}-${line.slice(0, 12)}`}
                  style={{
                    minHeight: `${template.lineHeight}em`,
                    textIndent: line ? `${template.firstLineIndent}em` : 0,
                  }}
                >
                  {line || "\u00a0"}
                </p>
              ))}
            </div>

            {page.showImage && article.image ? (
              <img
                alt={article.title}
                className="mt-2 max-h-[32%] self-center rounded-sm object-contain"
                src={article.image}
                style={{ width: `${template.imageMaxWidth}%` }}
              />
            ) : null}

            {template.pageNumberPosition !== "hidden" ? (
              <footer
                className={cn(
                  "mt-3 flex text-[7px] tracking-[0.12em] text-slate-300",
                  template.pageNumberPosition === "right"
                    ? "justify-end"
                    : "justify-center",
                )}
              >
                — {pageIndex + 1} —
              </footer>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function FileMetadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function FormatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function getBookSections(book: Book): BookLayoutSection[] {
  if (book.layout_sections?.length) {
    return book.layout_sections.map((section) => ({ ...section }));
  }
  return [
    { id: "cover", kind: "page", preset: "cover", name: null, file: book.cover_file },
    {
      id: "preface",
      kind: "page",
      preset: "preface",
      name: null,
      file: book.preface_file,
    },
    { id: "articles", kind: "articles", preset: "articles", name: null, file: null },
    {
      id: "afterword",
      kind: "page",
      preset: "afterword",
      name: null,
      file: book.afterword_file,
    },
    {
      id: "acknowledgement",
      kind: "page",
      preset: "acknowledgement",
      name: null,
      file: book.acknowledgement_file,
    },
    {
      id: "back_cover",
      kind: "page",
      preset: "back_cover",
      name: null,
      file: book.back_cover_file,
    },
  ];
}

function getPresetLabel(
  preset: LayoutSectionPreset,
  pageCopy: (typeof copy)[Language],
) {
  return pageCopy.sections[preset];
}

function getSectionLabel(
  section: BookLayoutSection,
  pageCopy: (typeof copy)[Language],
) {
  return section.preset
    ? getPresetLabel(section.preset, pageCopy)
    : section.name || pageCopy.emptyTitle;
}

function getFileName(file: string) {
  return file.split(/[\\/]/).pop() || file;
}

function getFileExtension(file: string) {
  const name = getFileName(file);
  const extension = name.includes(".") ? name.split(".").pop() : null;
  return extension?.toUpperCase() || "FILE";
}

function getUploadType(section: BookLayoutSection): UploadType | null {
  switch (section.preset) {
    case "cover":
    case "preface":
    case "afterword":
    case "acknowledgement":
    case "back_cover":
      return section.preset;
    default:
      return null;
  }
}

function getAcceptedFormats(uploadType: UploadType | null) {
  if (!uploadType) return "";
  if (uploadType === "cover" || uploadType === "back_cover") {
    return ".pdf,.png,.jpg,.jpeg,.webp";
  }
  return ".docx,.pdf,.png,.jpg,.jpeg,.webp";
}

function validateUploadFile(file: File, uploadType: UploadType) {
  if (file.size > maxUploadSize) return "file_too_large" as const;
  const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  const accepted = getAcceptedFormats(uploadType).split(",");
  return accepted.includes(extension) ? null : ("unsupported_file_format" as const);
}

function isImageFile(file: string) {
  return ["PNG", "JPG", "JPEG", "WEBP"].includes(getFileExtension(file));
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(value: string, language: Language) {
  const parts = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(value));
  const datePart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
}

function getSectionIcon(section: BookLayoutSection) {
  if (section.preset === "cover" || section.preset === "back_cover") return Image;
  if (section.kind === "articles") return BookOpenText;
  return FileText;
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
