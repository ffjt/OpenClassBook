import { createContext, useContext, type ReactNode } from "react";

import { useLocale } from "@/context/LocaleContext";

export interface TemplateContextValue {
  publicationTitle: string;
  publicationSubtitle: string;
  issueLabel: string;
  accentColor: string;
}

const defaultTemplate: TemplateContextValue = {
  publicationTitle: "Field Notes",
  publicationSubtitle: "An open collection of classroom practice",
  issueLabel: "Issue 04 / 2026",
  accentColor: "#174f4a",
};

const TemplateContext = createContext<TemplateContextValue>(defaultTemplate);

export function TemplateProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const template =
    locale === "zh"
      ? {
          publicationTitle: "课堂札记",
          publicationSubtitle: "一份开放的课堂实践文集",
          issueLabel: "第 04 期 / 2026",
          accentColor: "#174f4a",
        }
      : defaultTemplate;

  return <TemplateContext.Provider value={template}>{children}</TemplateContext.Provider>;
}

// Context hooks intentionally share this small module with the provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useTemplateContext() {
  return useContext(TemplateContext);
}
