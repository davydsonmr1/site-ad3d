import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  isSupabaseEnabled,
  getSupabase,
  CONTENT_TABLE,
  CONTENT_ROW_ID,
} from "@/lib/supabase";

/**
 * Site content model. Everything here is editable from /admin and persisted to
 * data/content.json. Image fields hold a path relative to the protected store
 * (e.g. "products/x.webp"); they are turned into signed URLs at render time.
 */

export interface ThemeConfig {
  /** Accent / brand color (hex). */
  accent: string;
  /** Page background (hex). */
  background: string;
  /** Card / surface background (hex). */
  surface: string;
  /** Primary text color (hex). */
  text: string;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  backgroundImage: string;
  foregroundImage: string;
}

export interface CarouselItemContent {
  image: string;
  title: string;
  category: string;
}

export interface CarouselSection {
  id: string;
  type: "carousel";
  heading: string;
  items: CarouselItemContent[];
}

export interface RichTextSection {
  id: string;
  type: "richtext";
  heading: string;
  body: string;
}

export interface CtaSection {
  id: string;
  type: "cta";
  heading: string;
  buttonLabel: string;
  buttonHref: string;
}

export type Section = CarouselSection | RichTextSection | CtaSection;

export const SECTION_TYPES = ["carousel", "richtext", "cta"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterContent {
  heading: string;
  ctaLabel: string;
  ctaHref: string;
  links: FooterLink[];
  copyright: string;
}

export interface SiteContent {
  theme: ThemeConfig;
  hero: HeroContent;
  sections: Section[];
  footer: FooterContent;
}

export const DEFAULT_CONTENT: SiteContent = {
  theme: {
    accent: "#10b981",
    background: "#020617",
    surface: "#0f172a",
    text: "#e2e8f0",
  },
  hero: {
    title: "AD3D.LAB",
    subtitle:
      "Transformando ideias em realidade através da precisão milimétrica.",
    ctaLabel: "Ver coleção",
    ctaHref: "#colecao",
    backgroundImage: "hero/hero-bg-blur.webp",
    foregroundImage: "hero/hero-foreground-object.webp",
  },
  sections: [
    {
      id: "colecao",
      type: "carousel",
      heading: "Coleção",
      items: [
        { image: "products/colecionavel-01.webp", title: "Dragão Articulado", category: "Colecionáveis" },
        { image: "products/peca-tecnica-01.webp", title: "Engrenagem Helicoidal", category: "Peças Técnicas" },
        { image: "products/colecionavel-02.webp", title: "Busto Cyberpunk", category: "Colecionáveis" },
        { image: "products/peca-tecnica-02.webp", title: "Suporte Industrial", category: "Peças Técnicas" },
        { image: "products/colecionavel-03.webp", title: "Miniatura RPG", category: "Colecionáveis" },
        { image: "products/peca-tecnica-03.webp", title: "Protótipo Funcional", category: "Peças Técnicas" },
      ],
    },
  ],
  footer: {
    heading: "Vamos imprimir sua próxima ideia.",
    ctaLabel: "Iniciar projeto",
    ctaHref: "mailto:contato@ad3d.lab",
    links: [
      { label: "Instagram", href: "https://instagram.com/" },
      { label: "WhatsApp", href: "https://wa.me/" },
      { label: "E-mail", href: "mailto:contato@ad3d.lab" },
    ],
    copyright: "AD3D.LAB — Todos os direitos reservados.",
  },
};

const CONTENT_PATH = path.join(process.cwd(), "data", "content.json");

/** Merge stored (possibly partial) content over defaults so render never breaks. */
function mergeWithDefaults(parsed: Partial<SiteContent>): SiteContent {
  return {
    theme: { ...DEFAULT_CONTENT.theme, ...parsed.theme },
    hero: { ...DEFAULT_CONTENT.hero, ...parsed.hero },
    sections: parsed.sections ?? DEFAULT_CONTENT.sections,
    footer: { ...DEFAULT_CONTENT.footer, ...parsed.footer },
  };
}

export async function readContent(): Promise<SiteContent> {
  if (isSupabaseEnabled()) {
    const { data, error } = await getSupabase()
      .from(CONTENT_TABLE)
      .select("data")
      .eq("id", CONTENT_ROW_ID)
      .maybeSingle();
    if (error || !data?.data) return DEFAULT_CONTENT;
    return mergeWithDefaults(data.data as Partial<SiteContent>);
  }

  try {
    const raw = await readFile(CONTENT_PATH, "utf8");
    return mergeWithDefaults(JSON.parse(raw) as Partial<SiteContent>);
  } catch {
    return DEFAULT_CONTENT;
  }
}

export async function writeContent(content: SiteContent): Promise<void> {
  if (isSupabaseEnabled()) {
    const { error } = await getSupabase()
      .from(CONTENT_TABLE)
      .upsert({ id: CONTENT_ROW_ID, data: content, updated_at: new Date().toISOString() });
    if (error) throw new Error(`Supabase: ${error.message}`);
    return;
  }

  await mkdir(path.dirname(CONTENT_PATH), { recursive: true });
  await writeFile(CONTENT_PATH, JSON.stringify(content, null, 2), "utf8");
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Validate + normalize incoming content from the admin UI (defense at boundary). */
export function sanitizeContent(input: unknown): SiteContent {
  if (typeof input !== "object" || input === null) {
    throw new Error("Invalid content payload.");
  }
  const data = input as Record<string, unknown>;

  function str(v: unknown, fallback = ""): string {
    return typeof v === "string" ? v : fallback;
  }
  function hex(v: unknown, fallback: string): string {
    return typeof v === "string" && HEX.test(v) ? v : fallback;
  }
  // Image paths must stay inside the protected store — reject traversal.
  function imgPath(v: unknown, fallback = ""): string {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) return fallback;
    if (s.includes("..") || s.startsWith("/") || s.includes("\\")) return fallback;
    return s;
  }

  const theme = (data.theme ?? {}) as Record<string, unknown>;
  const hero = (data.hero ?? {}) as Record<string, unknown>;
  const footer = (data.footer ?? {}) as Record<string, unknown>;
  const rawSections = Array.isArray(data.sections) ? data.sections : [];

  const sections: Section[] = rawSections
    .map((s, i): Section | null => {
      const sec = s as Record<string, unknown>;
      const id = str(sec.id) || `section-${i}-${Date.now()}`;
      switch (sec.type) {
        case "carousel":
          return {
            id,
            type: "carousel",
            heading: str(sec.heading, "Seção"),
            items: (Array.isArray(sec.items) ? sec.items : []).map((it) => {
              const item = it as Record<string, unknown>;
              return {
                image: imgPath(item.image),
                title: str(item.title),
                category: str(item.category),
              };
            }),
          };
        case "richtext":
          return {
            id,
            type: "richtext",
            heading: str(sec.heading, "Seção"),
            body: str(sec.body),
          };
        case "cta":
          return {
            id,
            type: "cta",
            heading: str(sec.heading, "Seção"),
            buttonLabel: str(sec.buttonLabel, "Saiba mais"),
            buttonHref: str(sec.buttonHref, "#"),
          };
        default:
          return null;
      }
    })
    .filter((s): s is Section => s !== null);

  return {
    theme: {
      accent: hex(theme.accent, DEFAULT_CONTENT.theme.accent),
      background: hex(theme.background, DEFAULT_CONTENT.theme.background),
      surface: hex(theme.surface, DEFAULT_CONTENT.theme.surface),
      text: hex(theme.text, DEFAULT_CONTENT.theme.text),
    },
    hero: {
      title: str(hero.title, DEFAULT_CONTENT.hero.title),
      subtitle: str(hero.subtitle, DEFAULT_CONTENT.hero.subtitle),
      ctaLabel: str(hero.ctaLabel, DEFAULT_CONTENT.hero.ctaLabel),
      ctaHref: str(hero.ctaHref, DEFAULT_CONTENT.hero.ctaHref),
      backgroundImage: imgPath(hero.backgroundImage, DEFAULT_CONTENT.hero.backgroundImage),
      foregroundImage: imgPath(hero.foregroundImage, DEFAULT_CONTENT.hero.foregroundImage),
    },
    sections,
    footer: {
      heading: str(footer.heading, DEFAULT_CONTENT.footer.heading),
      ctaLabel: str(footer.ctaLabel, DEFAULT_CONTENT.footer.ctaLabel),
      ctaHref: str(footer.ctaHref, DEFAULT_CONTENT.footer.ctaHref),
      links: (Array.isArray(footer.links) ? footer.links : []).map((l) => {
        const link = l as Record<string, unknown>;
        return { label: str(link.label), href: str(link.href) };
      }),
      copyright: str(footer.copyright, DEFAULT_CONTENT.footer.copyright),
    },
  };
}
