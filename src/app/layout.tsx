import type { Metadata } from "next";
import "./style.css";
export const metadata: Metadata = { title: "ChainProof — Document Integrity", description: "Blockchain-backed document integrity verification prototype" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
