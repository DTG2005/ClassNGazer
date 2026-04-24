import './globals.css';
import 'katex/dist/katex.min.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = { title: 'ClassNGazer — Live Classroom Polls', description: 'Real-time polling for IIT Indore' };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      <script dangerouslySetInnerHTML={{
  __html: `
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  `
}} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#000000" />
<meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}