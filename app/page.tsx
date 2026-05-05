import CTASection from "./components/CTASection";
import Features from "./components/Features";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Topbar from "./components/Topbar";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
