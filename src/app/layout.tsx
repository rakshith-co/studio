import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Q-Commerce Insights',
  description: 'A survey on dark patterns in quick commerce apps.',
  openGraph: {
    title: 'Q-Commerce Insights',
    description: 'Uncover the hidden psychological tricks in your favorite quick commerce apps.',
    images: [
      {
        url: 'https://placehold.co/600x400.png?text=My+Q-Commerce+Insights',
        width: 600,
        height: 400,
        alt: 'Q-Commerce Insights Summary',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Q-Commerce Insights',
    description: 'I just uncovered my online shopping habits with Q-Commerce Insights! Get your own analysis.',
    images: ['https://placehold.co/600x400.png?text=My+Q-Commerce+Insights'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
