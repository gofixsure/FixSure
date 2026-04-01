import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, Star, Wrench, IndianRupee, ShieldCheck, ShieldOff,
  Phone, MapPin, Clock, AlertTriangle, CheckCircle, TrendingUp, Store, Image as ImageIcon
} from "lucide-react";

interface Props {
  technicianId: string;
  onBack: () => void;
}

export default function AdminTechnicianDetail({ technicianId, onBack }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tp, setTp] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [profileRes, tpRes, repairsRes, claimsRes, reviewsRes, bookingsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", technicianId).single(),
        supabase.from("technician_profiles").select("*").eq("id", technicianId).single(),
        supabase.from("repairs").select("*").eq("technician_id", technicianId).order("created_at", { ascending: false }),
        supabase.from("claims").select("*, customer:profiles!claims_customer_id_fkey(full_name)").eq("technician_id", technicianId).order("created_at", { ascending: false }),
        supabase.from("reviews").select("*, customer:profiles!reviews_booking_id_fkey(full_name)").eq("technician_id", technicianId).order("created_at", { ascending: false }),
        supabase.from("bookings").select("*, customer:profiles!bookings_customer_id_fkey(full_name)").eq("technician_id", technicianId).order("created_at", { ascending: false }),
      ]);

      setProfile(profileRes.data);
      setTp(tpRes.data);
      setRepairs(repairsRes.data || []);
      setClaims(claimsRes.data || []);
      setReviews(reviewsRes.data || []);
      setBookings(bookingsRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [technicianId]);

  const toggleVerification = async () => {
    if (!tp) return;
    setVerifying(true);
    const newVal = !tp.verified;
    await supabase.from("technician_profiles").update({ verified: newVal }).eq("id", technicianId);
    setTp({ ...tp, verified: newVal });
    toast({ title: newVal ? "Technician verified ✅" : "Verification removed" });
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-center text-muted-foreground py-10">Technician not found.</p>;
  }

  const totalRevenue = repairs.reduce((s, r) => s + Number(r.total_amount || 0), 0);

  const statCards = [
    { label: "Total Repairs", value: tp?.total_repairs || 0, icon: Wrench },
    { label: "Avg Rating", value: Number(tp?.avg_rating || 0).toFixed(1), icon: Star },
    { label: "Reliability", value: `${Number(tp?.reliability_score || 0).toFixed(0)}%`, icon: TrendingUp },
    { label: "Claim Rate", value: `${Number(tp?.claim_rate || 0).toFixed(1)}%`, icon: AlertTriangle },
    { label: "Platform Dues", value: `₹${Number(tp?.platform_dues || 0).toLocaleString()}`, icon: IndianRupee },
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{profile.full_name}</h2>

            {tp?.verified ? (
              <Badge className="bg-accent text-accent-foreground text-[10px] px-2 py-1 rounded">
                <CheckCircle className="h-3 w-3 mr-1" /> Verified
              </Badge>
            ) : (
              <Badge className="text-[10px] text-muted-foreground border px-2 py-1 rounded">
                <ShieldOff className="h-3 w-3 mr-1" /> Unverified
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{tp?.shop_name || "—"}</p>
        </div>

        <Button
          onClick={toggleVerification}
          disabled={verifying}
          className={tp?.verified
            ? "text-destructive border border-destructive/30 px-3 py-1 rounded-md"
            : "gradient-primary text-primary-foreground px-3 py-1 rounded-md"}
        >
          {verifying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : tp?.verified ? (
            <><ShieldOff className="h-4 w-4 mr-1" /> Revoke</>
          ) : (
            <><ShieldCheck className="h-4 w-4 mr-1" /> Verify</>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
            <s.icon className="mx-auto h-4 w-4 text-primary" />
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Claims */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground uppercase">Claims ({claims.length})</p>

        {claims.map((c: any) => (
          <div key={c.id} className="flex justify-between text-sm border-b pb-2">
            <div>
              <p>{c.customer?.full_name || "—"}</p>
            </div>

            <Badge className="text-[10px] border px-2 py-1 rounded">
              {c.status}
            </Badge>
          </div>
        ))}
      </div>

      {/* Bookings */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground uppercase">Bookings ({bookings.length})</p>

        {bookings.map((b: any) => (
          <div key={b.id} className="flex justify-between text-sm border-b pb-2">
            <div>
              <p>{b.customer?.full_name || "—"}</p>
            </div>

            <Badge className="text-[10px] border px-2 py-1 rounded">
              {b.status}
            </Badge>
          </div>
        ))}
      </div>

    </div>
  );
}