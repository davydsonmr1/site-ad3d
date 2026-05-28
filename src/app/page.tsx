import type { CSSProperties } from "react";
import SmoothScroll from "@/components/parallax/smooth-scroll";
import HeroParallax from "@/components/parallax/hero-parallax";
import SectionRenderer from "@/components/sections/section-renderer";
import FooterDynamic from "@/components/sections/footer-dynamic";
import { assetUrl } from "@/lib/asset-token";
import { readContent } from "@/lib/content";

/**
 * Public homepage. All content (theme, hero, sections, footer) comes from
 * data/content.json, edited via /admin. Signed asset URLs are minted here.
 * Dynamic so edits show up on the next request without a rebuild.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await readContent();

  const themeStyle = {
    "--accent": content.theme.accent,
    "--bg": content.theme.background,
    "--surface": content.theme.surface,
    "--text": content.theme.text,
  } as CSSProperties;

  return (
    <SmoothScroll>
      <main
        style={themeStyle}
        className="flex flex-col bg-[var(--bg)] text-[var(--text)]"
      >
        <HeroParallax
          backgroundSrc={assetUrl(content.hero.backgroundImage, 600)}
          foregroundSrc={assetUrl(content.hero.foregroundImage, 600)}
          title={content.hero.title}
          subtitle={content.hero.subtitle}
          ctaLabel={content.hero.ctaLabel}
          ctaHref={content.hero.ctaHref}
        />

        {content.sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}

        <FooterDynamic {...content.footer} />
      </main>
    </SmoothScroll>
  );
}
