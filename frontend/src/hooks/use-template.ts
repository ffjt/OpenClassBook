import { useContext } from "react";

import { TemplateContext } from "@/context/template-context-value";

export function useTemplate() {
  const context = useContext(TemplateContext);

  if (!context) {
    throw new Error("useTemplate must be used within a TemplateProvider");
  }

  return context;
}
