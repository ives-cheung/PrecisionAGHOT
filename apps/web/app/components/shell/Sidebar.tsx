import { SITE } from "@aihot/industry/site";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Wordmark } from "../Logo";
import { useChangelogSeen } from "../../lib/local-state";
import { SIDEBAR, tabIsActive, type NavItem } from "./nav";
import { ThemeSwitch } from "./ThemeSwitch";

/** True while the changelog has an entry newer than the one this reader last opened. */
export function useChangelogDot(latestVersion: string | null): boolean {
  const seen = useChangelogSeen();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !latestVersion) return false;
  return !seen || seen < latestVersion;
}

function SideLink({ item, dot }: { item: NavItem; dot: boolean }) {
  const { pathname } = useLocation();
  // Weekly and monthly reports belong to the daily report entry, as the phone tab bar has it.
  const isActive = tabIsActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      prefetch="intent"
      aria-current={isActive ? "page" : undefined}
      className={`flex h-11 items-center gap-3 rounded-control px-3 text-[14px] transition-colors duration-150 ${
        isActive ? "bg-bg-muted font-semibold text-ink" : "text-ink-3 hover:bg-bg-muted hover:text-ink"
      }`}
    >
      <span className={`flex w-[22px] shrink-0 justify-center ${isActive ? "text-accent" : ""}`}>
        <Icon size={17} />
      </span>
      <span className="min-w-0 truncate">{item.label}</span>
      {dot && item.changelog && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-hot" aria-label="有新的更新" />}
    </Link>
  );
}

export function Sidebar({ changelogVersion }: { changelogVersion: string | null }) {
  const dot = useChangelogDot(changelogVersion);
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line-soft bg-sidebar px-4 pb-5 pt-8 lg:flex lg:w-[220px] xl:w-[240px]">
      <Link to="/" className="flex h-9 items-center px-2 text-ink" aria-label={`${SITE.name} 首页`}>
        <Wordmark size={20} />
      </Link>
      <p className="mb-5 mt-2 px-2 text-[12px] leading-relaxed text-ink-3">全球精准农业情报</p>
      <nav className="-mx-1 flex-1 overflow-y-auto px-1" aria-label="主导航">
        {SIDEBAR.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-2 pt-6 text-[11px] text-ink-4">{section.title}</div>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <SideLink key={item.to} item={item} dot={dot} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-4 space-y-3 border-t border-line px-1 pt-4">
        <ThemeSwitch className="mx-1" />
        {SITE.footerNote && <Link to="/about" className="block px-2 text-[11px] leading-relaxed text-ink-4 transition-colors hover:text-ink">{SITE.footerNote}</Link>}
        {SITE.icp && (
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="block px-2 text-[10px] text-ink-4 hover:text-ink-3">
            {SITE.icp}
          </a>
        )}
      </div>
    </aside>
  );
}
