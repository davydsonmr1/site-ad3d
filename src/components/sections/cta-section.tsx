import MagneticButton from "@/components/ui/magnetic-button";

export default function CtaSectionView({
  id,
  heading,
  buttonLabel,
  buttonHref,
}: {
  id: string;
  heading: string;
  buttonLabel: string;
  buttonHref: string;
}) {
  return (
    <section
      id={id}
      className="w-full bg-[var(--surface,#0f172a)] py-20 sm:py-28"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          {heading}
        </h2>
        <MagneticButton href={buttonHref} strength={28}>
          {buttonLabel}
        </MagneticButton>
      </div>
    </section>
  );
}
