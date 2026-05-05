import Container from "../components/Container";
import Footer from "../components/Footer";
import RegisterForm from "../components/client/RegisterForm";
import SectionHeader from "../components/SectionHeader";
import Topbar from "../components/Topbar";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex-1 bg-[var(--bg-gray)] py-[88px]">
        <Container size="narrow">
          <SectionHeader title="Resident Registration" description="Create your BayanAlert account for faster reporting." />
          <div className="mt-10">
            <RegisterForm />
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
