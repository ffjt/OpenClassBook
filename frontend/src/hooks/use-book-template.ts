import { useCallback, useEffect, useState } from "react";

import { defaultTemplate } from "@/mock/template";
import { useTemplate } from "@/hooks/use-template";
import { templateRepository } from "@/repositories/templateRepository";

export type BookTemplateLoadStatus = "idle" | "loading" | "ready" | "error";

const createDefaultTemplate = () => ({
  ...defaultTemplate,
  titleFont: { ...defaultTemplate.titleFont },
  bodyFont: { ...defaultTemplate.bodyFont },
});

export function useBookTemplate(bookId?: number) {
  const templateContext = useTemplate();
  const { setTemplate } = templateContext;
  const [status, setStatus] = useState<BookTemplateLoadStatus>("idle");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!bookId) {
      setStatus("idle");
      return;
    }

    let active = true;
    setStatus("loading");

    templateRepository.getSettingsByBook(bookId).then(
      (savedTemplate) => {
        if (!active) return;
        setTemplate(savedTemplate ?? createDefaultTemplate());
        setStatus("ready");
      },
      () => {
        if (active) setStatus("error");
      },
    );

    return () => {
      active = false;
    };
  }, [bookId, reloadKey, setTemplate]);

  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  return { ...templateContext, reload, status };
}
