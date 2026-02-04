import "./globals.css";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";

export const metadata = {
  title: "CognitoX: Unified Intelligence Workspace",
  description: "CognitoX is a cognitive workspace that unifies web intelligence, notes OCR, media analyzer, diagrams generator, and interactive image filtering.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <NextAuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
