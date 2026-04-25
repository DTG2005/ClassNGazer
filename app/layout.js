import './globals.css';
import 'katex/dist/katex.min.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = { title: 'ClassNGazer — Live Classroom Polls', description: 'Real-time polling for IIT Indore' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/svg+xml" href="/icons/favicon_icon.svg" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}