import Container from "../components/Container";
import Footer from "../components/Footer";
import LoginForm from "../components/client/LoginForm";
import SectionHeader from "../components/SectionHeader";
import Topbar from "../components/Topbar";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <main className="flex-1 bg-[var(--bg-gray)] py-[88px]">
        <Container size="narrow">
          <SectionHeader title="Resident Login" description="Access your account to submit emergency reports." />
          <div className="mt-10">
            <LoginForm />
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
