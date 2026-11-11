export function SectionHeading({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      {eyebrow && <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>}
      <h2 className="text-3xl font-bold leading-tight md:text-4xl">{title}</h2>
      {text && <p className="mt-4 leading-8 text-muted-foreground">{text}</p>}
    </div>
  );
}
