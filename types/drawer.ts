import type { ReportWithUpdates, ReportPriority, ReportStatus, StatusUpdate } from "./report";

export type DrawerOptimisticUpdate = (
  reportId: string,
  status: ReportStatus,
  priority: ReportPriority,
  update: StatusUpdate | null,
) => void;

export type DrawerRollback = (report: ReportWithUpdates) => void;

export type ToastKind = "success" | "error" | "info";
export type DrawerToast = (message: string, kind?: ToastKind) => void;
