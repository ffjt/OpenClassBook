import { createContext, type Dispatch, type SetStateAction } from "react";

import type { Template } from "@/types/template";

export interface TemplateContextValue {
  template: Template;
  setTemplate: Dispatch<SetStateAction<Template>>;
}

export const TemplateContext = createContext<
  TemplateContextValue | undefined
>(undefined);
