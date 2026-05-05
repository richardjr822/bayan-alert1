"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import type { ReportPriority, ReportStatus, UpdateReportPayload } from "@/types/report";

export type SubmitReportInput = {
  incidentType: string;
  description: string;
  contactNumber: string;
  latitude: number;
  longitude: number;
  address?: string;
};

export type SubmitReportResult =
  | {
      success: true;
    }
  | {
      error: string;
    };

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

  const { error } = await supabaseServer.from("reports").insert({
    user_id: session?.id ?? null,
    reporter_name: session?.fullName ?? "Resident",
    contact_number: contactNumber,
    incident_type: incidentType,
    description,
    latitude: input.latitude,
    longitude: input.longitude,
    address,
    status: "pending",
    priority: "low",
  });

  if (error) {
    return { error: "Unable to submit report." };
  }

  return { success: true };
}

export async function updateReportStatus(input: UpdateReportPayload): Promise<SubmitReportResult> {
  const reportId = cleanValue(input.reportId);
  const status = cleanValue(input.status);
  const priority = cleanValue(input.priority);
  const remarks = cleanValue(input.remarks);

  if (!reportId || !status || !priority || !remarks) {
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
    })
    .eq("id", reportId);

  if (updateError) {
    return { error: "Unable to update report." };
  }

  const { error: insertError } = await supabaseServer.from("status_updates").insert({
    report_id: reportId,
    status,
    remarks,
    updated_by: session.fullName,
  });

  if (insertError) {
    return { error: "Report updated, but status timeline could not be saved." };
  }

  return { success: true };
}
