import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, LoaderCircle } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Language } from "@/lib/i18n";
import type { BookCreateInput } from "@/repositories/bookRepository";

interface CreateBookPageProps {
  language: Language;
  onBookCreated: (data: BookCreateInput) => Promise<void>;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const pageCopy = {
  en: {
    backHome: "Back to home",
    eyebrow: "Create Book",
    title: "Create your book",
    intro: "Start with the book itself. Submission rules and the body template come next.",
    formTitle: "Book information",
    formDescription: "Only the essentials are needed here.",
    owner: "Book owner",
    ownerPlaceholder: "e.g. Alex Chen",
    ownerHelp: "The creator or person responsible for this book.",
    ownerError: "Enter a book owner to continue.",
    bookTitle: "Book title",
    titlePlaceholder: "e.g. Our Class Stories 2026",
    titleError: "Enter a book title to continue.",
    description: "Description",
    optional: "Optional",
    descriptionPlaceholder: "What is this collection about?",
    note: "After creation, you will continue with the deadline, article limit, permissions, and body template.",
    pending: "The book will be saved when you continue.",
    saved: "Book saved.",
    error: "The book could not be created. Please try again.",
    creating: "Creating...",
    continue: "Create Book",
  },
  zh: {
    backHome: "返回首页",
    eyebrow: "创建书籍",
    title: "创建你的书籍",
    intro: "这里先创建书籍本身，投稿规则和正文模板将在下一步配置。",
    formTitle: "书籍信息",
    formDescription: "这里只需要填写必要信息。",
    owner: "负责人",
    ownerPlaceholder: "例如：陈晓明",
    ownerHelp: "这本书的创建者或负责人。",
    ownerError: "请填写负责人后继续。",
    bookTitle: "书名",
    titlePlaceholder: "例如：我们的班级故事 2026",
    titleError: "请填写书名后继续。",
    description: "简介",
    optional: "可选",
    descriptionPlaceholder: "介绍一下这本文集的主题……",
    note: "创建后将继续设置截止时间、投稿数量、修改权限和正文模板。",
    pending: "点击创建后，书籍将保存到数据库。",
    saved: "书籍已保存。",
    error: "书籍创建失败，请重试。",
    creating: "正在创建……",
    continue: "创建书籍",
  },
} as const;

export function CreateBookPage({
  language,
  onBookCreated,
  onNavigate,
  onToggleLanguage,
}: CreateBookPageProps) {
  const copy = pageCopy[language];
  const [owner, setOwner] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerError, setOwnerError] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hasOwner = Boolean(owner.trim());
    const hasTitle = Boolean(title.trim());
    setOwnerError(!hasOwner);
    setTitleError(!hasTitle);
    if (!hasOwner || !hasTitle) {
      document.getElementById(hasOwner ? "book-title" : "book-owner")?.focus();
      return;
    }

    setStatus("saving");
    try {
      await onBookCreated({
        owner_name: owner.trim(),
        title: title.trim(),
        description: description.trim() || null,
      });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const markChanged = () => setStatus("idle");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-7 lg:px-10">
        <button className="text-sm font-semibold" onClick={() => onNavigate("/")} type="button">
          OpenClassBook
        </button>
        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageToggle language={language} onToggle={onToggleLanguage} />
          <ThemeToggle language={language} />
          <Button aria-label={copy.backHome} className="size-10 rounded-full p-0" onClick={() => onNavigate("/")} variant="outline">
            <ArrowLeft className="size-4" />
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-8 sm:px-7 lg:grid-cols-[0.75fr_1fr] lg:gap-16 lg:px-10 lg:pt-14">
        <div className="max-w-md">
          <p className="flex items-center gap-2 text-xs font-semibold text-blue-500">
            <BookOpen className="size-4" />
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">{copy.title}</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{copy.intro}</p>
          <p className="mt-8 border-l-2 border-blue-500 pl-4 text-sm leading-6 text-muted-foreground">
            {copy.note}
          </p>
        </div>

        <form className="rounded-lg border border-border bg-card p-6 sm:p-9" noValidate onSubmit={submit}>
          <h2 className="text-xl font-semibold">{copy.formTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{copy.formDescription}</p>

          <div className="mt-8 space-y-2">
            <Label htmlFor="book-owner">{copy.owner} <span className="text-blue-500">*</span></Label>
            <Input
              aria-describedby={ownerError ? "book-owner-error" : "book-owner-help"}
              aria-invalid={ownerError}
              id="book-owner"
              maxLength={120}
              onChange={(event) => { setOwner(event.target.value); setOwnerError(false); markChanged(); }}
              placeholder={copy.ownerPlaceholder}
              value={owner}
            />
            <p className={ownerError ? "text-sm text-rose-500" : "text-xs text-muted-foreground"} id={ownerError ? "book-owner-error" : "book-owner-help"}>
              {ownerError ? copy.ownerError : copy.ownerHelp}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <Label htmlFor="book-title">{copy.bookTitle} <span className="text-blue-500">*</span></Label>
            <Input
              aria-describedby={titleError ? "book-title-error" : undefined}
              aria-invalid={titleError}
              id="book-title"
              maxLength={255}
              onChange={(event) => { setTitle(event.target.value); setTitleError(false); markChanged(); }}
              placeholder={copy.titlePlaceholder}
              value={title}
            />
            {titleError ? <p className="text-sm text-rose-500" id="book-title-error">{copy.titleError}</p> : null}
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="book-description">{copy.description}</Label>
              <span className="text-xs text-muted-foreground">{copy.optional}</span>
            </div>
            <Textarea
              id="book-description"
              maxLength={2000}
              onChange={(event) => { setDescription(event.target.value); markChanged(); }}
              placeholder={copy.descriptionPlaceholder}
              value={description}
            />
            <p className="text-right text-xs tabular-nums text-muted-foreground">{description.length}/2000</p>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className={status === "error" ? "text-sm text-rose-500" : "text-sm text-muted-foreground"} role={status === "error" ? "alert" : "status"}>
              {status === "error" ? copy.error : status === "saved" ? copy.saved : copy.pending}
            </p>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={status === "saving"} size="lg" type="submit">
              {status === "saving" ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : status === "saved" ? <Check className="mr-2 size-4" /> : null}
              {status === "saving" ? copy.creating : copy.continue}
              {status !== "saving" && status !== "saved" ? <ArrowRight className="ml-2 size-4" /> : null}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
