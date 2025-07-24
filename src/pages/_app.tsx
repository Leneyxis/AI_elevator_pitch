// src/pages/_app.tsx
import '../styles/globals.css';    // your Tailwind CSS import
import type { AppProps } from 'next/app';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300','400','500','600','700'],
  variable: '--font-poppins',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={poppins.variable}>
      <Component {...pageProps} />
    </div>
  );
}
