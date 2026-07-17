import type {
  PageMargin,
  PageNumberPosition,
} from "@/types/template";

const footerInsets = {
  narrow: { bottom: "2.5%", left: "8%", right: "8%" },
  normal: { bottom: "3.2%", left: "11%", right: "11%" },
  wide: { bottom: "4.2%", left: "15%", right: "15%" },
};

const pointSizeInContainerWidth = (points: number, pageWidthMm: number) =>
  `${((points * 25.4) / 72 / pageWidthMm) * 100}cqw`;

interface PublicationPageFooterProps {
  color?: string;
  footerText: string;
  pageMargin: PageMargin;
  pageNumber: number;
  pageNumberPosition: PageNumberPosition;
  pageWidthMm: number;
  showFooter: boolean;
}

export function PublicationPageFooter({
  color,
  footerText,
  pageMargin,
  pageNumber,
  pageNumberPosition,
  pageWidthMm,
  showFooter,
}: PublicationPageFooterProps) {
  if (!showFooter && pageNumberPosition === "hidden") return null;

  return (
    <footer
      className="absolute z-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline bg-[#fffefa] text-slate-400"
      style={{
        ...footerInsets[pageMargin],
        color,
        columnGap: "2cqw",
      }}
    >
      {showFooter ? (
        <span
          className="min-w-0 truncate whitespace-nowrap"
          style={{ fontSize: pointSizeInContainerWidth(8, pageWidthMm) }}
        >
          {footerText || "OpenClassBook"}
        </span>
      ) : null}
      {pageNumberPosition !== "hidden" ? (
        <span
          className={
            pageNumberPosition === "right"
              ? "col-start-3 justify-self-end whitespace-nowrap"
              : "col-start-2 justify-self-center whitespace-nowrap"
          }
          style={{ fontSize: pointSizeInContainerWidth(9, pageWidthMm) }}
        >
          {pageNumber}
        </span>
      ) : null}
    </footer>
  );
}
