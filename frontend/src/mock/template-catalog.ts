export interface TemplateCatalogEntry {
  id: string;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: "serif" | "sans-serif";
  cornerStyle: "soft" | "square";
  /** Official typography defaults applied without renderer conditionals. */
  titleFont?: { family: string; fullName: string; postscriptName: string; style: string };
  titleSize?: number;
  /** Default color applied to font layers when this exterior theme is chosen. */
  coverTextColor: string;
  backCoverTextColor: string;
  spineColor: string;
}

/** The first-party catalog is data-driven so community templates can be added without UI changes. */
const monetPalettes: Record<string, Pick<TemplateCatalogEntry, "primaryColor" | "secondaryColor" | "accentColor" | "textColor" | "coverTextColor" | "backCoverTextColor" | "spineColor">> = {
  "spring-blossom": { primaryColor: "#E3BD95", secondaryColor: "#FDF7EC", accentColor: "#625033", textColor: "#4E3D27", coverTextColor: "#4E3D27", backCoverTextColor: "#4E3D27", spineColor: "#9A6B50" },
  "summer-forest": { primaryColor: "#727F5A", secondaryColor: "#FCF8EB", accentColor: "#3E4A2E", textColor: "#26341E", coverTextColor: "#26341E", backCoverTextColor: "#26341E", spineColor: "#536848" },
  "autumn-ginkgo": { primaryColor: "#CD9C4B", secondaryColor: "#FBF6EF", accentColor: "#744814", textColor: "#49341C", coverTextColor: "#49341C", backCoverTextColor: "#49341C", spineColor: "#A56A24" },
  "winter-sun": { primaryColor: "#87663F", secondaryColor: "#FDFCFA", accentColor: "#4A331C", textColor: "#382719", coverTextColor: "#382719", backCoverTextColor: "#382719", spineColor: "#6B543A" },
  "misty-mountain": { primaryColor: "#7D7D70", secondaryColor: "#F8F7F5", accentColor: "#4F534B", textColor: "#363A34", coverTextColor: "#363A34", backCoverTextColor: "#363A34", spineColor: "#62665E" },
  "rice-paper": { primaryColor: "#97836A", secondaryColor: "#FBF3E4", accentColor: "#4A3F30", textColor: "#241B0F", coverTextColor: "#241B0F", backCoverTextColor: "#241B0F", spineColor: "#786552" },
  "new-chinese": { primaryColor: "#A28C72", secondaryColor: "#F9F2E6", accentColor: "#604631", textColor: "#44352A", coverTextColor: "#3E2F22", backCoverTextColor: "#3E2F22", spineColor: "#7D5949" },
  "campus-morning": { primaryColor: "#6F7657", secondaryColor: "#FDFBF7", accentColor: "#485140", textColor: "#343B2F", coverTextColor: "#343B2F", backCoverTextColor: "#343B2F", spineColor: "#4E6D7B" },
  graduation: { primaryColor: "#B6897C", secondaryColor: "#F8F7F2", accentColor: "#483521", textColor: "#302627", coverTextColor: "#302627", backCoverTextColor: "#302627", spineColor: "#9C6F6D" },
  "youth-dream": { primaryColor: "#488BDB", secondaryColor: "#FDFAF7", accentColor: "#1754A6", textColor: "#173B5C", coverTextColor: "#173B5C", backCoverTextColor: "#173B5C", spineColor: "#357FA6" },
  "nordic-forest": { primaryColor: "#ACAD96", secondaryColor: "#FDF8EB", accentColor: "#4F544A", textColor: "#373C34", coverTextColor: "#373C34", backCoverTextColor: "#373C34", spineColor: "#7A8E77" },
  "ocean-fairytale": { primaryColor: "#90BDD0", secondaryColor: "#F7F7F8", accentColor: "#25566A", textColor: "#1F4558", coverTextColor: "#1F4558", backCoverTextColor: "#1F4558", spineColor: "#4F92AD" },
  "starry-dream": { primaryColor: "#455EC1", secondaryColor: "#E9E5F1", accentColor: "#1B3894", textColor: "#010D31", coverTextColor: "#3F3A63", backCoverTextColor: "#3F3A63", spineColor: "#8170AF" },
};

/** Previous independent spine defaults are migrated to the shared cover/back color. */
const legacySpineTextColors: Record<string, string> = {
  "spring-blossom": "#FFFFFF", "summer-forest": "#FFFFFF", "autumn-ginkgo": "#FFFFFF", "winter-sun": "#FFFFFF",
  "misty-mountain": "#F8F7F5", "rice-paper": "#FFFFFF", "new-chinese": "#F9F2E6", "campus-morning": "#FFFFFF",
  graduation: "#FFFFFF", "youth-dream": "#FFFFFF", "nordic-forest": "#FFFFFF", "ocean-fairytale": "#FFFFFF", "starry-dream": "#F7F5FC",
};

export const isLegacyDefaultSpineTextColor = (templateId: string, color: unknown) =>
  typeof color === "string" && color.toUpperCase() === legacySpineTextColors[templateId]?.toUpperCase();

