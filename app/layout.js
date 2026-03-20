import './globals.css';
import Navigation from './components/Navigation';
export const metadata = { title: 'ClassNGazer', description: 'Real-time classroom polling for IIT Indore' };
export default function RootLayout({ children }) { return (<html lang="en"><body><Navigation /><main>{children}</main></body></html>); }