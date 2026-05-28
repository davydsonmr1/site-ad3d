import MagneticButton from "@/components/ui/magnetic-button";
import type { FooterContent } from "@/lib/content";

export default function FooterDynamic({
  heading,
  ctaLabel,
  ctaHref,
  links,
  copyright,
}: FooterContent) {
  // Split a trailing period into an accent dot, like the hero wordmark.
  const dotIdx = heading.lastIndexOf(".");
  const head =
    dotIdx === heading.length - 1 && dotIdx > 0 ? heading.slice(0, -1) : heading;
  const hasDot = dotIdx === heading.length - 1 && dotIdx > 0;

  return (
    <footer className="relative w-full overflow-hidden border-t border-white/5 bg-[var(--bg,#020617)] py-16 sm:py-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-900/15 via-slate-950 to-slate-950" />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-10 px-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-5xl">
          {head}
          {hasDot && <span style={{ color: "var(--accent, #10b981)" }}>.</span>}
        </h2>
        <MagneticButton href={ctaHref} strength={32}>
          {ctaLabel}
        </MagneticButton>
        <nav className="flex flex-wrap items-center justify-center gap-6">
          {links.map((c) => (
            <a
              key={c.label + c.href}
              href={c.href}
              className="text-sm uppercase tracking-widest text-slate-400 transition-colors hover:text-[var(--accent,#34d399)]"
            >
              {c.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} {copyright}
        </p>
      </div>
    </footer>
  );
}