export const templateCatalog: TemplateCatalogEntry[] = [
  ["spring-blossom", "Spring Blossom", "春日桃花", "Soft spring editorial", "柔和的春日出版风", "#72A8D8", "#F5D7D7", "#6B2E3B", "#333333", "serif", "soft"],
  ["summer-forest", "Summer Forest", "夏日森林", "Fresh woodland pages", "清新的森林页面", "#3E7C59", "#E5F0E8", "#1E5636", "#26352B", "serif", "soft"],
  ["autumn-ginkgo", "Autumn Ginkgo", "秋日银杏", "Warm golden leaves", "温暖的金色秋叶", "#9A6A2F", "#F7E8C5", "#9A3E12", "#3B2F22", "serif", "soft"],
  ["winter-sun", "Winter Sun", "冬日暖阳", "Quiet winter light", "安静的冬日阳光", "#4A647A", "#EAF2F7", "#7A5700", "#26323B", "sans-serif", "soft"],
  ["misty-mountain", "Misty Mountain", "青山云雾", "Modern ink landscape", "现代水墨山景", "#52656F", "#E8EEEC", "#596C28", "#293438", "serif", "square"],
  ["rice-paper", "Rice Paper", "水墨宣纸", "Ink and paper minimal", "宣纸与水墨留白", "#4B5563", "#F4F1EA", "#4A3420", "#2F3437", "serif", "square"],
  ["new-chinese", "New Chinese Blank", "新中式留白", "Calm contemporary whitespace", "克制的新中式留白", "#7C3F3F", "#F7F1EA", "#7C3F3F", "#352D2D", "serif", "square"],
  ["campus-morning", "Campus Morning", "校园晨光", "Bright school editorial", "明亮的校园刊物", "#2563A6", "#E7F1FB", "#9A4F00", "#1F2937", "sans-serif", "soft"],
  ["graduation", "Graduation", "毕业季", "A keepsake for milestones", "记录毕业时光", "#4C5A8A", "#EEF0FA", "#5B4AA0", "#252A43", "serif", "soft"],
  ["youth-dream", "Youth Dream", "少年梦想", "Optimistic modern pages", "明快的少年梦想", "#0F766E", "#E4F6F3", "#A33B12", "#173B3A", "sans-serif", "soft"],
  ["nordic-forest", "Nordic Forest", "北欧森林", "Storybook calm", "北欧绘本的宁静感", "#52796F", "#EEF3EE", "#7A512D", "#2F3E46", "serif", "soft"],
  ["ocean-fairytale", "Ocean Fairytale", "海洋童话", "Open blue horizons", "开阔的海洋童话", "#176B87", "#E4F4F8", "#0E6680", "#17324D", "sans-serif", "soft"],
  ["starry-dream", "Starry Dream", "星空梦想", "A gentle night sky", "温柔的星空梦想", "#3C3B6E", "#EEF0FF", "#6652A3", "#242447", "serif", "soft"],
].map(([id, en, zh, enDesc, zhDesc, primaryColor, secondaryColor, accentColor, textColor, fontFamily, cornerStyle]) => ({
  id,
  name: { en, zh },
  description: { en: enDesc, zh: zhDesc },
  primaryColor,
  secondaryColor,
  accentColor,
  textColor,
  fontFamily,
  cornerStyle,
  ...(id === "spring-blossom" ? {
    titleFont: { family: "literary-serif", fullName: "LXGW WenKai / Source Han Serif SC", postscriptName: "literary-serif", style: "Regular" },
    titleSize: 28,
  } : {}),
})).map((template) => ({ ...template, ...monetPalettes[template.id] })) as TemplateCatalogEntry[];

export function getTemplateCatalogEntry(id: string) {
  return templateCatalog.find((entry) => entry.id === id) ?? templateCatalog[0];
}

export function applyTemplateAppearanceColorDefaults(
  appearance: BookAppearance,
  template: TemplateCatalogEntry,
  font: FontSelection = template.titleFont ?? {
    family: template.fontFamily,
    fullName: template.fontFamily,
    postscriptName: template.fontFamily,
    style: "Regular",
  },
): BookAppearance {
  const applyTextDefaults = (color: string) => (object: BookAppearance["frontCover"]["canvasObjects"][number]) =>
    object.type === "text" || object.type === "logo" ? { ...object, color, fontFamily: { ...font } } : object;

  return {
    ...appearance,
    frontCover: {
      ...appearance.frontCover,
      palette: { ...appearance.frontCover.palette, text: template.coverTextColor },
      canvasObjects: appearance.frontCover.canvasObjects.map(applyTextDefaults(template.coverTextColor)),
    },
    spine: {
      ...appearance.spine,
      backgroundColor: template.spineColor,
      textColor: template.coverTextColor,
      canvasObjects: appearance.spine.canvasObjects.map(applyTextDefaults(template.coverTextColor)),
    },
    backCover: {
      ...appearance.backCover,
      canvasObjects: appearance.backCover.canvasObjects.map(applyTextDefaults(template.backCoverTextColor)),
    },
  };
}

export type TemplateAssetKind =
  | "cover"
  | "cover_back"
  | "chapter"
  | "article_background"
  | "ending";

export function getTemplateAssetUrl(id: string, kind: TemplateAssetKind) {
  const safeId = templateCatalog.some((entry) => entry.id === id)
    ? id
    : templateCatalog[0].id;
  return `/templates/${safeId}/${kind}.png`;
}
import type { BookAppearance, FontSelection } from "@/types/template";
