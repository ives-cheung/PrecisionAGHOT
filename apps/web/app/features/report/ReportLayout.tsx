import type { ReactNode } from "react";
import type { ReportNavigationEntry, ReportKind } from "@aihot/contracts/site";
import { ReportArchive, ReportPhoneNav } from "./ReportNav";
import { ReportHistory } from "./ReportHistory";

/**
 * Reports keep the main reading column beside a compact archive on wide screens. Smaller screens
 * get the edition tabs and recent issues above the paper.
 */
export function ReportLayout({ kind, index, current, today, children }: { kind: ReportKind; index: ReportNavigationEntry[]; current: string | null; today: string; children: ReactNode }) {
  return (
    <div className="report-shell pb-6 xl:grid xl:grid-cols-[minmax(0,1fr)_200px] xl:items-start xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_220px] 2xl:gap-10">
      <ReportArchive kind={kind} index={index} current={current} />
      <div className="min-w-0 xl:order-first">
        <ReportPhoneNav kind={kind} index={index} current={current} today={today} />
        <div className="w-full">
          {children}
          <ReportHistory kind={kind} index={index} current={current} />
        </div>
      </div>
    </div>
  );
}
