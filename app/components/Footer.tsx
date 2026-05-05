export default function Footer() {
  return (
    <footer className="bg-[var(--bg-gray)] py-8 text-center text-[12px] text-[var(--muted)]">
      <p>&copy; {new Date().getFullYear()} BayanAlert. All rights reserved.</p>
      <p>Emergency Hotline: 911 | BayanAlert Support: 1-800-BAYAN</p>
    </footer>
  );
}
