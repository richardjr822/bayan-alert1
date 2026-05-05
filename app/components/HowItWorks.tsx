import Container from "./Container";
import StepCard from "./StepCard";

const STEPS = [
  {
    index: "1",
    title: "Submit a report",
    description: "Send the emergency details with contact information in seconds.",
  },
  {
    index: "2",
    title: "Location is tagged",
    description: "GPS tagging helps responders locate the incident quickly.",
  },
  {
    index: "3",
    title: "Officials respond",
    description: "Barangay teams coordinate responses from the live dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-[var(--bg-gray)] py-[88px]">
      <Container size="narrow">
        <h2 className="mb-4 text-center text-[34px] font-bold text-[var(--text)] sm:text-[48px]">How It Works</h2>
        <p className="mx-auto mb-10 max-w-[640px] text-center text-[14px] leading-relaxed text-[var(--muted)]">
          BayanAlert guides residents through a simple flow to keep every report accurate and actionable.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <StepCard key={step.index} index={step.index} title={step.title} description={step.description} />
          ))}
        </div>
      </Container>
    </section>
  );
}
