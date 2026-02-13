import "./globals.css";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata = {
  title: "CognitoX: Unified Intelligence Workspace",
  description: "CognitoX is a premium cognitive AI workspace that unifies web intelligence, high-fidelity notes OCR, media analyzer transcript extraction, diagrams generator, and interactive client-side image filtering.",
  keywords: ["CognitoX", "AI Workspace", "Notes OCR", "YouTube Transcript", "Mermaid Diagram Studio", "Image Filters", "Unified Intelligence"],
  authors: [{ name: "CognitoX Team" }],
  openGraph: {
    title: "CognitoX: Unified Intelligence Workspace",
    description: "A premium, unified cognitive workspace powered by high-fidelity AI notes OCR, media analyzer, diagrams generator, and client-side image editing.",
    url: "https://cognitox.vercel.app",
    siteName: "CognitoX",
    images: [
      {
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: "CognitoX: Unified Intelligence Workspace",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CognitoX: Unified Intelligence Workspace",
    description: "A premium, unified cognitive workspace powered by high-fidelity AI notes OCR, media analyzer, diagrams generator, and client-side image editing.",
    images: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
          })();
        ` }} />
      </head>
      <body className={`${outfit.variable} ${plusJakartaSans.variable}`}>
        <NextAuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
