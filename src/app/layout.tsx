import type { ReactNode } from "react";

// The real <html> lives in [locale]/layout.tsx so lang/dir follow the locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
