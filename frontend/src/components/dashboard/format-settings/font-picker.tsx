import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import {
  getFontFamilyStyle,
  type FontSelection,
} from "@/components/dashboard/format-settings/format-settings-types";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";

const fontPickerCopy = {
  en: {
    empty: "No matching fonts",
    search: "Search fonts...",
  },
  zh: {
    empty: "没有匹配的字体",
    search: "搜索字体...",
  },
} as const;

interface FontPickerProps {
  ariaLabel: string;
  fontOptions: FontSelection[];
  language: Language;
  onOpen?: () => void;
  onValueChange: (value: FontSelection) => void;
  value: FontSelection;
}

export function FontPicker({
  ariaLabel,
  fontOptions,
  language,
  onOpen,
  onValueChange,
  value,
}: FontPickerProps) {
  const copy = fontPickerCopy[language];
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredFonts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) return fontOptions;

    return fontOptions.filter(({ family, fullName, postscriptName, style }) =>
      `${fullName} ${family} ${style} ${postscriptName}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [fontOptions, query]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      searchRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-xs text-foreground shadow-sm outline-none transition-colors hover:border-blue-500/30 hover:bg-muted focus-visible:border-blue-500/60 focus-visible:ring-2 focus-visible:ring-blue-500/20"
        onClick={() => {
          if (!isOpen) onOpen?.();
          setIsOpen((current) => !current);
        }}
        role="combobox"
        type="button"
      >
        <span
          className="min-w-0 flex-1 truncate"
          style={{ fontFamily: getFontFamilyStyle(value) }}
        >
          {value.fullName}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label={copy.search}
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.search}
                ref={searchRef}
                type="search"
                value={query}
              />
            </div>
          </div>

          <div
            aria-label={ariaLabel}
            className="max-h-64 overflow-y-auto overscroll-contain p-1.5"
            id={listboxId}
            role="listbox"
          >
            {filteredFonts.length > 0 ? (
              filteredFonts.map((font) => {
                const isSelected = font.postscriptName === value.postscriptName;

                return (
                  <button
                    aria-selected={isSelected}
                    className={cn(
                      "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none",
                      isSelected && "bg-blue-500/10 text-blue-300",
                    )}
                    key={font.postscriptName}
                    onClick={() => {
                      onValueChange(font);
                      setIsOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate"
                        style={{ fontFamily: getFontFamilyStyle(font) }}
                      >
                        {font.fullName}
                      </span>
                      <span className="mt-0.5 block truncate font-sans text-[9px] text-muted-foreground">
                        {font.family}
                        {font.style ? ` · ${font.style}` : ""}
                      </span>
                    </span>
                    <Check
                      className={cn(
                        "size-3.5 shrink-0 text-blue-400",
                        !isSelected && "invisible",
                      )}
                    />
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                {copy.empty}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
