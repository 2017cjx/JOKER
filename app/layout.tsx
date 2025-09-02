import "./globals.css";

export const metadata = {
  title: "JOKER - Safe Project Dumps",
  description: "Organize and redact your project into clean text for ChatGPT.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
