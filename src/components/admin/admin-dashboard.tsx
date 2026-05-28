"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  SiteContent,
  Section,
  SectionType,
  CarouselItemContent,
} from "@/lib/content";

type Previews = Record<string, string>;

interface Props {
  initialContent: SiteContent;
  initialPreviews: Previews;
}

export default function AdminDashboard({ initialContent, initialPreviews }: Props) {
  const router = useRouter();
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [previews, setPreviews] = useState<Previews>(initialPreviews);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function registerPreview(path: string, url: string) {
    setPreviews((p) => ({ ...p, [path]: url }));
  }

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2500);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  // ---- section helpers ----
  function updateSection(id: string, patch: Partial<Section>) {
    setContent((c) => ({
      ...c,
      sections: c.sections.map((s) =>
        s.id === id ? ({ ...s, ...patch } as Section) : s,
      ),
    }));
  }
  function addSection(type: SectionType) {
    const id = `section-${Date.now()}`;
    const base: Section =
      type === "carousel"
        ? { id, type, heading: "Nova seção", items: [] }
        : type === "richtext"
          ? { id, type, heading: "Nova seção", body: "Texto..." }
          : { id, type, heading: "Nova seção", buttonLabel: "Saiba mais", buttonHref: "#" };
    setContent((c) => ({ ...c, sections: [...c.sections, base] }));
  }
  function removeSection(id: string) {
    setContent((c) => ({ ...c, sections: c.sections.filter((s) => s.id !== id) }));
  }
  function moveSection(id: string, dir: -1 | 1) {
    setContent((c) => {
      const idx = c.sections.findIndex((s) => s.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= c.sections.length) return c;
      const sections = [...c.sections];
      [sections[idx], sections[next]] = [sections[next], sections[idx]];
      return { ...c, sections };
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <h1 className="text-lg font-bold text-white">
          AD3D<span className="text-emerald-500">.</span>LAB — Painel
        </h1>
        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            className="text-sm text-slate-400 hover:text-white"
          >
            Ver site ↗
          </a>
          <button
            onClick={save}
            disabled={status === "saving"}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            {status === "saving"
              ? "Salvando..."
              : status === "saved"
                ? "Salvo ✓"
                : status === "error"
                  ? "Erro — tentar de novo"
                  : "Salvar"}
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10">
        {/* THEME */}
        <Panel title="Tema (cores)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ColorField label="Destaque" value={content.theme.accent}
              onChange={(v) => setContent((c) => ({ ...c, theme: { ...c.theme, accent: v } }))} />
            <ColorField label="Fundo" value={content.theme.background}
              onChange={(v) => setContent((c) => ({ ...c, theme: { ...c.theme, background: v } }))} />
            <ColorField label="Cartão" value={content.theme.surface}
              onChange={(v) => setContent((c) => ({ ...c, theme: { ...c.theme, surface: v } }))} />
            <ColorField label="Texto" value={content.theme.text}
              onChange={(v) => setContent((c) => ({ ...c, theme: { ...c.theme, text: v } }))} />
          </div>
        </Panel>

        {/* HERO */}
        <Panel title="Hero (topo)">
          <Field label="Título"
            value={content.hero.title}
            onChange={(v) => setContent((c) => ({ ...c, hero: { ...c.hero, title: v } }))} />
          <Field label="Subtítulo" textarea
            value={content.hero.subtitle}
            onChange={(v) => setContent((c) => ({ ...c, hero: { ...c.hero, subtitle: v } }))} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Texto do botão"
              value={content.hero.ctaLabel}
              onChange={(v) => setContent((c) => ({ ...c, hero: { ...c.hero, ctaLabel: v } }))} />
            <Field label="Link do botão"
              value={content.hero.ctaHref}
              onChange={(v) => setContent((c) => ({ ...c, hero: { ...c.hero, ctaHref: v } }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ImageField label="Imagem de fundo" value={content.hero.backgroundImage}
              previews={previews} onPreview={registerPreview}
              onChange={(p) => setContent((c) => ({ ...c, hero: { ...c.hero, backgroundImage: p } }))} />
            <ImageField label="Objeto (frente)" value={content.hero.foregroundImage}
              previews={previews} onPreview={registerPreview}
              onChange={(p) => setContent((c) => ({ ...c, hero: { ...c.hero, foregroundImage: p } }))} />
          </div>
        </Panel>

        {/* SECTIONS */}
        <Panel title="Seções">
          <div className="space-y-6">
            {content.sections.map((section, i) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={i}
                total={content.sections.length}
                previews={previews}
                onPreview={registerPreview}
                onChange={(patch) => updateSection(section.id, patch)}
                onRemove={() => removeSection(section.id)}
                onMove={(dir) => moveSection(section.id, dir)}
              />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="self-center text-sm text-slate-400">Adicionar:</span>
            <AddButton onClick={() => addSection("carousel")}>Carrossel</AddButton>
            <AddButton onClick={() => addSection("richtext")}>Bloco de texto</AddButton>
            <AddButton onClick={() => addSection("cta")}>Chamada (CTA)</AddButton>
          </div>
        </Panel>

        {/* FOOTER */}
        <Panel title="Rodapé">
          <Field label="Título"
            value={content.footer.heading}
            onChange={(v) => setContent((c) => ({ ...c, footer: { ...c.footer, heading: v } }))} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Texto do botão"
              value={content.footer.ctaLabel}
              onChange={(v) => setContent((c) => ({ ...c, footer: { ...c.footer, ctaLabel: v } }))} />
            <Field label="Link do botão"
              value={content.footer.ctaHref}
              onChange={(v) => setContent((c) => ({ ...c, footer: { ...c.footer, ctaHref: v } }))} />
          </div>
          <p className="mt-4 mb-2 text-sm text-slate-400">Links de contato</p>
          {content.footer.links.map((link, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2">
              <input value={link.label} placeholder="Rótulo"
                onChange={(e) => {
                  const links = [...content.footer.links];
                  links[i] = { ...links[i], label: e.target.value };
                  setContent((c) => ({ ...c, footer: { ...c.footer, links } }));
                }}
                className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
              <input value={link.href} placeholder="https://..."
                onChange={(e) => {
                  const links = [...content.footer.links];
                  links[i] = { ...links[i], href: e.target.value };
                  setContent((c) => ({ ...c, footer: { ...c.footer, links } }));
                }}
                className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
              <button
                onClick={() => {
                  const links = content.footer.links.filter((_, j) => j !== i);
                  setContent((c) => ({ ...c, footer: { ...c.footer, links } }));
                }}
                className="rounded-lg border border-white/10 px-3 text-slate-400 hover:bg-white/5">×</button>
            </div>
          ))}
          <button
            onClick={() =>
              setContent((c) => ({
                ...c,
                footer: { ...c.footer, links: [...c.footer.links, { label: "", href: "" }] },
              }))
            }
            className="mt-1 text-sm text-emerald-400 hover:text-emerald-300">+ adicionar link</button>
          <div className="mt-4">
            <Field label="Copyright"
              value={content.footer.copyright}
              onChange={(v) => setContent((c) => ({ ...c, footer: { ...c.footer, copyright: v } }))} />
          </div>
        </Panel>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={status === "saving"}
            className="rounded-lg bg-emerald-500 px-6 py-3 font-medium text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            {status === "saving" ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </main>
    </div>
  );
}

// ---------- presentational + field components ----------

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, textarea = false,
}: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <label className="mb-4 block text-sm text-slate-300">
      {label}
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500" />
      )}
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border border-white/10 bg-transparent" />
        <input value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white" />
      </span>
    </label>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20">
      + {children}
    </button>
  );
}

function ImageField({
  label, value, previews, onChange, onPreview,
}: {
  label: string;
  value: string;
  previews: Previews;
  onChange: (path: string) => void;
  onPreview: (path: string, url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const url = value ? previews[value] : undefined;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        onPreview(data.path, data.url);
        onChange(data.path);
      } else {
        alert("Falha no upload.");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="text-sm text-slate-300">
      {label}
      <div className="mt-1 flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-slate-600">vazio</span>
          )}
        </div>
        <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5">
          {uploading ? "Enviando..." : "Trocar imagem"}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      </div>
    </div>
  );
}

