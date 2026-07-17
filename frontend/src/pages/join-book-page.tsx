import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Hash,
  KeyRound,
  RefreshCw,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Language } from "@/lib/i18n";
import { ApiError } from "@/repositories/apiClient";
import type { Book, NumberMode } from "@/repositories/bookRepository";
import { joinRepository } from "@/repositories/joinRepository";

interface JoinBookPageProps {
  inviteCode?: string;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    backHome: "Back to home",
    eyebrow: "Author invitation",
    pageTitle: "Join a book.",
    pageIntro: "Review the invitation details and join as an author.",
    codeTitle: "Enter your invitation code",
    codeIntro: "Use the code shared by the book owner.",
    inviteCode: "Invitation code",
    codePlaceholder: "e.g. OCB-7K2M9Q",
    codeRequired: "Enter an invitation code to continue.",
    continue: "Continue",
    bookDescription: "About this book",
    noDescription: "No description provided.",
    owner: "Owner",
    authors: "Authors",
    numbering: "Numbering mode",
    modes: { none: "No numbers", automatic: "Automatic at layout", existing: "Existing numbers" },
    name: "Your name",
    namePlaceholder: "Enter your name",
    nameRequired: "Enter your name to join this book.",
    className: "Class",
    classPlaceholder: "Fill the blank only",
    classRequired: "Fill in the class blank to continue.",
    fixedClass: "This class is set by the book owner.",
    join: "Join this book",
    joining: "Joining...",
    invalidTitle: "This invitation has expired or does not exist.",
    invalidDescription: "The invitation code does not exist. Please check it and try again.",
    inviteDisabledTitle: "This book is not accepting new authors.",
    inviteDisabledDescription: "The book owner has temporarily disabled invitations.",
    submissionPausedTitle: "This book has stopped accepting submissions.",
    submissionPausedDescription: "Please contact the book owner for more information.",
    errorTitle: "Unable to connect to the server.",
    errorDescription: "Please confirm FastAPI is running.",
    joinError: "Unable to join this book. Please try again.",
    retry: "Retry",
    loading: "Loading invitation",
  },
  zh: {
    backHome: "返回首页",
    eyebrow: "作者邀请",
    pageTitle: "加入一本书。",
    pageIntro: "确认邀请信息后，以作者身份加入这本书。",
    codeTitle: "输入邀请码",
    codeIntro: "请输入负责人分享给你的邀请码。",
    inviteCode: "邀请码",
    codePlaceholder: "例如：OCB-7K2M9Q",
    codeRequired: "请输入邀请码后继续。",
    continue: "继续",
    bookDescription: "书籍简介",
    noDescription: "暂无简介。",
    owner: "负责人",
    authors: "作者人数",
    numbering: "编号模式",
    modes: { none: "我不需要编号", automatic: "排版时自动生成", existing: "我已经有编号" },
    name: "你的姓名",
    namePlaceholder: "请输入姓名",
    nameRequired: "请输入姓名后加入这本书。",
    className: "班级",
    classPlaceholder: "只填写空格里的内容",
    classRequired: "请填写班级格式中的空格。",
    fixedClass: "班级已由负责人统一规定。",
    join: "加入这本书",
    joining: "正在加入...",
    invalidTitle: "邀请已失效或不存在。",
    invalidDescription: "邀请码不存在。请检查邀请码是否正确。",
    inviteDisabledTitle: "当前书籍暂不接受新的作者加入。",
    inviteDisabledDescription: "负责人已暂时关闭邀请。",
    submissionPausedTitle: "当前书籍已停止接收投稿。",
    submissionPausedDescription: "如有疑问，请联系当前书籍负责人。",
    errorTitle: "无法连接服务器。",
    errorDescription: "请确认 FastAPI 正在运行。",
    joinError: "暂时无法加入这本书，请重试。",
    retry: "重试",
    loading: "正在读取邀请信息",
  },
} as const;

function JoinSkeleton({ language }: { language: Language }) {
  return (
    <div aria-label={copy[language].loading} className="animate-pulse rounded-[2rem] border border-border bg-card/90 p-8" role="status">
      <div className="h-7 w-2/3 rounded bg-muted" />
      <div className="mt-5 h-4 w-full rounded bg-muted/70" />
      <div className="mt-3 h-4 w-5/6 rounded bg-muted/70" />
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <div className="h-24 rounded-xl bg-muted/50" key={index} />)}
      </div>
      <div className="mt-8 h-11 rounded bg-muted/50" />
    </div>
  );
}

