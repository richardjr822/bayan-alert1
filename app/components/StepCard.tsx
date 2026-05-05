type StepCardProps = {
  index: string;
  title: string;
  description: string;
};

export default function StepCard({ index, title, description }: StepCardProps) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--red)] text-[14px] font-semibold text-white">
        {index}
      </div>
      <h3 className="text-[18px] font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>
    </article>
  );
}