function SectionEditor({
  section, index, total, previews, onChange, onPreview, onRemove, onMove,
}: {
  section: Section;
  index: number;
  total: number;
  previews: Previews;
  onChange: (patch: Partial<Section>) => void;
  onPreview: (path: string, url: string) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const label =
    section.type === "carousel" ? "Carrossel"
    : section.type === "richtext" ? "Bloco de texto"
    : "Chamada (CTA)";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded bg-white/5 px-2 py-1 text-xs uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => onMove(-1)} disabled={index === 0}>↑</IconBtn>
          <IconBtn onClick={() => onMove(1)} disabled={index === total - 1}>↓</IconBtn>
          <IconBtn onClick={onRemove}>🗑</IconBtn>
        </div>
      </div>

      <Field label="Título da seção"
        value={section.heading}
        onChange={(v) => onChange({ heading: v })} />

      {section.type === "richtext" && (
        <Field label="Texto" textarea
          value={section.body}
          onChange={(v) => onChange({ body: v } as Partial<Section>)} />
      )}

      {section.type === "cta" && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Texto do botão"
            value={section.buttonLabel}
            onChange={(v) => onChange({ buttonLabel: v } as Partial<Section>)} />
          <Field label="Link do botão"
            value={section.buttonHref}
            onChange={(v) => onChange({ buttonHref: v } as Partial<Section>)} />
        </div>
      )}

      {section.type === "carousel" && (
        <CarouselItemsEditor
          items={section.items}
          previews={previews}
          onPreview={onPreview}
          onChange={(items) => onChange({ items } as Partial<Section>)}
        />
      )}
    </div>
  );
}

function CarouselItemsEditor({
  items, previews, onChange, onPreview,
}: {
  items: CarouselItemContent[];
  previews: Previews;
  onChange: (items: CarouselItemContent[]) => void;
  onPreview: (path: string, url: string) => void;
}) {
  function update(i: number, patch: Partial<CarouselItemContent>) {
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }
  return (
    <div className="mt-2 space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-white/5 bg-slate-900/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <ImageField label="Imagem" value={item.image}
              previews={previews} onPreview={onPreview}
              onChange={(p) => update(i, { image: p })} />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="rounded border border-white/10 px-2 py-1 text-xs text-slate-400 hover:bg-white/5">remover</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input value={item.title} placeholder="Título"
              onChange={(e) => update(i, { title: e.target.value })}
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
            <input value={item.category} placeholder="Categoria"
              onChange={(e) => update(i, { category: e.target.value })}
              className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
          </div>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { image: "", title: "", category: "" }])}
        className="text-sm text-emerald-400 hover:text-emerald-300">+ adicionar item</button>
    </div>
  );
}

function IconBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-30">
      {children}
    </button>
  );
}
