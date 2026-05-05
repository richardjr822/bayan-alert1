import Container from "./Container";

const STEPS = [
  {
    index: "01",
    icon: "fa-solid fa-file-circle-plus",
    title: "Submit a Report",
    description: "Fill in the incident type and contact details. Location is auto-captured by GPS in seconds.",
  },
  {
    index: "02",
    icon: "fa-solid fa-map-pin",
    title: "Location is Tagged",
    description: "Precise coordinates are attached to your report so responders know exactly where to go.",
  },
  {
    index: "03",
    icon: "fa-solid fa-people-group",
    title: "Officials Respond",
    description: "Barangay responders review and coordinate action from the live monitoring dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-[80px]">
      <Container size="narrow">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full bg-[var(--bg-gray)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
            How It Works
          </span>
          <h2 className="mt-3 text-[30px] font-bold text-[var(--text)] sm:text-[40px]">3 Simple Steps</h2>
          <p className="mx-auto mt-3 max-w-[440px] text-[14px] leading-relaxed text-[var(--muted)]">
            No account required to report. Takes under 60 seconds.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <article
              key={step.index}
              className="relative rounded-xl border border-[var(--line)] bg-[var(--bg-gray)] p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <span className="absolute right-5 top-5 text-[40px] font-extrabold leading-none text-[var(--line)]">
                {step.index}
              </span>
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--red)] shadow-[0_2px_12px_rgba(212,170,0,0.30)]">
                <i className={`${step.icon} text-[18px] text-white`}></i>
              </div>
              <h3 className="text-[17px] font-semibold text-[var(--text)]">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{step.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
