import { Fragment, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  FileUp,
  ListMinus,
  ListOrdered,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NumberingMode = "none" | "automatic" | "import";

interface CreateBookPageProps {
  language: Language;
  onBookCreated: (owner: string, title: string) => void;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

interface NumberingOptionDefinition {
  id: NumberingMode;
  icon: LucideIcon;
}

const numberingOptionDefinitions: NumberingOptionDefinition[] = [
  { id: "none", icon: ListMinus },
  { id: "automatic", icon: ListOrdered },
  { id: "import", icon: FileUp },
];

const validImportExtensions = [".xlsx", ".xls", ".csv", ".txt"];

const formatArticleNumber = (value: number) => value.toString().padStart(3, "0");

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const createBookCopy = {
  en: {
    backHome: "Back to home",
    step: "Step 1 · Book setup",
    pageTitle: "Create your book.",
    pageIntro:
      "Start with the essentials. You can invite authors and collect their work after the book is created.",
    numberNote:
      "Article numbers preserve the original identifiers already used in your classroom or publication workflow. They are separate from internal database IDs.",
    detailsTitle: "Book details",
    detailsIntro:
      "Give your collection a name and choose how articles are identified.",
    bookOwner: "Book owner",
    bookOwnerPlaceholder: "e.g. Alex Chen",
    bookOwnerHelp:
      "The creator or person responsible for this book. They do not need to be a teacher.",
    bookOwnerError: "Enter a book owner to continue.",
    bookTitle: "Book title",
    bookTitlePlaceholder: "e.g. Our Class Stories 2026",
    bookTitleError: "Enter a book title to continue.",
    description: "Description",
    optional: "Optional",
    descriptionPlaceholder: "What is this collection about?",
    numbering: "Article numbering",
    numberingIntro:
      "Choose the rule authors will follow when they submit an article.",
    options: {
      none: {
        title: "No article numbers",
        description:
          "Authors submit their work directly without claiming a number.",
        detail: "Best when your articles do not already use a numbering system.",
      },
      automatic: {
        title: "Generate numbers automatically",
        description: "Create a sequence like 001, 002, 003… for authors to claim.",
        detail: "Each number can be claimed only once.",
      },
      import: {
        title: "Import existing numbers",
        description: "Bring in an existing list from Excel, CSV, or TXT.",
        detail: "Authors can only claim numbers; they cannot add or edit them.",
      },
    },
    rangeTitle: "Number range",
    rangeIntro:
      "Choose the first and last article number. Numbers are padded to three digits.",
    rangeStart: "Starts at",
    rangeEnd: "Ends at",
    rangeError: "Enter a valid range from 001 to 999.",
    generated: "numbers will be generated",
    uploadTitle: "Upload number list",
    uploadIntro: "Choose an Excel, CSV, or TXT file containing your numbers.",
    chooseFile: "Choose file",
    supportedFiles: "Excel, CSV, or TXT",
    fileError: "Choose a supported Excel, CSV, or TXT file.",
    removeFile: "Remove file",
    saved: "Book setup saved in this session.",
    unsent: "Nothing is sent until a later step is added.",
    continue: "Continue",
  },
  zh: {
    backHome: "返回首页",
    step: "第 1 步 · 书籍设置",
    pageTitle: "创建你的书籍。",
    pageIntro: "先填写必要信息。创建书籍后，你就可以邀请作者并收集他们的文章。",
    numberNote:
      "文章编号用于保留班级或出版流程中已经使用的原始编号，它并不是数据库内部编号。",
    detailsTitle: "书籍信息",
    detailsIntro: "为文集命名，并选择文章使用的编号方式。",
    bookOwner: "负责人",
    bookOwnerPlaceholder: "例如：陈晓明",
    bookOwnerHelp: "这本书的创建者或负责人，不限于老师。",
    bookOwnerError: "请填写负责人后继续。",
    bookTitle: "书名",
    bookTitlePlaceholder: "例如：我们的班级故事 2026",
    bookTitleError: "请填写书名后继续。",
    description: "简介",
    optional: "可选",
    descriptionPlaceholder: "介绍一下这本文集的主题……",
    numbering: "文章编号模式",
    numberingIntro: "选择作者投稿时需要遵循的文章编号规则。",
    options: {
      none: {
        title: "不使用编号",
        description: "作者无需认领编号，可以直接投稿。",
        detail: "适合尚未使用文章编号体系的文集。",
      },
      automatic: {
        title: "自动生成编号",
        description: "系统生成 001、002、003……供作者加入后认领。",
        detail: "每个编号只能被认领一次。",
      },
      import: {
        title: "导入已有编号",
        description: "从 Excel、CSV 或 TXT 导入现有编号列表。",
        detail: "作者只能认领，不能新增或修改编号。",
      },
    },
    rangeTitle: "编号范围",
    rangeIntro: "选择起始和结束编号，系统会统一补足为三位数字。",
    rangeStart: "起始编号",
    rangeEnd: "结束编号",
    rangeError: "请输入 001 到 999 之间的有效编号范围。",
    generated: "个编号将被生成",
    uploadTitle: "上传编号列表",
    uploadIntro: "选择包含文章编号的 Excel、CSV 或 TXT 文件。",
    chooseFile: "选择文件",
    supportedFiles: "支持 Excel、CSV 或 TXT",
    fileError: "请选择有效的 Excel、CSV 或 TXT 文件。",
    removeFile: "移除文件",
    saved: "书籍设置已保存在本次会话中。",
    unsent: "后续步骤开发完成前，不会发送任何数据。",
    continue: "继续",
  },
};

export function CreateBookPage({
  language,
  onBookCreated,
  onNavigate,
  onToggleLanguage,
}: CreateBookPageProps) {
  const [owner, setOwner] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [numberingMode, setNumberingMode] =
    useState<NumberingMode>("none");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("60");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showOwnerError, setShowOwnerError] = useState(false);
  const [showTitleError, setShowTitleError] = useState(false);
  const [showRangeError, setShowRangeError] = useState(false);
  const [showFileError, setShowFileError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const copy = createBookCopy[language];
  const startNumber = Number(rangeStart);
  const endNumber = Number(rangeEnd);
  const isRangeValid =
    Number.isInteger(startNumber) &&
    Number.isInteger(endNumber) &&
    startNumber >= 1 &&
    endNumber <= 999 &&
    startNumber <= endNumber;
  const generatedCount = isRangeValid ? endNumber - startNumber + 1 : 0;
  const hasValidImportFile =
    importFile !== null &&
    validImportExtensions.some((extension) =>
      importFile.name.toLowerCase().endsWith(extension),
    );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaved(false);

    if (!owner.trim()) {
      setShowOwnerError(true);
      document.getElementById("book-owner")?.focus();
      return;
    }

    setShowOwnerError(false);

    if (!title.trim()) {
      setShowTitleError(true);
      document.getElementById("book-title")?.focus();
      return;
    }

    setShowTitleError(false);

    if (numberingMode === "automatic" && !isRangeValid) {
      setShowRangeError(true);
      document.getElementById("range-start")?.focus();
      return;
    }

    setShowRangeError(false);

    if (numberingMode === "import" && !hasValidImportFile) {
      setShowFileError(true);
      document.getElementById("import-file")?.focus();
      return;
    }

    setShowFileError(false);
    setIsSaved(true);
    onBookCreated(owner.trim(), title.trim());
  };

  const markChanged = () => setIsSaved(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_28%,rgba(37,99,235,0.07),transparent_25%),radial-gradient(circle_at_88%_76%,rgba(37,99,235,0.05),transparent_24%)]" />

      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a
          className="text-[15px] font-semibold tracking-[-0.02em]"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/");
          }}
        >
          OpenClassBook
        </a>
        <div className="flex items-center gap-2 sm:gap-5">
          <LanguageToggle language={language} onToggle={onToggleLanguage} />
          <a
            aria-label={copy.backHome}
            className="group flex size-9 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-auto sm:w-auto sm:justify-start sm:rounded-none"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/");
            }}
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:ml-2 sm:inline">{copy.backHome}</span>
          </a>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-10 lg:grid-cols-[0.62fr_1fr] lg:gap-20 lg:px-10 lg:pt-16">
        <div className="max-w-md lg:sticky lg:top-28 lg:self-start">
          <div className="mb-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-2 rounded-full bg-blue-600" />
            {copy.step}
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            {copy.pageTitle}
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            {copy.pageIntro}
          </p>

          <div className="mt-10 hidden border-l border-zinc-200 pl-5 text-sm leading-6 text-muted-foreground lg:block">
            {copy.numberNote}
          </div>
        </div>

        <form
          className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.35)] backdrop-blur sm:p-9 lg:p-11"
          noValidate
          onSubmit={handleSubmit}
        >
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em]">
              {copy.detailsTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.detailsIntro}
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <Label htmlFor="book-owner">
              {copy.bookOwner} <span className="text-blue-600">*</span>
            </Label>
            <Input
              aria-describedby={
                showOwnerError ? "book-owner-error" : "book-owner-help"
              }
              aria-invalid={showOwnerError}
              autoComplete="name"
              id="book-owner"
              maxLength={80}
              onChange={(event) => {
                setOwner(event.target.value);
                setShowOwnerError(false);
                markChanged();
              }}
              placeholder={copy.bookOwnerPlaceholder}
              value={owner}
            />
            {showOwnerError ? (
              <p
                className="text-sm text-red-600"
                id="book-owner-error"
                role="alert"
              >
                {copy.bookOwnerError}
              </p>
            ) : (
              <p
                className="text-xs leading-5 text-muted-foreground"
                id="book-owner-help"
              >
                {copy.bookOwnerHelp}
              </p>
            )}
          </div>

          <div className="mt-7 space-y-3">
            <Label htmlFor="book-title">
              {copy.bookTitle} <span className="text-blue-600">*</span>
            </Label>
            <Input
              aria-describedby={showTitleError ? "book-title-error" : undefined}
              aria-invalid={showTitleError}
              autoComplete="off"
              id="book-title"
              maxLength={120}
              onChange={(event) => {
                setTitle(event.target.value);
                setShowTitleError(false);
                markChanged();
              }}
              placeholder={copy.bookTitlePlaceholder}
              value={title}
            />
            {showTitleError ? (
              <p className="text-sm text-red-600" id="book-title-error">
                {copy.bookTitleError}
              </p>
            ) : null}
          </div>

          <div className="mt-7 space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <Label htmlFor="book-description">{copy.description}</Label>
              <span className="text-xs text-muted-foreground">
                {copy.optional}
              </span>
            </div>
            <Textarea
              id="book-description"
              maxLength={500}
              onChange={(event) => {
                setDescription(event.target.value);
                markChanged();
              }}
              placeholder={copy.descriptionPlaceholder}
              value={description}
            />
            <p className="text-right text-xs tabular-nums text-muted-foreground">
              {description.length}/500
            </p>
          </div>

          <fieldset className="mt-8">
            <legend className="text-sm font-medium">{copy.numbering}</legend>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.numberingIntro}
            </p>

            <div className="mt-4 space-y-3">
              {numberingOptionDefinitions.map(({ id, icon: Icon }) => {
                const isSelected = numberingMode === id;
                const option = copy.options[id];

                return (
                  <Fragment key={id}>
                  <label
                    className={cn(
                      "relative flex cursor-pointer gap-4 rounded-2xl border p-4 transition-all focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 sm:p-5",
                      isSelected
                        ? "border-blue-600 bg-blue-50/55 shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60",
                    )}
                    htmlFor={`numbering-${id}`}
                  >
                    <input
                      checked={isSelected}
                      className="sr-only"
                      id={`numbering-${id}`}
                      name="numbering-mode"
                      onChange={() => {
                        setNumberingMode(id);
                        setShowRangeError(false);
                        setShowFileError(false);
                        markChanged();
                      }}
                      type="radio"
                      value={id}
                    />
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-[15px] font-semibold tracking-[-0.01em]">
                          {option.title}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-zinc-300 bg-white text-transparent",
                          )}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-zinc-600">
                        {option.description}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                        {option.detail}
                      </span>
                    </span>
                  </label>

                  {isSelected && id === "automatic" ? (
                    <div className="animate-in fade-in slide-in-from-top-1 rounded-2xl border border-blue-100 bg-blue-50/35 p-4 duration-200 sm:p-5">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <h4 className="text-sm font-semibold">{copy.rangeTitle}</h4>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {copy.rangeIntro}
                          </p>
                        </div>
                        {isRangeValid ? (
                          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold tabular-nums text-blue-700 shadow-sm ring-1 ring-blue-100">
                            {formatArticleNumber(startNumber)}–{formatArticleNumber(endNumber)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="range-start">{copy.rangeStart}</Label>
                          <Input
                            aria-invalid={showRangeError && !isRangeValid}
                            className="bg-white tabular-nums"
                            id="range-start"
                            inputMode="numeric"
                            max={999}
                            min={1}
                            onChange={(event) => {
                              setRangeStart(event.target.value);
                              setShowRangeError(false);
                              markChanged();
                            }}
                            type="number"
                            value={rangeStart}
                          />
                        </div>
                        <span className="mb-3 text-sm text-muted-foreground">—</span>
                        <div className="space-y-2">
                          <Label htmlFor="range-end">{copy.rangeEnd}</Label>
                          <Input
                            aria-invalid={showRangeError && !isRangeValid}
                            className="bg-white tabular-nums"
                            id="range-end"
                            inputMode="numeric"
                            max={999}
                            min={1}
                            onChange={(event) => {
                              setRangeEnd(event.target.value);
                              setShowRangeError(false);
                              markChanged();
                            }}
                            type="number"
                            value={rangeEnd}
                          />
                        </div>
                      </div>

                      {showRangeError && !isRangeValid ? (
                        <p className="mt-3 text-sm text-red-600" role="alert">
                          {copy.rangeError}
                        </p>
                      ) : isRangeValid ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{generatedCount}</span>{" "}
                          {copy.generated}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {isSelected && id === "import" ? (
                    <div className="animate-in fade-in slide-in-from-top-1 rounded-2xl border border-blue-100 bg-blue-50/35 p-4 duration-200 sm:p-5">
                      <h4 className="text-sm font-semibold">{copy.uploadTitle}</h4>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {copy.uploadIntro}
                      </p>

                      <label
                        className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-white px-5 py-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2"
                        htmlFor="import-file"
                      >
                        <input
                          accept=".xlsx,.xls,.csv,.txt,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          aria-describedby={showFileError ? "import-file-error" : undefined}
                          aria-invalid={showFileError}
                          className="sr-only"
                          id="import-file"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            const isSupported =
                              file === null ||
                              validImportExtensions.some((extension) =>
                                file.name.toLowerCase().endsWith(extension),
                              );
                            setImportFile(file);
                            setShowFileError(!isSupported);
                            markChanged();
                          }}
                          type="file"
                        />
                        <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                          <Upload className="size-[18px]" />
                        </span>
                        <span className="mt-3 text-sm font-semibold text-blue-700">
                          {copy.chooseFile}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          {copy.supportedFiles}
                        </span>
                      </label>

                      {importFile ? (
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                            <FileText className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {importFile.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatFileSize(importFile.size)}
                            </span>
                          </span>
                          <button
                            aria-label={copy.removeFile}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-zinc-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            onClick={() => {
                              setImportFile(null);
                              setShowFileError(false);
                              markChanged();
                            }}
                            type="button"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : null}

                      {showFileError ? (
                        <p className="mt-3 text-sm text-red-600" id="import-file-error" role="alert">
                          {copy.fileError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  </Fragment>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-9 flex flex-col-reverse items-stretch justify-between gap-4 border-t border-zinc-200 pt-7 sm:flex-row sm:items-center">
            <div aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
              {isSaved ? (
                <span className="flex items-center gap-2 text-emerald-700">
                  <Check className="size-4" />
                  {copy.saved}
                </span>
              ) : (
                copy.unsent
              )}
            </div>
            <Button
              className="group shrink-0 bg-blue-600 text-white hover:bg-blue-700"
              size="lg"
              type="submit"
            >
              {copy.continue}
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
