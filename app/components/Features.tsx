import Container from "./Container";

const FEATURES = [
  {
    icon: "fa-solid fa-bolt",
    title: "Lightning Fast",
    description: "Report incidents in under 60 seconds without long calls or complicated steps.",
  },
  {
    icon: "fa-solid fa-map-location-dot",
    title: "Auto Location Tagging",
    description: "GPS capture provides precise coordinates for responders to locate incidents instantly.",
  },
  {
    icon: "fa-solid fa-chart-line",
    title: "Live Monitoring",
    description: "Officials track all incoming reports in one unified real-time dashboard.",
  },
  {
    icon: "fa-solid fa-shield-halved",
    title: "Status Tracking",
    description: "Follow your report from pending to resolved with live status updates.",
  },
];

export default function Features() {
  return (
    <section className="bg-[var(--bg-gray)] py-[80px]">
      <Container size="narrow">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
            Features
          </span>
          <h2 className="mt-3 text-[30px] font-bold text-[var(--text)] sm:text-[40px]">Built for Emergencies</h2>
          <p className="mx-auto mt-3 max-w-[440px] text-[14px] leading-relaxed text-[var(--muted)]">
            Every feature is designed to reduce delays and improve response coordination.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="rounded-xl border border-[var(--line)] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(212,170,0,0.12)]">
                <i className={`${f.icon} text-[20px] text-[var(--red)]`}></i>
              </div>
              <h3 className="text-[16px] font-semibold text-[var(--text)]">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{f.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
