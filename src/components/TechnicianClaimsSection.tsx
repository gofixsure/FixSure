import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createNotification, CLAIM_STATUS_LABELS, CLAIM_STATUS_STYLES } from "@/lib/notifications";
import {
  AlertTriangle, CheckCircle, XCircle, Clock, Loader2, Image as ImageIcon, Phone, Wrench
} from "lucide-react";

interface Claim {
  id: string;
  booking_id: string;
  customer_id: string;
  technician_id: string;
  claim_type: string;
  description: string;
  photo_url: string | null;
  status: string;
  created_at: string;
  customer?: { full_name: string; phone: string | null } | null;
}

interface Repair {
  id: string;
  category: string;
  repair_description: string | null;
  damage_photo_url: string | null;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
}

export default function TechnicianClaimsSection({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [repairs, setRepairs] = useState<Record<string, Repair>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchClaims = async () => {
      const { data } = await supabase
        .from("claims" as any)
        .select("*, customer:profiles!claims_customer_id_fkey(full_name, phone)")
        .eq("technician_id", userId)
        .order("created_at", { ascending: false });
      if (data) {
        setClaims(data as any);
        // Fetch related repairs
        const bookingIds = (data as any[]).map((c: any) => c.booking_id).filter(Boolean);
        if (bookingIds.length > 0) {
          const { data: repairData } = await supabase
            .from("repairs")
            .select("*")
            .in("booking_id", bookingIds);
          if (repairData) {
            const repairMap: Record<string, Repair> = {};
            (repairData as any[]).forEach((r: any) => {
              if (r.booking_id) repairMap[r.booking_id] = r;
            });
            setRepairs(repairMap);
          }
        }
      }
      setLoading(false);
    };
    fetchClaims();
  }, [userId]);

  const handleAction = async (claim: Claim, action: "re_repair_approved" | "under_review") => {
    setProcessing(claim.id);
    const newStatus = action;
    const { error } = await supabase
      .from("claims" as any)
      .update({ status: newStatus })
      .eq("id", claim.id);

    if (error) {
      toast({ title: "Failed to update claim", variant: "destructive" });
      setProcessing(null);
      return;
    }

    setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: newStatus } : c));

    if (action === "re_repair_approved") {
      await createNotification(
        claim.customer_id,
        "✅ Claim Approved",
        "Your FixSure claim has been approved. Please visit the technician for a free re-repair.",
        "claim",
        claim.id
      );
      toast({ title: "Re-repair approved", description: "Customer has been notified." });
    } else {
      await createNotification(
        claim.customer_id,
        "🔍 Claim Under Review",
        "The technician has disputed your claim. It's now under FixSure review.",
        "claim",
        claim.id
      );
      toast({ title: "Claim disputed", description: "Sent to FixSure for review." });
    }
    setProcessing(null);
  };

  const handleMarkReRepairCompleted = async (claim: Claim) => {
    setProcessing(claim.id);
    const { error } = await supabase
      .from("claims" as any)
      .update({ status: "re_repair_completed" })
      .eq("id", claim.id);

    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
      setProcessing(null);
      return;
    }

    setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "re_repair_completed" } : c));
    await createNotification(
      claim.customer_id,
      "🔧 Re-Repair Completed",
      "Your technician has completed the re-repair. Please confirm whether the issue has been resolved.",
      "claim",
      claim.id
    );
    toast({ title: "Re-repair marked as completed! Customer will be asked to confirm." });
    setProcessing(null);
  };

  const pendingClaims = claims.filter((c) => c.status === "pending_technician" || c.status === "pending");
  const reRepairClaims = claims.filter((c) => c.status === "re_repair_approved");
  const handledClaims = claims.filter((c) => !["pending_technician", "pending", "re_repair_approved"].includes(c.status));

  if (loading) return <div className="text-center py-4"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  if (claims.length === 0) return null;

  const renderClaimDetails = (c: Claim) => {
    const repair = repairs[c.booking_id];
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{(c as any).customer?.full_name || "Customer"}</p>
            <p className="text-xs text-muted-foreground capitalize font-medium">
              Requested: {c.claim_type === "refund" ? "50% Refund" : "Re-Repair"}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${CLAIM_STATUS_STYLES[c.status] || "bg-muted text-muted-foreground"}`}>
            {CLAIM_STATUS_LABELS[c.status] || c.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{c.description}</p>

        {/* Repair details */}
        {repair && (
          <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original Repair</p>
            <p className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {repair.category} — ₹{Number(repair.total_amount).toLocaleString()}</p>
            {repair.repair_description && <p className="text-muted-foreground text-xs">{repair.repair_description}</p>}
            {repair.damage_photo_url && (
              <a href={repair.damage_photo_url} target="_blank" rel="noopener noreferrer">
                <img src={repair.damage_photo_url} alt="Original repair" className="rounded-lg border max-h-32 w-full object-cover mt-1" />
              </a>
            )}
          </div>
        )}

        {/* Claim evidence photo */}
        {c.photo_url && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Claim Evidence:</p>
            <a href={c.photo_url} target="_blank" rel="noopener noreferrer">
              <img src={c.photo_url} alt="Claim evidence" className="rounded-lg border max-h-48 w-full object-cover" />
            </a>
          </div>
        )}

        {(c as any).customer?.phone && (
          <a href={`tel:${(c as any).customer.phone}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Phone className="h-4 w-4" /> Call Customer: {(c as any).customer.phone}
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-destructive flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> Customer Claims ({pendingClaims.length} pending)
      </h2>

      {/* Pending claims - need action */}
      {pendingClaims.map((c) => (
        <div key={c.id} className="rounded-xl border border-destructive/30 bg-card p-5 shadow-card space-y-3 animate-fade-in">
          {renderClaimDetails(c)}
          <p className="text-xs text-warning font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" /> Respond within 48 hours
          </p>
          <div className="flex gap-2">
            <Button
               
              className="flex-1"
              disabled={processing === c.id}
              onClick={() => handleAction(c, "re_repair_approved")}
            >
              {processing === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="mr-1 h-4 w-4" /> Approve Re-Repair</>}
            </Button>
            <Button
               
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={processing === c.id}
              onClick={() => handleAction(c, "under_review")}
            >
              <XCircle className="mr-1 h-4 w-4" /> Dispute
            </Button>
          </div>
        </div>
      ))}

      {/* Re-repair approved - need to mark completed */}
      {reRepairClaims.map((c) => (
        <div key={c.id} className="rounded-xl border border-primary/30 bg-card p-5 shadow-card space-y-3 animate-fade-in">
          {renderClaimDetails(c)}
          <Button
             
            className="w-full gradient-primary text-primary-foreground"
            disabled={processing === c.id}
            onClick={() => handleMarkReRepairCompleted(c)}
          >
            {processing === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="mr-1 h-4 w-4" /> Mark Re-Repair Completed</>}
          </Button>
        </div>
      ))}

      {/* Past claims */}
      {handledClaims.length > 0 && (
        <div className="space-y-2">
          {handledClaims.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4 shadow-card flex items-center justify-between opacity-70">
              <div className="space-y-1">
                <p className="font-medium text-sm">{(c as any).customer?.full_name || "Customer"}</p>
                <p className="text-xs text-muted-foreground capitalize">{c.claim_type === "refund" ? "50% Refund" : "Re-Repair"}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${CLAIM_STATUS_STYLES[c.status] || "bg-muted text-muted-foreground"}`}>
                {CLAIM_STATUS_LABELS[c.status] || c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
