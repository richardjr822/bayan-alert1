import Container from "../components/Container";
import Footer from "../components/Footer";
import SectionHeader from "../components/SectionHeader";
import Topbar from "../components/Topbar";
import ReportFormClient from "../components/client/ReportFormClient";

export default function ReportPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex-1 bg-[var(--bg-gray)] py-[88px]">
        <Container size="narrow">
          <SectionHeader
            title="Submit an Emergency Report"
            description="Provide accurate details so responders can reach you quickly and safely."
          />
          <div className="mt-10">
            <ReportFormClient />
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
