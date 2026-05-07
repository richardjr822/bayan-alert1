"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { sendStatusPush } from "@/lib/push/send";
import type { Report, ReportPriority, ReportStatus, ReportWithUpdates, StatusUpdate, UpdateReportPayload } from "@/types/report";
import { ReportPriority as ReportPriorityEnum, ReportStatus as ReportStatusEnum, RESPONDER_TEAMS } from "@/types/report";

export type SubmitReportInput = {
  incidentType: string;
  description: string;
  contactNumber: string;
  latitude: number;
  longitude: number;
  address?: string;
  severity?: string;
  photoUrl?: string;
};

export type SubmitReportResult =
  | { success: true; reportId: string }
  | { error: string };

export type SimpleActionResult = { success: true } | { error: string };

const validStatuses: ReportStatus[] = [
  ReportStatusEnum.Pending,
  ReportStatusEnum.Verified,
  ReportStatusEnum.InProgress,
  ReportStatusEnum.Resolved,
  ReportStatusEnum.Rejected,
];
const validPriorities: ReportPriority[] = [
  ReportPriorityEnum.Low,
  ReportPriorityEnum.Medium,
  ReportPriorityEnum.High,
  ReportPriorityEnum.Critical,
];

function cleanValue(value: string) {
  return value.trim();
}

function isValidCoordinate(value: number) {
  return Number.isFinite(value);
}

function isReportStatus(value: string): value is ReportStatus {
  return validStatuses.includes(value as ReportStatus);
}

function isReportPriority(value: string): value is ReportPriority {
  return validPriorities.includes(value as ReportPriority);
}

export async function submitReport(input: SubmitReportInput): Promise<SubmitReportResult> {
  const incidentType = cleanValue(input.incidentType);
  const description = cleanValue(input.description);
  const contactNumber = cleanValue(input.contactNumber);
  const address = input.address ? cleanValue(input.address) : null;

  if (!incidentType || !description || !contactNumber) {
    return { error: "Please complete all required fields." };
  }

  if (!isValidCoordinate(input.latitude) || !isValidCoordinate(input.longitude)) {
    return { error: "Location is required before submitting a report." };
  }

  const session = await getSession();

  const priority = [
    ReportPriorityEnum.Low,
    ReportPriorityEnum.Medium,
    ReportPriorityEnum.High,
    ReportPriorityEnum.Critical,
  ].includes((input.severity ?? "") as ReportPriority)
    ? (input.severity as ReportPriority)
    : ReportPriorityEnum.Low;

  const { data: inserted, error } = await supabaseServer
    .from("reports")
    .insert({
      user_id: session?.id ?? null,
      reporter_name: session?.fullName ?? "Resident",
      contact_number: contactNumber,
      incident_type: incidentType,
      description,
      latitude: input.latitude,
      longitude: input.longitude,
      address,
      status: ReportStatusEnum.Pending,
      priority,
      photo_url: input.photoUrl ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: "Unable to submit report." };
  }

  return { success: true, reportId: inserted.id };
}

export async function updateReportStatus(input: UpdateReportPayload): Promise<SimpleActionResult> {
  const reportId = cleanValue(input.reportId);
  const status = cleanValue(input.status);
  const priority = cleanValue(input.priority);
  const assignedTo = input.assignedTo ? cleanValue(input.assignedTo) : null;
  const remarks = cleanValue(input.remarks ?? "");

  if (!reportId || !status || !priority) {
    return { error: "Please complete all update fields." };
  }

  if (!isReportStatus(status) || !isReportPriority(priority)) {
    return { error: "Invalid status or priority value." };
  }

  const session = await getSession();

  if (!session || session.role !== "admin") {
    return { error: "You are not allowed to update reports." };
  }

  const updatedAt = new Date().toISOString();

  const { error: updateError } = await supabaseServer
    .from("reports")
    .update({
      status: status as ReportStatus,
      priority: priority as ReportPriority,
      updated_at: updatedAt,
      ...(assignedTo !== null ? { assigned_to: assignedTo } : {}),
    })
    .eq("id", reportId);

  if (updateError) {
    return { error: "Unable to update report." };
  }

  const { error: insertError } = await supabaseServer.from("status_updates").insert({
    report_id: reportId,
    status: status as ReportStatus,
    remarks: remarks || null,
    updated_by: session.fullName,
    ...(assignedTo !== null ? { assigned_to: assignedTo } : {}),
  });

  if (insertError) {
    return { error: "Report updated, but status timeline could not be saved." };
  }

  const { data: reportData }: { data: { user_id: string; incident_type: string } | null } = await supabaseServer
    .from("reports")
    .select("user_id, incident_type")
    .eq("id", reportId)
    .maybeSingle();

  if (reportData?.user_id) {
    await sendStatusPush(reportData.user_id, reportData.incident_type, status);
  }

  return { success: true };
}

