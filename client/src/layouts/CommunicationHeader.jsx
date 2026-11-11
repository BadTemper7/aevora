import Logo from "../components/common/Logo";
import ThemeToggle from "../components/common/ThemeToggle";

/** The AEVORA logo is the Home link. Keep messenger and community headers identical. */
export default function CommunicationHeader({ title }) {
  return (
    <header className="z-30 shrink-0 border-b border-line bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1800px] min-w-0 items-center justify-between gap-2 px-3 sm:h-16 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Logo size="sm" className="shrink-0" />
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line" />
          <strong className="min-w-0 truncate text-sm font-bold text-ink sm:text-base">{title}</strong>
        </div>
        <ThemeToggle className="shrink-0" />
      </div>
    </header>
  );
}
