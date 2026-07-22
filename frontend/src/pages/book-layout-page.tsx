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
  ArrowUp,
  ArrowUpDown,
  BookOpenText,
  Check,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  Files,
  ListOrdered,
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

import { AppearanceEditor } from "@/components/book-appearance/appearance-editor";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { PublicationPageFooter } from "@/components/publication-page-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { useBookTemplate } from "@/hooks/use-book-template";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getTemplateAssetUrl } from "@/mock/template-catalog";
import {
  paginateArticle,
  PublicationArticlePreview,
  type PublicationPreviewArticle,
} from "@/components/author-editor/live-article-preview";
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
  type LayoutSectionPreset,
} from "@/repositories/bookRepository";
import { templateRepository } from "@/repositories/templateRepository";
import {
  getUploadErrorCode,
  uploadRepository,
  type UploadedFileMetadata,
  type UploadType,
} from "@/repositories/uploadRepository";
import {
  getFontFamilyStyle,
  publicationChromeFontFamily,
  type Template,
} from "@/types/template";
import { toast } from "sonner";

type StructureSaveStatus = "idle" | "saving" | "saved" | "error";
type ArticleOrderSaveStatus = StructureSaveStatus;
type NumberAssignmentStatus = StructureSaveStatus;
type ArticlePageModeSaveStatus = StructureSaveStatus;
type ArticleSortKey = "number" | "title" | "author";
type SortDirection = "asc" | "desc";

