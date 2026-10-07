import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  BrandPanel,
  MobileBrandHeader,
  TabletBackdrop,
  TabletTestimonial,
} from "./_components/brand-panel";

/**
 * Responsive auth shell:
 * - phones (< md): photo + gradient header, form in a rounded sheet below it
 * - tablets (md → lg): centred card floating on a softly blurred photo
 * - desktops (lg+): split layout — form left, immersive photo panel right
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen bg-white md:flex md:flex-col md:items-center md:justify-center md:bg-transparent md:px-8 md:py-12 lg:mx-auto lg:grid lg:max-w-[1920px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-stretch lg:bg-white lg:p-0 2xl:grid-cols-2">
      <TabletBackdrop />
      <MobileBrandHeader />

      {/* Form column (phone sheet / tablet card / desktop column) */}
      <div className="relative -mt-4 flex min-h-[calc(100svh-8rem)] flex-col overflow-hidden rounded-t-3xl bg-white md:mt-0 md:min-h-0 md:w-full md:max-w-[34rem] md:rounded-[2rem] md:shadow-[0_30px_80px_-20px_rgba(30,6,60,0.55)] lg:max-w-none lg:min-h-screen lg:rounded-none lg:shadow-none">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_22rem_at_0%_0%,rgba(131,58,180,0.07),transparent_60%),radial-gradient(30rem_18rem_at_100%_100%,rgba(225,48,108,0.05),transparent_60%)]"
        />

        <header className="relative flex items-center justify-between gap-4 px-4 pt-5 sm:px-8 md:pt-7 lg:px-12 lg:pt-8">
          <span className="hidden md:inline-flex">
            <Logo href="/" />
          </span>
          <Link
            href="/"
            className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:ml-0"
          >
            <ArrowLeft size={15} aria-hidden />
            Back to website
          </Link>
        </header>

        {/* Inputs render at 16px below lg so iOS Safari doesn't zoom on focus. */}
        <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-8 md:py-10 lg:px-12 max-lg:[&_input]:text-base">
          <div className="w-full max-w-[420px] 2xl:max-w-[440px]">{children}</div>
        </main>

        <footer className="relative flex flex-col items-center justify-between gap-1.5 px-4 pb-6 text-center text-xs text-muted-foreground sm:flex-row sm:px-8 sm:text-left lg:px-12">
          <span>© {new Date().getFullYear()} WA Automation</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock size={12} aria-hidden />
            Encrypted sign-in · Built on the WhatsApp Cloud API
          </span>
        </footer>
      </div>

      <TabletTestimonial />

      {/* Immersive brand panel (desktop) */}
      <aside className="sticky top-0 hidden h-screen p-3 lg:block xl:p-4" aria-label="About WA Automation">
        <BrandPanel />
      </aside>
    </div>
  );
}
