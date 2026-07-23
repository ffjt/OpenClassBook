import { KeyRound } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";

interface ForgotPasswordPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    eyebrow: "Account recovery",
    title: "Password recovery is next.",
    description:
      "Password reset will use the same verified email delivery system as registration. It is not enabled in this first authentication release, so we will never pretend to send a reset email.",
    back: "Back to sign in",
  },
  zh: {
    eyebrow: "账号恢复",
    title: "密码恢复即将接入。",
    description:
      "密码重置会复用注册时经过验证的邮件投递体系。首版认证暂未启用该流程，因此页面不会假装已经发送重置邮件。",
    back: "返回登录",
  },
} as const;

export function ForgotPasswordPage({
  language,
  onNavigate,
  onToggleLanguage,
}: ForgotPasswordPageProps) {
  const pageCopy = copy[language];
  return (
    <AuthShell
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
        <KeyRound className="size-5" />
      </span>
      <p className="mt-7 text-xs font-medium uppercase tracking-[0.16em] text-blue-600">
        {pageCopy.eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">
        {pageCopy.title}
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        {pageCopy.description}
      </p>
      <Button className="mt-8 bg-blue-600 text-white hover:bg-blue-500" onClick={() => onNavigate("/login")} type="button">
        {pageCopy.back}
      </Button>
    </AuthShell>
  );
}
