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
  surfaceColor: string;
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
  surfaceColor,
  showPageNumber,
  showFooter,
}: PublicationPageFooterProps) {
  if (!showFooter && !showPageNumber) return null;
  const chipColor = /^#[0-9a-f]{6}$/i.test(surfaceColor)
    ? `${surfaceColor}dc`
    : "rgba(255, 254, 250, 0.86)";
  const chipClassName = "rounded-[0.45em] px-[0.6em] py-[0.28em] shadow-[0_1px_4px_rgba(15,23,42,0.12)] backdrop-blur-[2px]";

  return (
    <footer
      className="absolute z-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-baseline text-slate-400"
      style={{
        ...footerInsets[pageMargin],
        columnGap: "2cqw",
      }}
    >
      {showFooter ? (
        <span
          className={`${chipClassName} min-w-0 truncate whitespace-nowrap`}
          style={{
            backgroundColor: chipColor,
            color: footerColor,
            fontSize: pointSizeInContainerWidth(8, pageWidthMm),
          }}
        >
          {footerText || "OpenClassBook"}
        </span>
      ) : null}
      {showPageNumber ? (
        <span
          className={`${chipClassName} ${
            pageNumberPosition === "right"
              ? "col-start-3 justify-self-end whitespace-nowrap"
              : "col-start-2 justify-self-center whitespace-nowrap"
          }`}
          style={{
            backgroundColor: chipColor,
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
