import LandingPageClient from "./LandingPageClient";
import { Metadata } from "next";

export const metadata: Metadata = {
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

export default function Page() {
  return <LandingPageClient />;
}
