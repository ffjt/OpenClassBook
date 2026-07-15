export type ImageWrap =
  | "square"
  | "tight"
  | "through"
  | "topBottom"
  | "behindText"
  | "inFrontOfText";

export interface PreviewArticle {
  number: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  imagePage: number;
  imageWrap: ImageWrap;
  imagePosition: {
    x: number;
    y: number;
  };
  imageSize: {
    width: number;
    height: number;
  };
}
