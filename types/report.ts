export const enum ReportStatus {
  Pending = "pending",
  Verified = "verified",
  InProgress = "in_progress",
  Resolved = "resolved",
  Rejected = "rejected",
}

export const enum ReportPriority {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

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
  report_number: string | null;
  photo_url: string | null;
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
  status: ReportStatus;
  priority: ReportPriority;
  remarks?: string;
  assignedTo?: string;
};

export const RESPONDER_TEAMS = [
  "Tanod Team A",
  "Tanod Team B",
  "BFP Sta. Rita",
  "PNP Station",
  "MDRRMO",
] as const;

export type ResponderTeam = (typeof RESPONDER_TEAMS)[number];
