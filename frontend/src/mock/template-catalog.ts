import type { Template } from "@/types/template";

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
  preset: Template["preset"];
}

/** The first-party catalog is data-driven so community templates can be added without UI changes. */
export const templateCatalog: TemplateCatalogEntry[] = [
  ["spring-blossom", "Spring Blossom", "春日桃花", "Soft spring editorial", "柔和的春日出版风", "#72A8D8", "#F5D7D7", "#805200", "#333333", "serif", "soft", "collection"],
  ["summer-forest", "Summer Forest", "夏日森林", "Fresh woodland pages", "清新的森林页面", "#3E7C59", "#E5F0E8", "#2F6B3E", "#26352B", "serif", "soft", "collection"],
  ["autumn-ginkgo", "Autumn Ginkgo", "秋日银杏", "Warm golden leaves", "温暖的金色秋叶", "#9A6A2F", "#F7E8C5", "#9A3E12", "#3B2F22", "serif", "soft", "collection"],
  ["winter-sun", "Winter Sun", "冬日暖阳", "Quiet winter light", "安静的冬日阳光", "#4A647A", "#EAF2F7", "#7A5700", "#26323B", "sans-serif", "soft", "collection"],
  ["misty-mountain", "Misty Mountain", "青山云雾", "Modern ink landscape", "现代水墨山景", "#52656F", "#E8EEEC", "#596C28", "#293438", "serif", "square", "collection"],
  ["rice-paper", "Rice Paper", "水墨宣纸", "Ink and paper minimal", "宣纸与水墨留白", "#4B5563", "#F4F1EA", "#75551A", "#2F3437", "serif", "square", "collection"],
  ["new-chinese", "New Chinese Blank", "新中式留白", "Calm contemporary whitespace", "克制的新中式留白", "#7C3F3F", "#F7F1EA", "#7C3F3F", "#352D2D", "serif", "square", "collection"],
  ["campus-morning", "Campus Morning", "校园晨光", "Bright school editorial", "明亮的校园刊物", "#2563A6", "#E7F1FB", "#9A4F00", "#1F2937", "sans-serif", "soft", "magazine"],
  ["graduation", "Graduation", "毕业季", "A keepsake for milestones", "记录毕业时光", "#4C5A8A", "#EEF0FA", "#5B4AA0", "#252A43", "serif", "soft", "collection"],
  ["youth-dream", "Youth Dream", "少年梦想", "Optimistic modern pages", "明快的少年梦想", "#0F766E", "#E4F6F3", "#A33B12", "#173B3A", "sans-serif", "soft", "magazine"],
  ["nordic-forest", "Nordic Forest", "北欧森林", "Storybook calm", "北欧绘本的宁静感", "#52796F", "#EEF3EE", "#7A512D", "#2F3E46", "serif", "soft", "collection"],
  ["ocean-fairytale", "Ocean Fairytale", "海洋童话", "Open blue horizons", "开阔的海洋童话", "#176B87", "#E4F4F8", "#0E6680", "#17324D", "sans-serif", "soft", "magazine"],
  ["starry-dream", "Starry Dream", "星空梦想", "A gentle night sky", "温柔的星空梦想", "#3C3B6E", "#EEF0FF", "#6652A3", "#242447", "serif", "soft", "collection"],
].map(([id, en, zh, enDesc, zhDesc, primaryColor, secondaryColor, accentColor, textColor, fontFamily, cornerStyle, preset]) => ({ id, name: { en, zh }, description: { en: enDesc, zh: zhDesc }, primaryColor, secondaryColor, accentColor, textColor, fontFamily, cornerStyle, preset })) as TemplateCatalogEntry[];

export function getTemplateCatalogEntry(id: string) {
  return templateCatalog.find((entry) => entry.id === id) ?? templateCatalog[0];
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
