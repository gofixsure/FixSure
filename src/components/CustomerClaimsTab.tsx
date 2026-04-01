import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { createNotification, CLAIM_STATUS_LABELS, CLAIM_STATUS_STYLES } from "@/lib/notifications";
import {
  AlertTriangle, Upload, CheckCircle, Clock, XCircle, ArrowLeft, Loader2, ThumbsUp
} from "lucide-react";

interface Booking {
  id: string;
  description: string;
  status: string;
  created_at: string;
  technician_id: string;
  technician: { full_name: string; phone: string | null } | null;
}

interface Claim {
  id: string;
  booking_id: string;
  claim_type: string;
  description: string;
  status: string;
  created_at: string;
}

interface Props {
  bookings: Booking[];
  userId: string;
}

export default function CustomerClaimsTab({ bookings, userId }: Props) {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [claimType, setClaimType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    const fetchClaims = async () => {
      const { data } = await supabase
        .from("claims" as any)
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      if (data) setClaims(data as any);
      setLoadingClaims(false);
    };
    fetchClaims();
  }, [userId]);

  const confirmedBookings = bookings.filter((b) => b.status === "accepted");
  const claimedBookingIds = new Set(claims.map((c) => c.booking_id));

  const handleConfirmReRepair = async (claim: Claim) => {
    setConfirming(claim.id);
    const { error } = await supabase
      .from("claims")
      .update({ status: "claim_resolved" })
      .eq("id", claim.id);
    if (error) {
      toast({ title: "Failed to confirm", description: error.message, variant: "destructive" });
      setConfirming(null);
      return;
    }
    setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: "claim_resolved" } : c));
    const booking = bookings.find((b) => b.id === claim.booking_id);
    if (booking) {
      await createNotification(
        booking.technician_id,
        "✅ Re-Repair Confirmed",
        "The customer has confirmed the re-repair is resolved. Your FixSure protection payout has been updated.",
        "claim",
        claim.id
      );
    }
    toast({ title: "Re-repair confirmed!", description: "Thank you for confirming. The issue is now resolved." });
    setConfirming(null);
  };

  const handleSubmit = async () => {
    if (!selectedBooking || !claimType || !description) return;
    if (!photoFile) {
      toast({ title: "Please upload evidence", description: "A photo or video of the issue is required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    let photoUrl: string | null = null;
    const extension = photoFile.name.split(".").pop() || "jpg";
    const fileName = `${userId}/claim_${Date.now()}.${extension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("technician-uploads")
      .upload(fileName, photoFile, { contentType: photoFile.type, upsert: false });

    if (uploadError || !uploadData) {
      toast({ title: "Image upload failed", description: uploadError?.message || "Please try again.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("technician-uploads")
      .getPublicUrl(uploadData.path);
    photoUrl = urlData.publicUrl;

    const { error } = await supabase.from("claims" as any).insert({
      booking_id: selectedBooking.id,
      customer_id: userId,
      technician_id: selectedBooking.technician_id,
      claim_type: claimType,
      description,
      photo_url: photoUrl,
      status: "pending_technician",
    });

    if (error) {
      toast({ title: "Failed to submit claim", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Notify technician
    await createNotification(
      selectedBooking.technician_id,
      "⚠️ New Claim Filed",
      `A customer has filed a ${claimType === "refund" ? "50% refund" : "re-repair"} claim. Please review within 48 hours.`,
      "claim",
      selectedBooking.id
    );

    setClaims((prev) => [{
      id: crypto.randomUUID(),
      booking_id: selectedBooking.id,
      claim_type: claimType,
      description,
      status: "pending_technician",
      created_at: new Date().toISOString(),
    }, ...prev]);

    toast({ title: "Claim submitted!", description: "The technician will review your claim within 48 hours." });
    setSelectedBooking(null);
    setClaimType("");
    setDescription("");
    setPhotoFile(null);
    setSubmitting(false);
  };

  // Claim form view
  if (selectedBooking) {
    return (
      <div className="space-y-5 animate-fade-in">
        <button onClick={() => setSelectedBooking(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </button>
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-5">
          <h3 className="font-semibold">File Claim for: {selectedBooking.technician?.full_name}</h3>
          <p className="text-xs text-muted-foreground">{selectedBooking.description}</p>

          <div className="space-y-3">
            <Label>What would you like?</Label>
            <RadioGroup value={claimType} onValueChange={setClaimType}>
              <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="refund" id="refund" />
                <Label htmlFor="refund" className="cursor-pointer flex-1">
                  <span className="font-medium">50% Refund</span>
                  <p className="text-xs text-muted-foreground">Get 50% of the repair amount refunded</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="re-repair" id="re-repair" />
                <Label htmlFor="re-repair" className="cursor-pointer flex-1">
                  <span className="font-medium">Re-Repair</span>
                  <p className="text-xs text-muted-foreground">Get the repair done again at no extra cost</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Describe the issue</Label>
            <Textarea
              required
              placeholder="What went wrong with the repair..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Upload Photo/Video of Issue <span className="text-destructive">*</span></Label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {photoFile ? photoFile.name : "Tap to upload evidence (required)"}
              </span>
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>The technician must respond within 48 hours. If disputed, FixSure will review your claim.</span>
          </div>

          <Button
            className="w-full gradient-primary text-primary-foreground"
            disabled={!claimType || !description || !photoFile || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Claim"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing claims */}
      {claims.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Your Claims</h3>
          {claims.map((c) => {
            const booking = bookings.find((b) => b.id === c.booking_id);
            return (
              <div key={c.id} className="rounded-xl border bg-card p-4 shadow-card space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{booking?.technician?.full_name || "Technician"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.claim_type === "refund" ? "50% Refund" : "Re-Repair"}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${CLAIM_STATUS_STYLES[c.status] || "bg-muted text-muted-foreground"}`}>
                    {CLAIM_STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.description}</p>
                {c.status === "re_repair_approved" && (
                  <p className="text-xs text-primary font-medium">
                    ✅ Please visit the technician for a free re-repair.
                  </p>
                )}
                {c.status === "re_repair_completed" && c.claim_type === "re-repair" && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-primary font-medium">
                      🔧 The technician has completed the re-repair. Is the issue resolved?
                    </p>
                    <Button
                       
                      className="w-full gradient-primary text-primary-foreground"
                      disabled={confirming === c.id}
                      onClick={() => handleConfirmReRepair(c)}
                    >
                      {confirming === c.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="mr-1 h-4 w-4" />
                      )}
                      Confirm Repair Resolved
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bookings to file claims on */}
      <h3 className="text-sm font-semibold">Select a Booking to File a Claim</h3>
      {confirmedBookings.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 shadow-card text-center space-y-3">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No completed repairs to claim against.</p>
        </div>
      ) : (
        confirmedBookings.map((b) => {
          const alreadyClaimed = claimedBookingIds.has(b.id);
          return (
            <div key={b.id} className="rounded-xl border bg-card p-4 shadow-card flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-sm">{b.technician?.full_name || "Technician"}</p>
                <p className="text-xs text-muted-foreground">{b.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
              </div>
              {alreadyClaimed ? (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">Claimed</span>
              ) : (
                <Button
                   
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setSelectedBooking(b)}
                >
                  <AlertTriangle className="mr-1 h-3 w-3" /> File Claim
                </Button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
