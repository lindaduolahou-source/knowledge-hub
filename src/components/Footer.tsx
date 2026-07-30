import type { Dictionary } from "@/i18n/dictionaries/zh";

interface FooterProps {
  dict: Dictionary;
}

export function Footer({ dict }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/60 [[data-immersive]_&]:border-white/10 [[data-immersive]_&]:bg-transparent">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-8 sm:flex-row">
        <p
          className="text-xs text-muted [[data-immersive]_&]:text-white/40"
          suppressHydrationWarning
        >
          {dict.footer.copyright.replace("{year}", String(year))}
        </p>
        <p className="text-xs text-muted/60 [[data-immersive]_&]:text-white/25">
          {dict.footer.builtWith}
        </p>
      </div>
    </footer>
  );
}
