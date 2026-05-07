import type { ReportPriority, ReportStatus } from "./report";

export type PublicStatusUpdate = {
  id: string;
  status: ReportStatus;
  remarks: string | null;
  created_at: string;
};

export type PublicTrackingData = {
  report_id: string;
  incident_type: string;
  priority: ReportPriority;
  status: ReportStatus;
  address: string | null;
  created_at: string;
  updated_at: string;
  status_updates: PublicStatusUpdate[];
};
