import { useMemo, useState, type ReactNode } from "react";

import { TemplateContext } from "@/context/template-context-value";
import { defaultTemplate } from "@/mock/template";
import type { Template } from "@/types/template";

interface TemplateProviderProps {
  children: ReactNode;
}

export function TemplateProvider({ children }: TemplateProviderProps) {
  const [template, setTemplate] = useState<Template>(() => ({
    ...defaultTemplate,
    titleFont: { ...defaultTemplate.titleFont },
    bodyFont: { ...defaultTemplate.bodyFont },
  }));
  const value = useMemo(() => ({ template, setTemplate }), [template]);

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}