export async function cancelReport(reportId: string, reason: string): Promise<SimpleActionResult> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const { data: report } = await supabaseServer
    .from("reports")
    .select("id, user_id, status")
    .eq("id", reportId)
    .eq("user_id", session.id)
    .maybeSingle();

  if (!report) return { error: "Report not found." };
  if (report.status !== ReportStatusEnum.Pending) return { error: "Only pending reports can be cancelled." };

  const updatedAt = new Date().toISOString();

  const { error: updateError } = await supabaseServer
    .from("reports")
    .update({ status: ReportStatusEnum.Rejected, updated_at: updatedAt })
    .eq("id", reportId);

  if (updateError) return { error: "Unable to cancel report." };

  const { error: insertError } = await supabaseServer.from("status_updates").insert({
    report_id: reportId,
    status: ReportStatusEnum.Rejected,
    remarks: `Cancelled by resident: ${reason}`,
    updated_by: session.fullName,
  });

  if (insertError) return { error: "Report cancelled, but timeline could not be saved." };

  return { success: true } as const;
}

export async function exportHistoryCSV(statusFilter: string, dateFilter: string, startDate?: string, endDate?: string): Promise<string | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { error: "Not authenticated." };

  let query = supabaseServer
    .from("reports")
    .select("id, incident_type, reporter_name, address, latitude, longitude, created_at, updated_at, status")
    .in("status", [ReportStatusEnum.Resolved, ReportStatusEnum.Rejected])
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (dateFilter && dateFilter !== "all") {
    const now = new Date();
    if (dateFilter === "today") {
      now.setHours(0, 0, 0, 0);
      query = query.gte("created_at", now.toISOString());
    } else if (dateFilter === "week") {
      now.setDate(now.getDate() - 7);
      query = query.gte("created_at", now.toISOString());
    } else if (dateFilter === "month") {
      now.setMonth(now.getMonth() - 1);
      query = query.gte("created_at", now.toISOString());
    } else if (dateFilter === "custom" && startDate && endDate) {
      query = query.gte("created_at", new Date(startDate).toISOString());
      query = query.lte("created_at", new Date(endDate).toISOString());
    }
  }

  const { data: reports, error } = await query;
  if (error || !reports) return { error: "Failed to fetch reports for export." };

  const header = ["Report ID", "Type", "Reporter", "Location", "Submitted", "Resolved/Rejected", "Duration (mins)", "Final Status"];
  const rows = reports.map((r) => {
    const created = new Date(r.created_at);
    const updated = new Date(r.updated_at);
    const durationMins = Math.round((updated.getTime() - created.getTime()) / 60000);
    const location = `"${r.address ? r.address.replace(/"/g, '""') : `${r.latitude}, ${r.longitude}`}"`;
    return [
      r.id,
      r.incident_type,
      `"${r.reporter_name.replace(/"/g, '""')}"`,
      location,
      created.toISOString(),
      updated.toISOString(),
      durationMins.toString(),
      r.status,
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

export type ReportsWithUpdatesResult =
  | { data: ReportWithUpdates[]; error?: undefined }
  | { data?: undefined; error: string };

export async function getReportsWithUpdates(): Promise<ReportsWithUpdatesResult> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const reportQuery = supabaseServer
    .from("reports")
    .select("id, user_id, reporter_name, contact_number, incident_type, description, latitude, longitude, address, status, priority, photo_url, created_at, updated_at")
    .order("created_at", { ascending: false });

  const { data: reportsData, error: reportsError } =
    session.role === "admin"
      ? await reportQuery.returns<Report[]>()
      : await reportQuery.eq("user_id", session.id).returns<Report[]>();

  if (reportsError) return { error: "Unable to load reports." };

  const reports = reportsData ?? [];
  const reportIds = reports.map((report) => report.id);

  const { data: statusUpdatesData, error: updatesError } = reportIds.length
    ? await supabaseServer
        .from("status_updates")
        .select("id, report_id, status, remarks, updated_by, created_at")
        .in("report_id", reportIds)
        .order("created_at", { ascending: true })
        .returns<StatusUpdate[]>()
    : { data: [], error: null };

  if (updatesError) return { error: "Unable to load report updates." };

  const updatesByReportId = new Map<string, StatusUpdate[]>();

  for (const update of statusUpdatesData ?? []) {
    const currentUpdates = updatesByReportId.get(update.report_id) ?? [];
    currentUpdates.push(update);
    updatesByReportId.set(update.report_id, currentUpdates);
  }

  const reportsWithUpdates: ReportWithUpdates[] = reports.map((report) => ({
    ...report,
    status_updates: updatesByReportId.get(report.id) ?? [],
  }));

  return { data: reportsWithUpdates };
}

export async function getActiveReportsWithUpdates(): Promise<ReportsWithUpdatesResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { error: "Not authenticated." };

  const { data: reportsData, error: reportsError } = await supabaseServer
    .from("reports")
    .select("id, user_id, reporter_name, contact_number, incident_type, description, latitude, longitude, address, status, priority, photo_url, created_at, updated_at")
    .in("status", [ReportStatusEnum.Pending, ReportStatusEnum.Verified, ReportStatusEnum.InProgress])
    .order("created_at", { ascending: false })
    .returns<Report[]>();

  if (reportsError) return { error: "Unable to load reports." };

  const reports = reportsData ?? [];
  const reportIds = reports.map((report) => report.id);

  const { data: statusUpdatesData, error: updatesError } = reportIds.length
    ? await supabaseServer
        .from("status_updates")
        .select("id, report_id, status, remarks, updated_by, created_at")
        .in("report_id", reportIds)
        .order("created_at", { ascending: true })
        .returns<StatusUpdate[]>()
    : { data: [], error: null };

  if (updatesError) return { error: "Unable to load report updates." };

  const updatesByReportId = new Map<string, StatusUpdate[]>();

  for (const update of statusUpdatesData ?? []) {
    const currentUpdates = updatesByReportId.get(update.report_id) ?? [];
    currentUpdates.push(update);
    updatesByReportId.set(update.report_id, currentUpdates);
  }

  const reportsWithUpdates: ReportWithUpdates[] = reports.map((report) => ({
    ...report,
    status_updates: updatesByReportId.get(report.id) ?? [],
  }));

  return { data: reportsWithUpdates };
}

export type ReportStatsResult =
  | { data: { total: number; active: number; resolved: number }; error?: undefined }
  | { data?: undefined; error: string };

export async function getReportStats(): Promise<ReportStatsResult> {
  const [{ count: total }, { count: active }, { count: resolved }] = await Promise.all([
    supabaseServer.from("reports").select("*", { count: "exact", head: true }),
    supabaseServer
      .from("reports")
      .select("*", { count: "exact", head: true })
      .in("status", [ReportStatusEnum.Pending, ReportStatusEnum.Verified, ReportStatusEnum.InProgress]),
    supabaseServer
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", ReportStatusEnum.Resolved),
  ]);

  return { data: { total: total ?? 0, active: active ?? 0, resolved: resolved ?? 0 } };
}

export type NearbyReportResult =
  | { data: { id: string; created_at: string } | null; error?: undefined }
  | { data?: undefined; error: string };

export async function findNearbyReport(incidentType: string, latitude: number, longitude: number): Promise<NearbyReportResult> {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await supabaseServer
    .from("reports")
    .select("id, created_at")
    .eq("incident_type", incidentType)
    .gte("created_at", thirtyMinsAgo)
    .in("status", [ReportStatusEnum.Pending, ReportStatusEnum.Verified, ReportStatusEnum.InProgress])
    .gte("latitude", latitude - 0.0005)
    .lte("latitude", latitude + 0.0005)
    .gte("longitude", longitude - 0.0005)
    .lte("longitude", longitude + 0.0005)
    .limit(1);

  if (error) return { error: "Unable to check nearby reports." };

  return { data: (data as { id: string; created_at: string }[] | null)?.[0] ?? null };
}

export type DefaultContactResult =
  | { data: string; error?: undefined }
  | { data?: undefined; error: string };

export type GetResponderTeamsResult =
  | { data: string[]; error?: undefined }
  | { data?: undefined; error: string };

export async function getResponderTeams(): Promise<GetResponderTeamsResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { error: "Not authenticated." };
  return { data: [...RESPONDER_TEAMS] };
}

export async function getDefaultContact(): Promise<DefaultContactResult> {
  const session = await getSession();
  if (!session) return { data: "" };

  const { data, error } = await supabaseServer
    .from("users")
    .select("contact_number")
    .eq("id", session.id)
    .maybeSingle();

  if (error) return { error: "Unable to load contact number." };
  return { data: data?.contact_number ?? "" };
}