const commonSectionPresets: LayoutSectionPreset[] = [
  "preface",
  "principal_message",
  "teacher_message",
  "afterword",
  "closing",
  "acknowledgement",
  "ending",
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
  const [selectedSectionId, setSelectedSectionId] = useState("cover");
  const [previewSectionId, setPreviewSectionId] = useState<string | null>(null);
  const [focusedArticleId, setFocusedArticleId] = useState<number | null>(null);
  const [structureStatus, setStructureStatus] =
    useState<StructureSaveStatus>("idle");
  const [articleOrderStatus, setArticleOrderStatus] =
    useState<ArticleOrderSaveStatus>("idle");
  const [articlePageModeStatus, setArticlePageModeStatus] =
    useState<ArticlePageModeSaveStatus>("idle");
  const [numberAssignmentStatus, setNumberAssignmentStatus] =
    useState<NumberAssignmentStatus>("idle");
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
    () => new Map(authors.map((author) => [author.id, author.class_name ? `${author.name} · ${author.class_name}` : author.name])),
    [authors],
  );
  const selectedSection =
    sections.find((section) => section.id === selectedSectionId) ?? sections[0];
  const previewSection =
    sections.find((section) => section.id === previewSectionId) ?? null;
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
    setNumberAssignmentStatus("idle");
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
  const persistArticlePageMode = async (mode: Book["layout_article_page_mode"]) => {
    if (!book || mode === book.layout_article_page_mode) return true;
    const previousMode = book.layout_article_page_mode;
    setBook((current) =>
      current ? { ...current, layout_article_page_mode: mode } : current,
    );
    setArticlePageModeStatus("saving");
    try {
      const updatedBook = await bookRepository.update(book.id, {
        layout_article_page_mode: mode,
      });
      const persistedBook = await bookRepository.get(book.id);
      if (
        updatedBook.layout_article_page_mode !== mode ||
        persistedBook.layout_article_page_mode !== mode
      ) {
        throw new Error("Article pagination mode was not persisted");
      }
      setBook(persistedBook);
      setArticlePageModeStatus("saved");
      return true;
    } catch {
      setBook((current) =>
        current
          ? { ...current, layout_article_page_mode: previousMode }
          : current,
      );
      setArticlePageModeStatus("error");
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
  const assignNumbersInCurrentOrder = async () => {
    if (!book || book.number_mode !== "automatic" || !approvedArticles.length) {
      return false;
    }
    setNumberAssignmentStatus("saving");
    try {
      const updatedArticles = await articleRepository.assignNumbers(
        book.id,
        approvedArticles.map((article) => article.id),
      );
      const updates = new Map(
        updatedArticles.map((article) => [article.id, article]),
      );
      setArticles((current) =>
        current.map((article) => updates.get(article.id) ?? article),
      );
      setBook((current) =>
        current
          ? {
              ...current,
              layout_article_order: updatedArticles.map((article) => article.id),
            }
          : current,
      );
      setNumberAssignmentStatus("saved");
      toast.success(pageCopy.numbersAssigned);
      return true;
    } catch {
      setNumberAssignmentStatus("error");
      toast.error(pageCopy.numberAssignmentError);
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
      hidden: false,
      show_author: true,
      show_class: false,
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
        setSelectedSectionId(contentsSection.id);
        setPreviewSectionId(contentsSection.id);
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
      setSelectedSectionId(nextContents.id);
      setPreviewSectionId(nextContents.id);
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
  const renameSection = async (section: BookLayoutSection, name: string) => {
    if (isFixedLayoutSection(section)) return false;
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

function StructurePanel({
  copy: pageCopy,
  onAdd,
  onSetHidden,
  onReorder,
  onSelect,
  selected,
  sections,
  status,
}: {
  copy: (typeof copy)[Language];
  onAdd: (preset: LayoutSectionPreset | null, name: string | null) => Promise<void>;
  onSetHidden: (section: BookLayoutSection) => Promise<boolean>;
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
                onSetHidden={onSetHidden}
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
  onSetHidden,
  onSelect,
  section,
  selected,
}: {
  copy: (typeof copy)[Language];
  disabled: boolean;
  index: number;
  onSetHidden: (section: BookLayoutSection) => Promise<boolean>;
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
        section.hidden && "opacity-55",
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
            {section.hidden
              ? pageCopy.sectionHidden
              : section.kind === "articles"
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
      {isHideableLayoutSection(section) ? (
        <button
          aria-label={`${section.hidden ? pageCopy.showSection : pageCopy.hideSection}: ${label}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground focus:opacity-100 group-hover:opacity-100"
          disabled={disabled}
          onClick={() => void onSetHidden(section)}
          type="button"
        >
          {section.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
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
  articlePageMode,
  language,
  articlePageModeStatus,
  onAssetChanged,
  onArticlePreview,
  onArticlePageModeChange,
  onArticleReorder,
  onAssignNumbers,
  onRename,
  onOpenAppearanceStudio,
  numberAssignmentStatus,
  orderStatus,
  section,
}: {
  articles: Article[];
  authorNames: Map<number, string>;
  book: Book;
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  language: Language;
  articlePageMode: Book["layout_article_page_mode"];
  articlePageModeStatus: ArticlePageModeSaveStatus;
  onAssetChanged: () => Promise<void>;
  onArticlePreview: (articleId: number) => void;
  onArticlePageModeChange: (
    mode: Book["layout_article_page_mode"],
  ) => Promise<boolean>;
  onArticleReorder: (articleIds: number[]) => Promise<boolean>;
  onAssignNumbers: () => Promise<boolean>;
  onRename: (section: BookLayoutSection, name: string) => Promise<boolean>;
  onOpenAppearanceStudio: () => void;
  numberAssignmentStatus: NumberAssignmentStatus;
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
          articlePageMode={articlePageMode}
          articlePageModeStatus={articlePageModeStatus}
          numberAssignmentStatus={numberAssignmentStatus}
          onArticlePreview={onArticlePreview}
          onArticlePageModeChange={onArticlePageModeChange}
          onAssignNumbers={onAssignNumbers}
          onReorder={onArticleReorder}
          orderStatus={orderStatus}
          showNumberAssignment={book.number_mode === "automatic"}
        />
      ) : (
        <PageAssetManager
          book={book}
          copy={pageCopy}
          language={language}
          onAssetChanged={onAssetChanged}
          onRename={onRename}
          onOpenAppearanceStudio={onOpenAppearanceStudio}
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
  onOpenAppearanceStudio,
  section,
}: {
  book: Book;
  copy: (typeof copy)[Language];
  language: Language;
  onAssetChanged: () => Promise<void>;
  onRename: (section: BookLayoutSection, name: string) => Promise<boolean>;
  onOpenAppearanceStudio: () => void;
  section: BookLayoutSection;
}) {
  const file = section.file;
  const isCover = section.preset === "cover" || section.preset === "back_cover";
  const hasUploadedFile = Boolean(file);
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
      {hasUploadedFile ? (
        <div className="rounded-xl border border-border bg-muted/25 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-blue-400">
              {isImageFile(file ?? "") ? (
                <FileImage className="size-4" />
              ) : (
                <FileText className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {getFileName(file ?? "")}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {getFileExtension(file ?? "")}
              </p>
            </div>
          </div>
          {isImageFile(file ?? "") && previewUrl ? (
            <img
              alt={getFileName(file ?? "")}
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
            {!isCover ? (
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
            ) : null}
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

      {isCover ? (
        <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
          <Button
            className="w-full"
            disabled={progress !== null || isDeleting}
            onClick={onOpenAppearanceStudio}
            type="button"
            variant="outline"
          >
            <Image className="mr-2 size-4" />
            {pageCopy.useAppearanceStudio}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            {pageCopy.uploadCoverHint}
          </p>
        </div>
      ) : null}

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
  const canRename = !isFixedLayoutSection(section);
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
        {!isEditing && canRename ? (
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
  articlePageMode,
  articlePageModeStatus,
  numberAssignmentStatus,
  onArticlePreview,
  onArticlePageModeChange,
  onAssignNumbers,
  onReorder,
  orderStatus,
  showNumberAssignment,
}: {
  articles: Article[];
  authorNames: Map<number, string>;
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  articlePageMode: Book["layout_article_page_mode"];
  articlePageModeStatus: ArticlePageModeSaveStatus;
  numberAssignmentStatus: NumberAssignmentStatus;
  onArticlePreview: (articleId: number) => void;
  onArticlePageModeChange: (
    mode: Book["layout_article_page_mode"],
  ) => Promise<boolean>;
  onAssignNumbers: () => Promise<boolean>;
  onReorder: (articleIds: number[]) => Promise<boolean>;
  orderStatus: ArticleOrderSaveStatus;
  showNumberAssignment: boolean;
}) {
  const [sortConfig, setSortConfig] = useState<{
    key: ArticleSortKey;
    direction: SortDirection;
  } | null>(null);
  const isBusy =
    orderStatus === "saving" || numberAssignmentStatus === "saving";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const finishSorting = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || isBusy) return;
    const oldIndex = articles.findIndex((article) => article.id === active.id);
    const newIndex = articles.findIndex((article) => article.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setSortConfig(null);
    void onReorder(
      arrayMove(articles, oldIndex, newIndex).map((article) => article.id),
    );
  };
  const sortArticles = (key: ArticleSortKey) => {
    if (isBusy) return;
    const direction: SortDirection =
      sortConfig?.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
    const articleIds = [...articles]
      .sort((left, right) =>
        compareLayoutArticles(left, right, key, direction, authorNames),
      )
      .map((article) => article.id);
    void onReorder(articleIds).then((saved) => {
      if (!saved) setSortConfig(null);
    });
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
          <div className="min-w-0 flex-1">
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
            <div className="mt-4 grid gap-3 border-t border-blue-500/15 pt-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  htmlFor="layout-article-page-mode"
                >
                  {pageCopy.articlePageMode}
                </label>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {pageCopy.articlePageModeHint}
                </p>
              </div>
              <div>
                <Select
                  className="h-9 text-xs"
                  disabled={articlePageModeStatus === "saving"}
                  id="layout-article-page-mode"
                  onChange={(event) =>
                    void onArticlePageModeChange(
                      event.target.value as Book["layout_article_page_mode"],
                    )
                  }
                  value={articlePageMode}
                >
                  <option value="single">{pageCopy.singleArticlePage}</option>
                  <option value="flow">{pageCopy.flowArticles}</option>
                </Select>
                <p
                  className={cn(
                    "mt-1 text-[10px] leading-4",
                    articlePageModeStatus === "error"
                      ? "text-rose-400"
                      : articlePageModeStatus === "saved"
                        ? "text-emerald-400"
                        : "text-muted-foreground",
                  )}
                >
                  {articlePageModeStatus === "saving"
                    ? pageCopy.savingArticlePageMode
                    : articlePageModeStatus === "saved"
                      ? pageCopy.articlePageModeSaved
                      : articlePageModeStatus === "error"
                        ? pageCopy.articlePageModeSaveError
                        : articlePageMode === "flow"
                          ? pageCopy.flowArticles
                          : pageCopy.singleArticlePage}
                </p>
              </div>
            </div>
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
            {showNumberAssignment ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-blue-500/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm text-[11px] leading-4 text-muted-foreground">
                  {numberAssignmentStatus === "error"
                    ? pageCopy.numberAssignmentError
                    : numberAssignmentStatus === "saved"
                      ? pageCopy.numbersAssigned
                      : pageCopy.assignNumbersHint}
                </p>
                <Button
                  className="h-9 shrink-0 gap-1.5 px-3 text-xs"
                  disabled={!articles.length || isBusy}
                  onClick={() => void onAssignNumbers()}
                  type="button"
                  variant="outline"
                >
                  {numberAssignmentStatus === "saving" ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <ListOrdered className="size-3.5" />
                  )}
                  {numberAssignmentStatus === "saving"
                    ? pageCopy.assigningNumbers
                    : pageCopy.assignNumbersInOrder}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {articles.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[64px_minmax(0,1fr)_minmax(90px,0.45fr)] gap-3 border-b border-border bg-muted/35 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {(
              [
                ["number", pageCopy.number],
                ["title", pageCopy.sections.articles],
                ["author", pageCopy.author],
              ] as const
            ).map(([key, label]) => {
              const isActive = sortConfig?.key === key;
              const nextDirection =
                isActive && sortConfig.direction === "asc" ? "desc" : "asc";
              const SortIcon = isActive
                ? sortConfig.direction === "asc"
                  ? ArrowUp
                  : ArrowDown
                : ArrowUpDown;
              const sortLabel =
                nextDirection === "asc"
                  ? pageCopy.sortAscending(label)
                  : pageCopy.sortDescending(label);
              return (
                <button
                  aria-label={sortLabel}
                  aria-pressed={isActive}
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    isActive && "text-blue-400",
                  )}
                  disabled={isBusy}
                  key={key}
                  onClick={() => sortArticles(key)}
                  title={sortLabel}
                  type="button"
                >
                  <span className="truncate">{label}</span>
                  <SortIcon className="size-3 shrink-0" />
                </button>
              );
            })}
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
                    disabled={isBusy}
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
  authors,
  authorNames,
  book,
  copy: pageCopy,
  focusedArticleId,
  articlePageMode,
  language,
  onBack,
  onPreview,
  previewSection,
  selected,
  sections,
  template,
}: {
  articles: Article[];
  authors: Author[];
  authorNames: Map<number, string>;
  book: Book;
  articlePageMode: Book["layout_article_page_mode"];
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  language: Language;
  onBack: () => void;
  onPreview: (section: BookLayoutSection) => void;
  previewSection: BookLayoutSection | null;
  selected: BookLayoutSection;
  sections: BookLayoutSection[];
  template: Template;
}) {
  const visibleSections = sections.filter((section) => !section.hidden);
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
          authors={authors}
          authorNames={authorNames}
          book={book}
          copy={pageCopy}
          focusedArticleId={focusedArticleId}
          articlePageMode={articlePageMode}
          language={language}
          section={previewSection}
          template={template}
        />
      ) : (
        <div className="overflow-y-auto bg-muted/30 p-4 xl:max-h-[calc(100vh-12rem)]">
          <p className="mb-4 text-center text-[11px] leading-5 text-muted-foreground">
            {pageCopy.previewHint}
          </p>
          {visibleSections.map((section, index) => {
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
                {index < visibleSections.length - 1 ? (
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
  authors,
  authorNames,
  book,
  copy: pageCopy,
  focusedArticleId,
  articlePageMode,
  language,
  section,
  template,
}: {
  articles: Article[];
  authors: Author[];
  authorNames: Map<number, string>;
  book: Book;
  articlePageMode: Book["layout_article_page_mode"];
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  language: Language;
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
          bookTitle={book.title}
          copy={pageCopy}
          focusedArticleId={focusedArticleId}
          hasNumbering={book.number_mode !== "none"}
          articlePageMode={articlePageMode}
          language={language}
          template={template}
        />
      ) : (
        <PageSectionPreview
          articles={articles}
          authors={authors}
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
  section: BookLayoutSection;
  template: Template;
}) {
  if (section.preset === "contents") {
    return (
      <ContentsPagePreview
        articles={articles}
        authors={authors}
        book={book}
        copy={pageCopy}
        section={section}
        template={template}
      />
    );
  }
  const file = section.file;
  const isCover = section.preset === "cover" || section.preset === "back_cover";
  const isThemeCover = Boolean(
    file && /^theme:[a-z0-9-]+:(cover|cover_back)$/.test(file),
  );
  const label = getSectionLabel(section, pageCopy);
  const assetKind =
    section.preset === "cover"
      ? "cover"
      : section.preset === "back_cover"
        ? "cover_back"
        : section.preset === "ending"
          ? "ending"
          : "chapter";

  return (
    <article
      className="mx-auto flex w-full max-w-[250px] flex-col overflow-hidden text-slate-800 shadow-[0_18px_50px_rgba(0,0,0,0.4)] ring-1 ring-black/10"
      style={{
        aspectRatio: getPreviewAspectRatio(template),
        backgroundColor: template.backgroundColor,
        backgroundImage: `url(${getTemplateAssetUrl(template.templateId, assetKind)})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        padding: previewPageMargins[template.pageMargin],
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        {!file || isThemeCover ? (
          <>
            {isCover ? null : <p className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: template.accentColor }}>OpenClassBook</p>}
            {isCover ? (
              <CoverTypography
                compact
                credit={getCoverCredit(book)}
                subtitle={book.subtitle}
                templateId={template.templateId}
                title={book.title}
              />
            ) : (
              <>
                <h3
                  className="mt-6 text-2xl tracking-[0.08em]"
                  style={{
                    color: template.themeColor,
                    fontFamily: getCoverTitleFont(template.templateId),
                    fontWeight: 400,
                  }}
                >
                  {section.preset === "ending" ? pageCopy.sections.ending : label}
                </h3>
                <p className="mt-3 max-w-[160px] text-[10px] leading-5 text-slate-600">
                  {section.preset === "ending" ? "感谢阅读 · Thank you for reading" : book.title}
                </p>
              </>
            )}
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

function ArticleSectionPreview({
  articles,
  authorNames,
  bookTitle,
  copy: pageCopy,
  focusedArticleId,
  hasNumbering,
  articlePageMode,
  language,
  template,
}: {
  articles: Article[];
  authorNames: Map<number, string>;
  bookTitle: string;
  copy: (typeof copy)[Language];
  focusedArticleId: number | null;
  hasNumbering: boolean;
  articlePageMode: Book["layout_article_page_mode"];
  language: Language;
  template: Template;
}) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const previewArticles = useMemo(() => {
    if (articlePageMode !== "flow" || articles.length <= 1) return articles;
    const firstArticle = articles[0];
    if (!firstArticle) return articles;
    return [firstArticle];
  }, [articlePageMode, articles]);
  const flowArticles = useMemo<PublicationPreviewArticle[]>(
    () =>
      articlePageMode === "flow"
        ? articles.slice(1).map((article) => ({
            authorMeta:
              authorNames.get(article.author_id) ??
              `${pageCopy.author} #${article.author_id}`,
            body: article.content || "",
            id: article.id,
            imagePage: article.image_settings?.page ?? -1,
            imagePosition: article.image_settings?.position ?? { x: 50, y: 50 },
            imageSize: article.image_settings?.size ?? { width: 72, height: 32 },
            imageUrl: article.image ?? "",
            imageWrap: article.image_settings?.wrap ?? "topBottom",
            number: hasNumbering ? article.number : "",
            subtitle: article.subtitle,
            title: article.title,
          }))
        : [],
    [articlePageMode, articles, authorNames, hasNumbering, pageCopy.author],
  );
  const pages = useMemo(
    () =>
      previewArticles.flatMap((article) =>
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
    [previewArticles, template],
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
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-3 py-2 text-[10px] leading-4 text-blue-200">
        {articlePageMode === "flow"
          ? pageCopy.articlePageModeHint
          : pageCopy.singleArticlePage}
      </div>
      {pages.map(({ article, articlePageIndex, page }, pageIndex) => {
        const isFirstPage = articlePageIndex === 0;
        const imageSettings = article.image_settings;
        const sharedArticle: PublicationPreviewArticle = {
          authorMeta:
            authorNames.get(article.author_id) ??
            `${pageCopy.author} #${article.author_id}`,
          body: article.content || "",
          id: article.id,
          imagePage: imageSettings?.page ?? -1,
          imagePosition: imageSettings?.position ?? { x: 50, y: 50 },
          imageSize: imageSettings?.size ?? { width: 72, height: 32 },
          imageUrl: article.image ?? "",
          imageWrap: imageSettings?.wrap ?? "topBottom",
          number: hasNumbering ? article.number : "",
          subtitle: article.subtitle,
          title: article.title,
        };
        const renderSharedPreview = Boolean(template);
        if (renderSharedPreview) {
          if (!isFirstPage) return null;
          return (
            <PublicationArticlePreview
              article={sharedArticle}
              articlePageMode={articlePageMode}
              bookTitle={bookTitle}
              focused={focusedArticleId === article.id}
              flowArticles={flowArticles}
              key={article.id}
              language={language}
              pageNumberOffset={pageIndex}
              readOnly
              template={template}
              visualScale={0.5}
            />
          );
        }
        const authorName =
          authorNames.get(article.author_id) ??
          `${pageCopy.author} #${article.author_id}`;

        return (
          <article
            className={cn(
              "relative mx-auto flex w-full max-w-[250px] flex-col overflow-hidden bg-[#fffefa] text-slate-800 shadow-[0_18px_50px_rgba(0,0,0,0.4)] ring-black/10",
              focusedArticleId === article.id && isFirstPage
                ? "ring-2 ring-blue-500/40"
                : "ring-1",
            )}
            data-article-first-page={isFirstPage ? article.id : undefined}
            key={`${article.id}-${articlePageIndex}`}
            style={{
              aspectRatio: getPreviewAspectRatio(template),
              color: template.themeColor,
              containerType: "inline-size",
              padding: previewPageMargins[template.pageMargin],
            }}
          >
            {template.showHeader ? (
              <header
                className="mb-2 flex items-center justify-between border-b pb-1.5 text-[6px] font-semibold tracking-[0.12em]"
                style={{
                  borderColor: template.accentColor,
                  color: template.themeColor,
                  fontFamily: publicationChromeFontFamily,
                }}
              >
                <span>{template.headerText || "OpenClassBook"}</span>
              </header>
            ) : null}
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
                {template.showAuthorMeta ? (
                  <p
                    className="mt-1 text-[7px] font-medium"
                    style={{
                      color: template.accentColor,
                      textAlign: template.titleAlign,
                    }}
                  >
                    {authorName}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 text-[7px] text-slate-400">
                <span className="truncate">{article.title}</span>
                {template.showAuthorMeta ? (
                  <span className="shrink-0">{authorName}</span>
                ) : null}
              </div>
            )}

            <div
              className="min-h-0 flex-1 overflow-hidden break-words whitespace-pre-wrap text-slate-700"
              style={{
                columnCount: template.columns === 2 ? 2 : undefined,
                columnFill: template.columns === 2 ? "auto" : undefined,
                columnGap: template.columns === 2 ? "1.25em" : undefined,
                columnRule:
                  template.columns === 2
                    ? `1px solid ${template.accentColor}33`
                    : undefined,
                fontFamily: getFontFamilyStyle(template.bodyFont),
                fontSize: `${bodySize}px`,
                lineHeight: template.lineHeight,
                marginTop: isFirstPage
                  ? `${template.titleSpacing * previewScale}px`
                  : "8px",
                textAlign: template.justify ? "justify" : "left",
              }}
            >
              {page.lines.map((line, lineIndex) => {
                const isQuoteLine =
                  template.quoteStyle && line.trimStart().startsWith(">");
                const displayLine = isQuoteLine
                  ? line.trimStart().replace(/^>\s?/, "")
                  : line;
                return (
                  <p
                    key={`${lineIndex}-${line.slice(0, 12)}`}
                    style={{
                      borderLeft: isQuoteLine
                        ? `2px solid ${template.accentColor}`
                        : undefined,
                      breakInside: "avoid",
                      fontStyle: isQuoteLine ? "italic" : undefined,
                      minHeight: `${template.lineHeight}em`,
                      paddingLeft: isQuoteLine ? "0.6em" : undefined,
                      textIndent: line ? `${template.firstLineIndent}em` : 0,
                    }}
                  >
                    {displayLine || "\u00a0"}
                  </p>
                );
              })}
            </div>

            {page.showImage && article.image ? (
              <img
                alt={article.title}
                className="mt-2 max-h-[32%] self-center object-contain"
                src={article.image}
                style={{
                  border: template.imageBorder
                    ? `1px solid ${template.accentColor}55`
                    : undefined,
                  borderRadius: `${template.imageRadius * previewScale}px`,
                  width: `${template.imageMaxWidth}%`,
                }}
              />
            ) : null}

            <PublicationPageFooter
              footerColor={template.themeColor}
              footerFontFamily={getFontFamilyStyle(template.footerFont)}
              footerFontSize={template.footerSize}
              footerText={template.footerText}
              pageMargin={template.pageMargin}
              pageNumber={pageIndex + 1}
              pageNumberColor={template.accentColor}
              pageNumberPosition={template.pageNumberPosition}
              pageWidthMm={getPreviewPageWidthMm(template)}
              surfaceOpacity={template.chromeSurfaceOpacity}
              showFooter={template.showFooter}
              showPageNumber={pageIndex > 0 && template.pageNumberPosition !== "hidden"}
            />
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

function isFixedLayoutSection(section: BookLayoutSection) {
  return section.kind === "articles" || section.preset === "cover" || section.preset === "back_cover" || section.preset === "contents";
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

const layoutArticleCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function compareLayoutArticles(
  left: Article,
  right: Article,
  key: ArticleSortKey,
  direction: SortDirection,
  authorNames: Map<number, string>,
) {
  const getValue = (article: Article) => {
    if (key === "number") return article.number?.trim() ?? "";
    if (key === "title") return article.title.trim();
    return authorNames.get(article.author_id)?.trim() ?? `#${article.author_id}`;
  };
  const leftValue = getValue(left);
  const rightValue = getValue(right);
  if (!leftValue) return rightValue ? 1 : left.id - right.id;
  if (!rightValue) return -1;

  const comparison = layoutArticleCollator.compare(leftValue, rightValue);
  if (comparison) return direction === "asc" ? comparison : -comparison;
  return compareArticleNumbers(left, right);
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

function getPreviewPageWidthMm(template: Template) {
  if (template.pageSize === "custom") return template.customPageWidth;
  return { a4: 210, a5: 148, b5: 176 }[template.pageSize];
}

function getCoverTitleFont(templateId = "spring-blossom") {
  if (["spring-blossom", "rice-paper", "new-chinese", "misty-mountain"].includes(templateId)) {
    return '"方正舒体", "华文行楷", "华文楷体", "楷体", serif';
  }
  if (["graduation", "campus-morning", "youth-dream", "ocean-fairytale"].includes(templateId)) {
    return '"方正姚体", "幼圆", "Microsoft YaHei", sans-serif';
  }
  return '"Microsoft YaHei", "PingFang SC", sans-serif';
}

function CoverTypography({
  compact = false,
  credit,
  subtitle,
  templateId,
  title,
}: {
  compact?: boolean;
  credit: string | null;
  subtitle: string | null;
  templateId?: string;
  title: string;
}) {
  const artDirection = getCoverArtDirection(templateId);
  return (
    <div
      className={cn(
        "flex w-full flex-col px-[12%] text-center",
        artDirection.position === "top" ? "self-start pt-[23%]" : "self-start pt-[29%]",
      )}
      style={{ color: artDirection.color }}
    >
      <h3
        className={cn(
          "mt-3 break-words font-normal leading-[1.16] tracking-[0.08em]",
          compact ? "text-[clamp(1.3rem,3.2vw,2rem)]" : "text-[clamp(1.65rem,3.8vw,2.65rem)]",
        )}
        style={{
          fontFamily: getCoverTitleFont(templateId),
          textShadow: artDirection.shadow,
        }}
      >
        {title}
      </h3>
      {subtitle ? (
        <p className={cn("mt-3 leading-relaxed opacity-80", compact ? "text-[8px]" : "text-xs")}>
          {subtitle}
        </p>
      ) : null}
      {credit ? (
        <p
          className={cn(
            "mt-10 font-medium tracking-[0.2em] opacity-75",
            compact ? "text-[7px]" : "text-[10px]",
          )}
        >
          {credit}
        </p>
      ) : null}
    </div>
  );
}

function getCoverCredit(book: Book) {
  return book.publisher || book.school || book.owner_name || null;
}

function getCoverArtDirection(templateId?: string) {
  const isTopTitle = ["autumn-ginkgo", "campus-morning", "graduation", "winter-sun", "youth-dream"].includes(templateId ?? "");
  const isInk = ["rice-paper", "new-chinese", "misty-mountain"].includes(templateId ?? "");
  return {
    position: isTopTitle ? "top" : "center",
    color: isInk ? "#3a3029" : "#1f2937",
    shadow: "0 1px 12px rgba(255, 255, 255, 0.42)",
  } as const;
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
