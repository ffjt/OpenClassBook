"""Build installable OpenClassBook template folders from generated page art."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


THEMES = {
    "spring-blossom": ("Spring Blossom", "#72A8D8", "#F5D7D7", "#6B2E3B", "#333333", "Source Han Serif SC", "soft"),
    "summer-forest": ("Summer Forest", "#3E7C59", "#E5F0E8", "#1E5636", "#26352B", "Source Han Serif SC", "soft"),
    "autumn-ginkgo": ("Autumn Ginkgo", "#9A6A2F", "#F7E8C5", "#C05621", "#3B2F22", "Source Han Serif SC", "soft"),
    "winter-sun": ("Winter Sun", "#4A647A", "#EAF2F7", "#D69E2E", "#26323B", "Source Han Sans SC", "soft"),
    "misty-mountain": ("Misty Mountain", "#52656F", "#E8EEEC", "#8A9A5B", "#293438", "Source Han Serif SC", "square"),
    "rice-paper": ("Rice Paper", "#4B5563", "#F4F1EA", "#4A3420", "#2F3437", "Source Han Serif SC", "square"),
    "new-chinese": ("New Chinese Blank", "#7C3F3F", "#F7F1EA", "#B7791F", "#352D2D", "Source Han Serif SC", "square"),
    "campus-morning": ("Campus Morning", "#2563A6", "#E7F1FB", "#F59E0B", "#1F2937", "Source Han Sans SC", "soft"),
    "graduation": ("Graduation", "#4C5A8A", "#EEF0FA", "#D97706", "#252A43", "Source Han Serif SC", "soft"),
    "youth-dream": ("Youth Dream", "#0F766E", "#E4F6F3", "#F97316", "#173B3A", "Source Han Sans SC", "soft"),
    "nordic-forest": ("Nordic Forest", "#52796F", "#EEF3EE", "#D4A373", "#2F3E46", "Source Han Serif SC", "soft"),
    "ocean-fairytale": ("Ocean Fairytale", "#176B87", "#E4F4F8", "#E9B44C", "#17324D", "Source Han Sans SC", "soft"),
    "starry-dream": ("Starry Dream", "#3C3B6E", "#EEF0FF", "#D9A441", "#242447", "Source Han Serif SC", "soft"),
}


def build(source_root: Path, output_root: Path) -> None:
    missing: list[str] = []
    for template_id, theme in THEMES.items():
        source = source_root / f"{template_id}.png"
        if not source.is_file():
            missing.append(template_id)
            continue
        target = output_root / template_id
        target.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as opened:
            base = ImageOps.fit(opened.convert("RGB"), (1080, 1440), method=Image.Resampling.LANCZOS)
        article = ImageEnhance.Contrast(base).enhance(0.96)
        chapter = Image.blend(base, Image.new("RGB", base.size, "white"), 0.10)
        ending = ImageOps.mirror(ImageEnhance.Brightness(base).enhance(0.96))
        variants = {
            "cover.png": base,
            "cover_back.png": ImageOps.mirror(base),
            "chapter.png": chapter,
            "article_background.png": article,
            "ending.png": ending,
        }
        for filename, image in variants.items():
            image.save(target / filename, format="PNG", optimize=True)
        name, primary, secondary, accent, text, font, corner = theme
        manifest = {
            "id": template_id,
            "name": name,
            "primaryColor": primary,
            "secondaryColor": secondary,
            "accentColor": accent,
            "textColor": text,
            "fontFamily": font,
            "cornerStyle": corner,
            "safeArea": {"top": 120, "bottom": 140, "left": 80, "right": 80},
            "assets": {
                "cover": "cover.png",
                "coverBack": "cover_back.png",
                "chapter": "chapter.png",
                "articleBackground": "article_background.png",
                "ending": "ending.png",
            },
        }
        (target / "theme.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    if missing:
        raise SystemExit(f"Missing generated backgrounds: {', '.join(missing)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("tmp/imagegen/generated"))
    parser.add_argument("--output", type=Path, default=Path("frontend/public/templates"))
    arguments = parser.parse_args()
    build(arguments.source, arguments.output)
