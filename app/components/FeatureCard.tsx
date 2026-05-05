type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
};

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
      <i className={`${icon} text-[26px] text-[var(--red)]`}></i>
      <h3 className="mt-4 text-[18px] font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{description}</p>
    </article>
  );
}
