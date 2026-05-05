export type ReportStatus = "pending" | "verified" | "in_progress" | "resolved" | "rejected";

export type ReportPriority = "low" | "medium" | "high" | "critical";

export type Report = {
  id: string;
  user_id: string | null;
  reporter_name: string;
  contact_number: string;
  incident_type: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  created_at: string;
  updated_at: string;
};

export type StatusUpdate = {
  id: string;
  report_id: string;
  status: ReportStatus;
  remarks: string | null;
  updated_by: string;
  created_at: string;
};

export type ReportWithUpdates = Report & {
  status_updates: StatusUpdate[];
};

export type ReportRow = Report;

export type UpdateReportPayload = {
  reportId: string;
  status: string;
  priority: string;
  remarks: string;
};
