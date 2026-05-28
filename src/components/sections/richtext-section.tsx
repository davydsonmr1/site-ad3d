export default function RichTextSectionView({
  id,
  heading,
  body,
}: {
  id: string;
  heading: string;
  body: string;
}) {
  return (
    <section
      id={id}
      className="w-full bg-[var(--bg,#020617)] py-16 sm:py-24"
    >
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          {heading}
        </h2>
        {body.split("\n").map((line, i) => (
          <p key={i} className="mb-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
