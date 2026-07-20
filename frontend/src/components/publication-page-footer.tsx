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
  footerFontFamily: string;
  footerFontSize: number;
  footerText: string;
  pageMargin: PageMargin;
  pageNumber: number;
  pageNumberPosition: PageNumberPosition;
  pageWidthMm: number;
  pageNumberColor?: string;
  surfaceOpacity: number;
  showPageNumber: boolean;
  showFooter: boolean;
}

export function PublicationPageFooter({
  footerColor,
  footerFontFamily,
  footerFontSize,
  footerText,
  pageMargin,
  pageNumber,
  pageNumberPosition,
  pageWidthMm,
  pageNumberColor,
  surfaceOpacity,
  showPageNumber,
  showFooter,
}: PublicationPageFooterProps) {
  if (!showFooter && !showPageNumber) return null;
  const pageNumberLabel = String(pageNumber).padStart(2, "0");
  const opacity = Math.min(100, Math.max(0, surfaceOpacity)) / 100;
  const chipClassName = "rounded-[0.45em] border px-[0.6em] py-[0.28em] backdrop-blur-[2px]";
  const chipSurfaceStyle = {
    backgroundColor: `rgba(255,255,255,${opacity})`,
    borderColor: `rgba(255,255,255,${opacity * 0.75})`,
    boxShadow: `0 1px 4px rgba(15,23,42,${opacity * 0.14})`,
  };

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
          className={`${chipClassName} min-w-0 w-fit max-w-full justify-self-start truncate whitespace-nowrap`}
          style={{
            ...chipSurfaceStyle,
            color: footerColor,
            fontFamily: footerFontFamily,
            fontSize: pointSizeInContainerWidth(footerFontSize, pageWidthMm),
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
            ...chipSurfaceStyle,
            color: pageNumberColor,
            fontFamily: 'Arial, "Helvetica Neue", sans-serif',
            fontSize: pointSizeInContainerWidth(10, pageWidthMm),
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            letterSpacing: "0.08em",
            minWidth: "3.2em",
            textAlign: "center",
          }}
        >
          {pageNumberLabel}
        </span>
      ) : null}
    </footer>
  );
}
