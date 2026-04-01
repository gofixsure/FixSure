import { supabase } from "@/integrations/supabase/client";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string = "info",
  relatedId?: string
) {
  await supabase.from("notifications" as any).insert({
    user_id: userId,
    title,
    message,
    type,
    related_id: relatedId || null,
  });
}

export const CLAIM_STATUS_LABELS: Record<string, string> = {
  pending_technician: "Pending Technician Response",
  re_repair_approved: "Re-Repair Approved",
  under_review: "Under FixSure Review",
  re_repair_completed: "Re-Repair Completed",
  claim_rejected: "Claim Rejected",
  claim_resolved: "Claim Resolved",
  approved: "Approved",
  rejected: "Rejected",
  pending: "Pending",
};

export const CLAIM_STATUS_STYLES: Record<string, string> = {
  pending_technician: "bg-warning/10 text-warning",
  re_repair_approved: "bg-accent text-accent-foreground",
  under_review: "bg-primary/10 text-primary",
  re_repair_completed: "bg-accent text-accent-foreground",
  claim_rejected: "bg-destructive/10 text-destructive",
  claim_resolved: "bg-accent text-accent-foreground",
  approved: "bg-accent text-accent-foreground",
  rejected: "bg-destructive/10 text-destructive",
  pending: "bg-warning/10 text-warning",
};
