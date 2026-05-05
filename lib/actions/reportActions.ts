"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { sendStatusPush } from "@/lib/push/send";
import type { ReportPriority, ReportStatus, UpdateReportPayload } from "@/types/report";

export type SubmitReportInput = {
  incidentType: string;
  description: string;
  contactNumber: string;
  latitude: number;
  longitude: number;
  address?: string;
  severity?: string;
};

export type SubmitReportResult =
  | { success: true; reportId: string }
  | { error: string };

export type SimpleActionResult = { success: true } | { error: string };

const validStatuses: ReportStatus[] = ["pending", "verified", "in_progress", "resolved", "rejected"];
const validPriorities: ReportPriority[] = ["low", "medium", "high", "critical"];

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

  const priority = ["low", "medium", "high", "critical"].includes(input.severity ?? "")
    ? (input.severity as ReportPriority)
    : "low";

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
      status: "pending",
      priority,
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
      status,
      priority,
      updated_at: updatedAt,
      ...(assignedTo !== null ? { assigned_to: assignedTo } : {}),
    })
    .eq("id", reportId);

  if (updateError) {
    return { error: "Unable to update report." };
  }

  const { error: insertError } = await supabaseServer.from("status_updates").insert({
    report_id: reportId,
    status,
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
  if (report.status !== "pending") return { error: "Only pending reports can be cancelled." };

  const updatedAt = new Date().toISOString();

  const { error: updateError } = await supabaseServer
    .from("reports")
    .update({ status: "rejected", updated_at: updatedAt })
    .eq("id", reportId);

  if (updateError) return { error: "Unable to cancel report." };

  const { error: insertError } = await supabaseServer.from("status_updates").insert({
    report_id: reportId,
    status: "rejected",
    remarks: `Cancelled by resident: ${reason}`,
    updated_by: session.fullName,
  });

  if (insertError) return { error: "Report cancelled, but timeline could not be saved." };

  return { success: true } as const;
}
