import { describe, expect, it } from "vitest";

import { defaultTemplate } from "@/mock/template";
import { getPublicationPageChrome } from "@/types/template";

describe("publication page chrome", () => {
  it("uses the book title and default footer when configured text is empty", () => {
    const chrome = getPublicationPageChrome({
      bookTitle: "Class of 2026",
      pageNumber: 1,
      template: {
        ...defaultTemplate,
        footerText: "",
        headerText: "",
        showHeader: true,
      },
    });

    expect(chrome.headerText).toBe("Class of 2026");
    expect(chrome.footerText).toBe("OpenClassBook");
    expect(chrome.showHeader).toBe(true);
    expect(chrome.showFooter).toBe(true);
  });

  it("hides the page number on the first page and shows later pages", () => {
    expect(
      getPublicationPageChrome({
        bookTitle: "Book",
        pageNumber: 1,
        template: defaultTemplate,
      }).showPageNumber,
    ).toBe(false);
    expect(
      getPublicationPageChrome({
        bookTitle: "Book",
        pageNumber: 2,
        template: defaultTemplate,
      }).showPageNumber,
    ).toBe(true);
  });

  it("respects hidden page numbers and disabled header or footer", () => {
    const chrome = getPublicationPageChrome({
      bookTitle: "Book",
      pageNumber: 2,
      template: {
        ...defaultTemplate,
        pageNumberPosition: "hidden",
        showFooter: false,
        showHeader: false,
      },
    });

    expect(chrome.showHeader).toBe(false);
    expect(chrome.showFooter).toBe(false);
    expect(chrome.showPageNumber).toBe(false);
  });
});
