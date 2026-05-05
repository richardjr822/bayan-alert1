export type ReportStatus = "Active" | "Resolved";

export type Report = {
  reportId: string;
  incidentType: string;
  location: string;
  description: string;
  contact: string;
  status: ReportStatus;
  createdAt: string;
};
