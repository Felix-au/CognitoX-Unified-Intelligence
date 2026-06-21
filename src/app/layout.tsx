import "./globals.css";
import NextAuthProvider from "@/providers/NextAuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import StyledJsxRegistry from "./registry";

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
  title: "CognitoX: Unified Intelligence Workspace & AI Chatbot",
  description: "CognitoX is a premium unified intelligence workspace and cognitive AI chatbot that integrates web research, note OCR transcription, YouTube media transcripts, Mermaid diagram studio, and client-side image edge filters.",
  keywords: [
    "CognitoX", 
    "CognitoX Chatbot", 
    "AI Chatbot Workspace", 
    "Unified Intelligence", 
    "Notes OCR Scanner", 
    "YouTube Transcript Analyzer", 
    "Mermaid Diagram Studio", 
    "Client-side Image Filter", 
    "Cognitive Assistant", 
    "Next.js AI Workspace"
  ],
  authors: [{ name: "CognitoX Team" }],
  openGraph: {
    title: "CognitoX: Unified Intelligence Workspace & AI Chatbot",
    description: "A premium unified cognitive workspace and AI chatbot powered by notes OCR, YouTube media analysis, Mermaid diagrams generation, and client-side image filter editing.",
    url: "https://cognitox.vercel.app",
    siteName: "CognitoX",
    images: [
      {
        url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: "CognitoX: Unified Intelligence Workspace & AI Chatbot",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CognitoX: Unified Intelligence Workspace & AI Chatbot",
    description: "A premium unified cognitive workspace and AI chatbot powered by notes OCR, YouTube media analysis, Mermaid diagrams generation, and client-side image filter editing.",
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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var theme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.classList.add('no-transitions');
          })();
          window.addEventListener('load', function() {
            document.documentElement.classList.remove('no-transitions');
          });
        ` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "CognitoX",
            "operatingSystem": "All",
            "applicationCategory": "BusinessApplication",
            "description": "CognitoX is a unified intelligence workspace and cognitive AI chatbot that integrates notes OCR transcription, YouTube transcripts, Mermaid diagram studio, and client-side image editing.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "CognitoX",
            "url": "https://cognitox.vercel.app",
            "logo": "https://cognitox.vercel.app/logo.png",
            "description": "CognitoX provides a unified cognitive AI chatbot workspace with OCR, diagram compiling, media transcription, and image filters."
          }
        ]) }} />
      </head>
      <body className={`${outfit.variable} ${plusJakartaSans.variable}`}>
        <NextAuthProvider>
          <ToastProvider>
            <StyledJsxRegistry>
              {children}
            </StyledJsxRegistry>
          </ToastProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
