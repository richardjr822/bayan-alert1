import Container from "./Container";
import FeatureCard from "./FeatureCard";

const FEATURES = [
  {
    icon: "fa-solid fa-bolt",
    title: "Lightning Fast",
    description: "Report incidents quickly without long calls or complicated steps.",
  },
  {
    icon: "fa-solid fa-map-location-dot",
    title: "Auto Location Tagging",
    description: "GPS capture provides precise directions for responders.",
  },
  {
    icon: "fa-solid fa-chart-line",
    title: "Live Monitoring",
    description: "Officials track incoming reports in one unified dashboard.",
  },
  {
    icon: "fa-solid fa-handshake-angle",
    title: "Community Centered",
    description: "Designed for barangay coordination and resident safety.",
  },
];

export default function Features() {
  return (
    <section className="bg-[var(--bg-gray)] py-[88px]">
      <Container size="narrow">
        <h2 className="mb-4 text-center text-[34px] font-bold text-[var(--text)] sm:text-[48px]">
          Why Choose BayanAlert?
        </h2>
        <p className="mx-auto mb-10 max-w-[640px] text-center text-[14px] leading-relaxed text-[var(--muted)]">
          A clear, trusted platform built for residents and barangay responders.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
