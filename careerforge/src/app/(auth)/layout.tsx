import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr]">
      <header className="px-6 py-5">
        <Link href="/" className="inline-block rounded-md">
          <Logo />
        </Link>
      </header>
      <main id="main" className="flex justify-center px-6 pb-16">
        <div className="w-full max-w-sm pt-6 sm:pt-14">{children}</div>
      </main>
    </div>
  );
}
