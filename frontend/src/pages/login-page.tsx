import { type FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Language } from "@/lib/i18n";
import { ApiError } from "@/repositories/apiClient";
import { authRepository } from "@/repositories/authRepository";

interface LoginPageProps {
  language: Language;
  onAuthenticated: () => void;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    eyebrow: "Owner sign in",
    title: "Welcome back",
    description: "Continue shaping your books and editorial workspace.",
    email: "Email address",
    password: "Password",
    submit: "Sign in",
    loading: "Signing in",
    forgot: "Forgot your password?",
    noAccount: "New to OpenClassBook?",
    register: "Create an owner account",
    invalid: "We could not sign you in. Check your email and password.",
  },
  zh: {
    eyebrow: "书籍管理者登录",
    title: "欢迎回来",
    description: "继续打磨你的书籍与出版工作空间。",
    email: "邮箱地址",
    password: "密码",
    submit: "登录",
    loading: "正在登录",
    forgot: "忘记密码？",
    noAccount: "还没有 OpenClassBook 账号？",
    register: "创建管理者账号",
    invalid: "无法登录，请检查邮箱和密码。",
  },
} as const;

function errorMessage(error: unknown, language: Language, fallback: string) {
  if (error instanceof ApiError) {
    return language === "zh"
      ? error.detail?.message_zh || fallback
      : error.detail?.message || fallback;
  }
  return fallback;
}

export function LoginPage({
  language,
  onAuthenticated,
  onNavigate,
  onToggleLanguage,
}: LoginPageProps) {
  const pageCopy = copy[language];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await authRepository.login({ email, password });
      onAuthenticated();
    } catch (requestError) {
      setError(errorMessage(requestError, language, pageCopy.invalid));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
    >
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600">
        {pageCopy.eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">
        {pageCopy.title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {pageCopy.description}
      </p>

      <form className="mt-8 space-y-5" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-medium" htmlFor="login-email">
          {pageCopy.email}
          <Input
            autoComplete="email"
            className="mt-2"
            id="login-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="login-password">
          {pageCopy.password}
          <Input
            autoComplete="current-password"
            className="mt-2"
            id="login-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? (
          <p aria-live="polite" className="text-sm text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full bg-blue-600 text-white hover:bg-blue-500" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <ArrowRight className="mr-2 size-4" />}
          {isSubmitting ? pageCopy.loading : pageCopy.submit}
        </Button>
      </form>

      <div className="mt-7 flex items-center justify-between gap-4 text-sm">
        <button className="text-muted-foreground hover:text-foreground" onClick={() => onNavigate("/forgot-password")} type="button">
          {pageCopy.forgot}
        </button>
        <span className="text-muted-foreground">{pageCopy.noAccount}</span>
      </div>
      <button className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-500" onClick={() => onNavigate("/register")} type="button">
        {pageCopy.register}
      </button>
    </AuthShell>
  );
}
