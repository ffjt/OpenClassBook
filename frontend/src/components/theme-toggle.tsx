import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import type { Language } from "@/lib/i18n";

export function ThemeToggle({ language }: { language: Language }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark
    ? language === "zh"
      ? "切换到浅色模式"
      : "Switch to light mode"
    : language === "zh"
      ? "切换到深色模式"
      : "Switch to dark mode";

  return (
    <button
      aria-label={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/75 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
