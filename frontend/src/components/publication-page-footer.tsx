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
  footerColor?: string;
  footerText: string;
  pageMargin: PageMargin;
  pageNumber: number;
  pageNumberPosition: PageNumberPosition;
  pageWidthMm: number;
  pageNumberColor?: string;
  showPageNumber: boolean;
  showFooter: boolean;
}

export function PublicationPageFooter({
  footerColor,
  footerText,
  pageMargin,
  pageNumber,
  pageNumberPosition,
  pageWidthMm,
  pageNumberColor,
  showPageNumber,
  showFooter,
}: PublicationPageFooterProps) {
  if (!showFooter && !showPageNumber) return null;

  return (
    <footer
      className="absolute z-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline bg-[#fffefa] text-slate-400"
      style={{
        ...footerInsets[pageMargin],
        columnGap: "2cqw",
      }}
    >
      {showFooter ? (
        <span
          className="min-w-0 truncate whitespace-nowrap"
          style={{
            color: footerColor,
            fontSize: pointSizeInContainerWidth(8, pageWidthMm),
          }}
        >
          {footerText || "OpenClassBook"}
        </span>
      ) : null}
      {showPageNumber ? (
        <span
          className={
            pageNumberPosition === "right"
              ? "col-start-3 justify-self-end whitespace-nowrap"
              : "col-start-2 justify-self-center whitespace-nowrap"
          }
          style={{
            color: pageNumberColor,
            fontSize: pointSizeInContainerWidth(9, pageWidthMm),
          }}
        >
          {pageNumber}
        </span>
      ) : null}
    </footer>
  );
}
