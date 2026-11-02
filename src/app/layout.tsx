import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "EventPass - Platform Manajemen & Registrasi Event",
  description:
    "Sistem manajemen registrasi event end-to-end, custom form builder, RSVP QR Code instan, check-in hari-H, dan doorprize spin wheel otomatis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}
