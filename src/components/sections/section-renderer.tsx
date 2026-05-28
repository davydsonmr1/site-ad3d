import MagneticCarousel from "@/components/sections/carousel-section";
import RichTextSectionView from "@/components/sections/richtext-section";
import CtaSectionView from "@/components/sections/cta-section";
import { assetUrl } from "@/lib/asset-token";
import type { Section } from "@/lib/content";

/** Server component: maps a content Section to its rendered block. */
export default function SectionRenderer({ section }: { section: Section }) {
  switch (section.type) {
    case "carousel":
      return (
        <MagneticCarousel
          id={section.id}
          heading={section.heading}
          items={section.items
            .filter((it) => it.image)
            .map((it) => ({
              src: assetUrl(it.image, 600),
              title: it.title,
              category: it.category,
            }))}
        />
      );
    case "richtext":
      return (
        <RichTextSectionView
          id={section.id}
          heading={section.heading}
          body={section.body}
        />
      );
    case "cta":
      return (
        <CtaSectionView
          id={section.id}
          heading={section.heading}
          buttonLabel={section.buttonLabel}
          buttonHref={section.buttonHref}
        />
      );
    default:
      return null;
  }
}
