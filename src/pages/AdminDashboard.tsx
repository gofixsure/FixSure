import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createNotification, CLAIM_STATUS_LABELS, CLAIM_STATUS_STYLES } from "@/lib/notifications";
import {
  Users, Wrench, AlertTriangle, CheckCircle, XCircle, Shield, Loader2,
  Phone, Clock, BarChart3, UserCheck, Home
} from "lucide-react";
import AdminTechnicianList from "@/components/admin/AdminTechnicianList";
import AdminTechnicianDetail from "@/components/admin/AdminTechnicianDetail";
import AdminAnalyticsCharts from "@/components/admin/AdminAnalyticsCharts";

interface ClaimWithDetails {
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
  technician?: { full_name: string; phone: string | null } | null;
}

interface Repair {
  id: string;
  category: string;
  repair_description: string | null;
  damage_photo_url: string | null;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  booking_id: string | null;
}

export default function AdminDashboard() {
  const { profile, user, loading } = useAuth();
  const { toast } = useToast();
  const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
  const [repairs, setRepairs] = useState<Record<string, Repair>>({});
  const [allRepairs, setAllRepairs] = useState<any[]>([]);
  const [stats, setStats] = useState({ technicians: 0, repairs: 0, claims: 0, resolved: 0, customers: 0, totalPayouts: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [tab, setTab] = useState<"review" | "all" | "technicians" | "analytics">("review");
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    const fetchData = async () => {
      const [claimsRes, techCountRes, repairCountRes, customerCountRes, allRepairsRes, payoutRes] = await Promise.all([
        supabase
          .from("claims")
          .select("*, customer:profiles!claims_customer_id_fkey(full_name, phone), technician:profiles!claims_technician_id_fkey(full_name, phone)")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "technician"),
        supabase.from("repairs").select("id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "customer"),
        supabase.from("repairs").select("created_at, total_amount, fixsure_fee, category").order("created_at", { ascending: false }),
        supabase.from("technician_profiles").select("fixsure_payout"),
      ]);

      if (claimsRes.data) {
        const claimsData = claimsRes.data as any[];
        setClaims(claimsData);

        const bookingIds = claimsData.map((c: any) => c.booking_id).filter(Boolean);
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

        const resolvedCount = claimsData.filter((c: any) =>
          ["claim_resolved", "claim_rejected", "approved", "rejected"].includes(c.status)
        ).length;

        const totalPayouts = (payoutRes.data || []).reduce((sum: number, tp: any) => sum + Number(tp.fixsure_payout || 0), 0);

        setStats({
          technicians: techCountRes.count || 0,
          repairs: repairCountRes.count || 0,
          claims: claimsData.length,
          resolved: resolvedCount,
          customers: customerCountRes.count || 0,
          totalPayouts,
        });
      }
      setAllRepairs(allRepairsRes.data || []);
      setDataLoading(false);
    };
    fetchData();
  }, [user, profile]);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  const handleAdminAction = async (claim: ClaimWithDetails, action: "re_repair_approved" | "claim_rejected") => {
    setProcessing(claim.id);
    const { error } = await supabase
      .from("claims")
      .update({ status: action } as any)
      .eq("id", claim.id);

    if (error) {
      toast({ title: "Failed to update claim", variant: "destructive" });
      setProcessing(null);
      return;
    }

    setClaims((prev) => prev.map((c) => c.id === claim.id ? { ...c, status: action } : c));

    if (action === "re_repair_approved") {
      await createNotification(claim.customer_id, "✅ FixSure Review: Claim Approved", "Your claim has been approved by FixSure. Please visit the technician for a free re-repair.", "claim", claim.id);
      await createNotification(claim.technician_id, "⚠️ FixSure Decision: Re-Repair Required", "FixSure has reviewed and approved the customer's claim. Please perform the re-repair.", "claim", claim.id);
      toast({ title: "Claim approved — technician must re-repair" });
    } else {
      await createNotification(claim.customer_id, "❌ FixSure Review: Claim Rejected", "After review, FixSure has determined your claim does not qualify. The claim has been closed.", "claim", claim.id);
      await createNotification(claim.technician_id, "ℹ️ Claim Resolved", "The disputed claim has been rejected by FixSure. No further action needed.", "claim", claim.id);
      toast({ title: "Claim rejected" });
    }
    setProcessing(null);
  };

  const reviewClaims = claims.filter((c) => c.status === "under_review");

  const statCards = [
    { label: "Customers", value: stats.customers, icon: Users },
    { label: "Technicians", value: stats.technicians, icon: UserCheck },
    { label: "Total Repairs", value: stats.repairs, icon: Wrench },
    { label: "Claims", value: stats.claims, icon: AlertTriangle },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle },
  ];

  const payoutCard = stats.totalPayouts;

  return (
    <div className="container py-10 max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">FixSure <span className="text-gradient">Admin</span></h1>
          <p className="text-muted-foreground">Platform management and claim review</p>
        </div>
        <Link to="/">
          <Button className="border px-3 py-1 rounded text-sm">
            <Home className="h-4 w-4" /> Home
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-card text-center space-y-2">
            <s.icon className="mx-auto h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* FixSure Protection Payouts */}
      <div className="rounded-xl border bg-card p-5 shadow-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm font-semibold">FixSure Protection Payouts</p>
            <p className="text-xs text-muted-foreground">Total owed to technicians for completed re-repairs</p>
          </div>
        </div>
        <p className="text-2xl font-bold">₹{Number(payoutCard).toLocaleString()}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border bg-muted/50 p-1 overflow-x-auto">
        {([
          { key: "review", label: `Claims (${reviewClaims.length})`, icon: Shield },
          { key: "all", label: "All Claims", icon: BarChart3 },
          { key: "technicians", label: "Technicians", icon: Users },
          { key: "analytics", label: "Analytics", icon: BarChart3 },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelectedTechId(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors whitespace-nowrap px-3 ${
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "analytics" ? (
        <AdminAnalyticsCharts repairs={allRepairs} claims={claims} stats={stats} />
      ) : tab === "technicians" ? (
        selectedTechId ? (
          <AdminTechnicianDetail technicianId={selectedTechId} onBack={() => setSelectedTechId(null)} />
        ) : (
          <AdminTechnicianList onSelect={setSelectedTechId} />
        )
      ) : dataLoading ? (
        <div className="text-center py-10">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {(tab === "review" ? reviewClaims : claims).length === 0 ? (
            <div className="rounded-xl border bg-card p-10 shadow-card text-center space-y-3">
              <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                {tab === "review" ? "No claims pending review." : "No claims found."}
              </p>
            </div>
          ) : (
            (tab === "review" ? reviewClaims : claims).map((c) => {
              const repair = repairs[c.booking_id];
              return (
                <div key={c.id} className={`rounded-xl border bg-card p-6 shadow-card space-y-4 ${c.status === "under_review" ? "border-primary/30" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-mono">Claim #{c.id.slice(0, 8)}</p>
                      <p className="font-semibold text-sm">Customer: {(c as any).customer?.full_name || "—"}</p>
                      <p className="text-sm text-muted-foreground">Technician: {(c as any).technician?.full_name || "—"}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${CLAIM_STATUS_STYLES[c.status] || "bg-muted text-muted-foreground"}`}>
                      {CLAIM_STATUS_LABELS[c.status] || c.status}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Details</p>
                      {(c as any).customer?.phone && (
                        <p className="text-sm flex items-center gap-1"><Phone className="h-3 w-3" /> {(c as any).customer.phone}</p>
                      )}
                      <p className="text-sm capitalize">Requested: {c.claim_type === "refund" ? "50% Refund" : "Re-Repair"}</p>
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                    </div>
                    {repair && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Repair Record</p>
                        <p className="text-sm">{repair.category} — ₹{Number(repair.total_amount).toLocaleString()}</p>
                        {repair.repair_description && <p className="text-xs text-muted-foreground">{repair.repair_description}</p>}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {repair?.damage_photo_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Original Repair Photo</p>
                        <a href={repair.damage_photo_url} target="_blank" rel="noopener noreferrer">
                          <img src={repair.damage_photo_url} alt="Original repair" className="rounded-lg border h-32 w-full object-cover" />
                        </a>
                      </div>
                    )}
                    {c.photo_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Claim Evidence</p>
                        <a href={c.photo_url} target="_blank" rel="noopener noreferrer">
                          <img src={c.photo_url} alt="Claim evidence" className="rounded-lg border h-32 w-full object-cover" />
                        </a>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>

                  {c.status === "under_review" && (
                    <div className="flex gap-2 border-t pt-4">
                      <Button
                         
                        className="flex-1 gradient-primary text-primary-foreground"
                        disabled={processing === c.id}
                        onClick={() => handleAdminAction(c, "re_repair_approved")}
                      >
                        {processing === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="mr-1 h-4 w-4" /> Approve Claim</>}
                      </Button>
                      <Button
                         
                         
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={processing === c.id}
                        onClick={() => handleAdminAction(c, "claim_rejected")}
                      >
                        <XCircle className="mr-1 h-4 w-4" /> Reject Claim
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
