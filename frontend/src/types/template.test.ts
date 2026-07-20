import { describe, expect, it } from "vitest";

import { defaultTemplate } from "@/mock/template";
import {
  getPublicationPageChrome,
  getTemplateSubtitle,
  withColumnLayout,
} from "@/types/template";

describe("column layout rules", () => {
  it("uses centered plain titles and page numbers only for one column", () => {
    const template = withColumnLayout(
      { ...defaultTemplate, subtitleAlign: "right" },
      1,
    );

    expect(template).toMatchObject({
      columns: 1,
      pageNumberPosition: "center",
      showFooter: false,
      showHeader: false,
      subtitleAlign: "center",
      titleAlign: "center",
      titleSurfaceEnabled: false,
    });
  });

  it("uses left titles, a 15 percent surface, header, and footer for two columns", () => {
    const template = withColumnLayout(defaultTemplate, 2);

    expect(template).toMatchObject({
      columns: 2,
      pageNumberPosition: "center",
      showFooter: true,
      showHeader: true,
      titleAlign: "left",
      titleSurfaceEnabled: true,
      titleSurfaceOpacity: 15,
    });
  });
});

describe("template subtitles", () => {
  it("uses article subtitles in free mode", () => {
    expect(getTemplateSubtitle(defaultTemplate, "Article subtitle")).toBe(
      "Article subtitle",
    );
  });

  it("uses fixed subtitles and hides disabled subtitles", () => {
    expect(
      getTemplateSubtitle(
        { ...defaultTemplate, fixedSubtitle: "Fixed", subtitleMode: "fixed" },
        "Article subtitle",
      ),
    ).toBe("Fixed");
    expect(
      getTemplateSubtitle(
        { ...defaultTemplate, subtitleMode: "disabled" },
        "Article subtitle",
      ),
    ).toBe("");
  });
});

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
