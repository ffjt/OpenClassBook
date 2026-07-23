import { type FormEvent, useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, Send } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Language } from "@/lib/i18n";
import { ApiError } from "@/repositories/apiClient";
import { authRepository } from "@/repositories/authRepository";

interface RegisterPageProps {
  language: Language;
  onAuthenticated: () => void;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    eyebrow: "Create an owner account",
    title: "Start your workspace",
    description:
      "Your personal publishing workspace is created as soon as your account is ready.",
    email: "Email address",
    code: "Verification code",
    send: "Send code",
    sending: "Sending",
    resend: (seconds: number) => `Resend in ${seconds}s`,
    password: "Password",
    confirmPassword: "Confirm password",
    username: "Your name",
    submit: "Create workspace",
    creating: "Creating workspace",
    hasAccount: "Already have an account?",
    login: "Sign in",
    sent: "Verification code sent. Check your inbox.",
    passwordsDoNotMatch: "The passwords do not match.",
    passwordTooShort: "Use at least 8 characters for your password.",
    sendError: "We could not send a verification code. Please try again.",
    registerError: "We could not create your account. Please try again.",
  },
  zh: {
    eyebrow: "创建管理者账号",
    title: "开始你的工作空间",
    description: "账号创建完成后，系统会立即为你建立个人出版工作空间。",
    email: "邮箱地址",
    code: "验证码",
    send: "发送验证码",
    sending: "正在发送",
    resend: (seconds: number) => `${seconds} 秒后重发`,
    password: "密码",
    confirmPassword: "确认密码",
    username: "你的名字",
    submit: "创建工作空间",
    creating: "正在创建工作空间",
    hasAccount: "已有账号？",
    login: "登录",
    sent: "验证码已发送，请查看邮箱。",
    passwordsDoNotMatch: "两次输入的密码不一致。",
    passwordTooShort: "密码至少需要 8 个字符。",
    sendError: "无法发送验证码，请稍后重试。",
    registerError: "无法创建账号，请稍后重试。",
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

export function RegisterPage({
  language,
  onAuthenticated,
  onNavigate,
  onToggleLanguage,
}: RegisterPageProps) {
  const pageCopy = copy[language];
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (!email) return;
    setError(null);
    setMessage(null);
    setIsSendingCode(true);
    try {
      const response = await authRepository.sendVerificationCode(email);
      setCooldown(response.retry_after_seconds);
      setMessage(language === "zh" ? response.message_zh : response.message);
    } catch (requestError) {
      setError(errorMessage(requestError, language, pageCopy.sendError));
    } finally {
      setIsSendingCode(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError(pageCopy.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(pageCopy.passwordsDoNotMatch);
      return;
    }
    setIsSubmitting(true);
    try {
      await authRepository.register({ email, code, password, username });
      onAuthenticated();
    } catch (requestError) {
      setError(errorMessage(requestError, language, pageCopy.registerError));
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

      <form className="mt-7 space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm font-medium" htmlFor="register-email">
          {pageCopy.email}
          <Input
            autoComplete="email"
            className="mt-2"
            id="register-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <div>
          <label className="block text-sm font-medium" htmlFor="register-code">
            {pageCopy.code}
          </label>
          <div className="mt-2 flex gap-2">
            <Input
              autoComplete="one-time-code"
              className="min-w-0"
              id="register-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              required
              value={code}
            />
            <Button
              className="shrink-0 rounded-xl border-blue-500/30 px-4 text-blue-600 hover:bg-blue-500/10"
              disabled={!email || isSendingCode || cooldown > 0}
              onClick={() => void sendCode()}
              type="button"
              variant="outline"
            >
              {isSendingCode ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
              {isSendingCode
                ? pageCopy.sending
                : cooldown > 0
                  ? pageCopy.resend(cooldown)
                  : pageCopy.send}
            </Button>
          </div>
        </div>
        <label className="block text-sm font-medium" htmlFor="register-password">
          {pageCopy.password}
          <Input
            autoComplete="new-password"
            className="mt-2"
            id="register-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="register-confirm-password">
          {pageCopy.confirmPassword}
          <Input
            autoComplete="new-password"
            className="mt-2"
            id="register-confirm-password"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="register-username">
          {pageCopy.username}
          <Input
            autoComplete="name"
            className="mt-2"
            id="register-username"
            maxLength={120}
            onChange={(event) => setUsername(event.target.value)}
            required
            value={username}
          />
        </label>
        {message ? <p aria-live="polite" className="text-sm text-emerald-600 dark:text-emerald-400" role="status">{message}</p> : null}
        {error ? <p aria-live="polite" className="text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p> : null}
        <Button className="w-full bg-blue-600 text-white hover:bg-blue-500" disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <ArrowRight className="mr-2 size-4" />}
          {isSubmitting ? pageCopy.creating : pageCopy.submit}
        </Button>
      </form>

      <p className="mt-7 text-sm text-muted-foreground">
        {pageCopy.hasAccount}{" "}
        <button className="font-medium text-blue-600 hover:text-blue-500" onClick={() => onNavigate("/login")} type="button">
          {pageCopy.login}
        </button>
      </p>
    </AuthShell>
  );
}
