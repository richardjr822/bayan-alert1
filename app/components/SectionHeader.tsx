type SectionHeaderProps = {
  title: string;
  description?: string;
  align?: "left" | "center";
};

export default function SectionHeader({ title, description, align = "center" }: SectionHeaderProps) {
  const alignClass = align === "left" ? "text-left" : "text-center";
  return (
    <div className={alignClass}>
      <h2 className="text-[34px] font-bold text-[var(--text)] sm:text-[48px]">{title}</h2>
      {description ? (
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">{description}</p>
      ) : null}
    </div>
  );
}