export function JoinBookPage({
  inviteCode,
  language,
  onNavigate,
  onToggleLanguage,
}: JoinBookPageProps) {
  const pageCopy = copy[language];
  const normalizedCode = inviteCode?.trim().toUpperCase() ?? "";
  const [enteredCode, setEnteredCode] = useState("");
  const [name, setName] = useState("");
  const [classValue, setClassValue] = useState("");
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(normalizedCode));
  const [isJoining, setIsJoining] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [classError, setClassError] = useState(false);
  const [joinError, setJoinError] = useState(false);
  const [loadError, setLoadError] = useState<"invalid" | "invite_disabled" | "server" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!normalizedCode) {
      setBook(null);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadError(null);
    setBook(null);

    joinRepository
      .get(normalizedCode)
      .then((response) => {
        if (active) setBook(response.book);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setLoadError(
          requestError instanceof ApiError && requestError.status === 404
            ? "invalid"
            : requestError instanceof ApiError && requestError.detail?.code === "invite_disabled"
              ? "invite_disabled"
              : "server",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [normalizedCode, reloadKey]);

  const submitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = enteredCode.trim().toUpperCase();
    if (!code) {
      setCodeError(true);
      document.getElementById("invite-code")?.focus();
      return;
    }
    onNavigate(`/join/${encodeURIComponent(code)}`);
  };

  const joinBook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const authorName = name.trim();
    if (!authorName) {
      setNameError(true);
      document.getElementById("author-name")?.focus();
      return;
    }
    if (book?.class_collection_mode === "template" && !classValue.trim()) {
      setClassError(true);
      document.getElementById("author-class")?.focus();
      return;
    }

    setIsJoining(true);
    setJoinError(false);
    try {
      const response = await joinRepository.join(normalizedCode, authorName, classValue.trim());
      if (response.mode === "selection_required") {
        const query = new URLSearchParams({ name: authorName });
        if (classValue.trim()) query.set("classValue", classValue.trim());
        onNavigate(`/join/${encodeURIComponent(normalizedCode)}/select?${query}`);
      } else if (response.author_id) {
        onNavigate(`/author/${response.author_id}/editor`);
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 404) {
        setLoadError("invalid");
        setBook(null);
      } else if (requestError instanceof ApiError && requestError.detail?.code === "submission_disabled") {
        setBook((current) => current ? { ...current, submission_enabled: false } : current);
      } else {
        setJoinError(true);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const numberModeLabel = (mode: NumberMode) => pageCopy.modes[mode];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_26%,rgba(37,99,235,0.08),transparent_26%),radial-gradient(circle_at_84%_78%,rgba(37,99,235,0.05),transparent_25%)]" />
      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a className="text-[15px] font-semibold tracking-[-0.02em]" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>
          OpenClassBook
        </a>
        <div className="flex items-center gap-2 sm:gap-5">
          <LanguageToggle language={language} onToggle={onToggleLanguage} />
          <ThemeToggle language={language} />
          <a aria-label={pageCopy.backHome} className="group flex items-center text-sm text-muted-foreground hover:text-foreground" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>
            <ArrowLeft className="size-4" />
            <span className="ml-2 hidden sm:inline">{pageCopy.backHome}</span>
          </a>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl items-start gap-10 px-6 pb-20 pt-10 lg:grid-cols-[0.7fr_1fr] lg:gap-20 lg:px-10 lg:pt-20">
        <div className="max-w-lg">
          <div className="mb-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-2 rounded-full bg-blue-600" />
            {pageCopy.eyebrow}
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{pageCopy.pageTitle}</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">{pageCopy.pageIntro}</p>
        </div>

        {!normalizedCode ? (
          <form className="rounded-[2rem] border border-border bg-card/90 p-6 sm:p-9 lg:p-11" noValidate onSubmit={submitCode}>
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"><KeyRound className="size-5" /></span>
              <div><h2 className="text-xl font-semibold">{pageCopy.codeTitle}</h2><p className="mt-2 text-sm text-muted-foreground">{pageCopy.codeIntro}</p></div>
            </div>
            <div className="mt-8 space-y-3">
              <Label htmlFor="invite-code">{pageCopy.inviteCode}</Label>
              <Input autoFocus className="font-mono uppercase tracking-[0.08em]" id="invite-code" onChange={(event) => { setEnteredCode(event.target.value); setCodeError(false); }} placeholder={pageCopy.codePlaceholder} value={enteredCode} />
              {codeError ? <p className="text-sm text-red-500" role="alert">{pageCopy.codeRequired}</p> : null}
            </div>
            <div className="mt-8 flex justify-end border-t border-border pt-7">
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto" size="lg" type="submit">{pageCopy.continue}<ArrowRight className="ml-2 size-4" /></Button>
            </div>
          </form>
        ) : isLoading ? (
          <JoinSkeleton language={language} />
        ) : loadError || !book ? (
          <div className="rounded-[2rem] border border-border bg-card/90 p-8 text-center sm:p-11">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400"><AlertCircle className="size-5" /></span>
            <h2 className="mt-5 text-xl font-semibold">{loadError === "invalid" ? pageCopy.invalidTitle : loadError === "invite_disabled" ? pageCopy.inviteDisabledTitle : pageCopy.errorTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{loadError === "invalid" ? pageCopy.invalidDescription : loadError === "invite_disabled" ? pageCopy.inviteDisabledDescription : pageCopy.errorDescription}</p>
            {loadError === "server" ? <Button className="mt-6" onClick={() => setReloadKey((value) => value + 1)} type="button"><RefreshCw className="mr-2 size-4" />{pageCopy.retry}</Button> : null}
          </div>
        ) : !book.submission_enabled ? (
          <div className="rounded-[2rem] border border-border bg-card/90 p-8 text-center sm:p-11">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500"><AlertCircle className="size-5" /></span>
            <h2 className="mt-5 text-xl font-semibold">{pageCopy.submissionPausedTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{pageCopy.submissionPausedDescription}</p>
          </div>
        ) : (
          <form className="rounded-[2rem] border border-border bg-card/90 p-6 sm:p-9 lg:p-11" noValidate onSubmit={joinBook}>
            <div className="flex items-start gap-4 border-b border-border pb-7">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"><BookOpen className="size-5" /></span>
              <div className="min-w-0"><h2 className="text-2xl font-semibold tracking-[-0.03em]">{book.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{book.description || pageCopy.noDescription}</p></div>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/50 p-4"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><UserRound className="size-3.5" />{pageCopy.owner}</dt><dd className="mt-2 font-semibold">{book.owner_name}</dd></div>
              <div className="rounded-xl bg-muted/50 p-4"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><UsersRound className="size-3.5" />{pageCopy.authors}</dt><dd className="mt-2 font-semibold">{book.author_count}</dd></div>
              <div className="rounded-xl bg-muted/50 p-4"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Hash className="size-3.5" />{pageCopy.numbering}</dt><dd className="mt-2 font-semibold">{numberModeLabel(book.number_mode)}</dd></div>
            </dl>
            <div className="mt-7 space-y-3">
              <Label htmlFor="author-name">{pageCopy.name}</Label>
              <Input autoComplete="name" id="author-name" maxLength={120} onChange={(event) => { setName(event.target.value); setNameError(false); setJoinError(false); }} placeholder={pageCopy.namePlaceholder} value={name} />
              {nameError ? <p className="text-sm text-red-500" role="alert">{pageCopy.nameRequired}</p> : null}
              {book.class_collection_mode === "fixed" ? (
                <div className="pt-2"><Label>{pageCopy.className}</Label><div className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-medium">{book.class_fixed_value}</div><p className="mt-2 text-xs text-muted-foreground">{pageCopy.fixedClass}</p></div>
              ) : book.class_collection_mode === "template" ? (
                <div className="pt-2"><Label htmlFor="author-class">{pageCopy.className}</Label><div className="mt-2 flex items-center overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring"><span className="shrink-0 px-3 text-sm text-muted-foreground">{book.class_name_template?.split("{value}")[0]}</span><input className="min-w-20 flex-1 border-x border-dashed border-input bg-transparent px-3 py-2 text-sm outline-none" id="author-class" maxLength={120} onChange={(event) => { setClassValue(event.target.value); setClassError(false); setJoinError(false); }} placeholder={pageCopy.classPlaceholder} value={classValue} /><span className="shrink-0 px-3 text-sm text-muted-foreground">{book.class_name_template?.split("{value}")[1]}</span></div>{classError ? <p className="mt-2 text-sm text-red-500" role="alert">{pageCopy.classRequired}</p> : null}</div>
              ) : null}
              {joinError ? <p className="text-sm text-red-500" role="alert">{pageCopy.joinError}</p> : null}
            </div>
            <div className="mt-8 flex justify-end border-t border-border pt-7">
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto" disabled={isJoining} size="lg" type="submit">{isJoining ? pageCopy.joining : pageCopy.join}<ArrowRight className="ml-2 size-4" /></Button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
