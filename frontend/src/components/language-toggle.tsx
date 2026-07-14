import { Languages } from "lucide-react";

import type { Language } from "@/lib/i18n";

interface LanguageToggleProps {
  language: Language;
  onToggle: () => void;
}

export function LanguageToggle({ language, onToggle }: LanguageToggleProps) {
  const isChinese = language === "zh";

  return (
    <button
      aria-label={isChinese ? "Switch to English" : "切换到中文"}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-white/75 px-3 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      onClick={onToggle}
      type="button"
    >
      <Languages className="size-4" />
      <span>{isChinese ? "EN" : "中文"}</span>
    </button>
  );
}
