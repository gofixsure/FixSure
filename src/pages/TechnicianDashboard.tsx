import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Wrench, Bell, Star, BarChart3, LogOut, User, Clock, CheckCircle, XCircle, PlusCircle, History, AlertTriangle, Wallet } from "lucide-react";
import TechnicianClaimsSection from "@/components/TechnicianClaimsSection";

interface TechProfile {
  shop_name: string;
  category: string;
  experience_years: number;
  reliability_score: number;
  total_repairs: number;
  avg_rating: number;
  claim_rate: number;
  verified: boolean;
  platform_dues: number;
  fixsure_payout: number;
}

interface Booking {
  id: string;
  description: string;
  status: string;
  created_at: string;
  customer_id: string;
  customer: { full_name: string; phone: string | null } | null;
}

interface Repair {
  id: string;
  customer_name: string;
  category: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function TechnicianDashboard() {
  const { profile, user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [techProfile, setTechProfile] = useState<TechProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [repairCount, setRepairCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [techRes, bookingRes, repairRes, repairCountRes] = await Promise.all([
        supabase.from("technician_profiles").select("*").eq("id", user.id).single(),
        supabase.from("bookings").select("id, description, status, created_at, customer_id, customer:profiles!bookings_customer_id_fkey(full_name, phone)").eq("technician_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("repairs").select("*").eq("technician_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("repairs").select("id", { count: "exact", head: true }).eq("technician_id", user.id),
      ]);
      if (techRes.data) setTechProfile(techRes.data as TechProfile);
      if (bookingRes.data) setBookings(bookingRes.data as Booking[]);
      if (repairRes.data) setRepairs(repairRes.data as Repair[]);
      setRepairCount(repairCountRes.count || 0);
      setDataLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth?role=technician" replace />;

  // Redirect to onboarding if technician hasn't completed their profile
  if (!dataLoading && techProfile && !techProfile.shop_name) {
    return <Navigate to="/onboarding" replace />;
  }

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const pastBookings = bookings.filter((b) => b.status !== "pending");

  return (
    <div className="container py-10 max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            <span className="text-gradient">{profile?.full_name || "Technician"}</span>
          </h1>
          <p className="text-muted-foreground text-sm">{techProfile?.shop_name || "Your repair business dashboard"}</p>
        </div>
        <Button     onClick={signOut}>
          <LogOut className="mr-1 h-4 w-4" /> Sign Out
        </Button>
      </div>

      {/* Reliability Score */}
      {techProfile && (
        <div className="rounded-xl gradient-primary p-6 text-primary-foreground text-center space-y-1">
          <p className="text-sm font-medium opacity-90">Reliability Score</p>
          <p className="text-5xl font-extrabold">{techProfile.reliability_score || 0}%</p>
          <p className="text-xs opacity-75">
            {techProfile.verified ? "✓ FixSure Verified" : "Complete your profile to get verified"}
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Repairs", value: repairCount, icon: BarChart3 },
          { label: "Rating", value: techProfile?.avg_rating ? `${techProfile.avg_rating}/5` : "—", icon: Star },
          { label: "Claims", value: techProfile?.claim_rate ? `${techProfile.claim_rate}%` : "0%", icon: AlertTriangle },
          { label: "Pending", value: pendingBookings.length, icon: Bell },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center shadow-card space-y-1">
            <s.icon className="mx-auto h-5 w-5 text-primary" />
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/repair-log">
          <Button className="w-full gradient-primary text-primary-foreground"  >
            <PlusCircle className="mr-2 h-4 w-4" /> Log Repair
          </Button>
        </Link>
        <Link to="/onboarding">
          <Button className="w-full"    >
            <User className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </Link>
      </div>

      {/* Platform Dues & FixSure Payouts */}
      {techProfile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-card space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Platform Dues
            </h2>
            <div>
              <p className="text-2xl font-bold">₹{Number(techProfile.platform_dues || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Accumulated FixSure fees from repairs</p>
            </div>
            <span className="text-xs bg-warning/10 text-warning px-3 py-1.5 rounded-full font-medium inline-block">
              Due end of cycle
            </span>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-card space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent-foreground" /> FixSure Protection Payouts
            </h2>
            <div>
              <p className="text-2xl font-bold text-accent-foreground">₹{Number(techProfile.fixsure_payout || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Owed to you for completed re-repairs</p>
            </div>
            <span className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full font-medium inline-block">
              Receivable
            </span>
          </div>
        </div>
      )}

      {/* Customer Claims */}
      {user && <TechnicianClaimsSection userId={user.id} />}

      {/* Pending Bookings */}
      {pendingBookings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pending Bookings ({pendingBookings.length})
          </h2>
          {pendingBookings.map((b) => (
            <div key={b.id} className="rounded-xl border bg-card p-4 shadow-card space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{b.customer?.full_name || "Customer"}</p>
              </div>
              <p className="text-sm text-muted-foreground">{b.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
                <Button
                   
                  className="gradient-primary text-primary-foreground"
                  onClick={() => navigate("/notifications")}
                >
                  <Bell className="mr-1 h-3 w-3" /> Review & Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Bookings */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Booking History
        </h2>
        {dataLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : pastBookings.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 shadow-card text-center">
            <p className="text-sm text-muted-foreground">No past bookings yet.</p>
          </div>
        ) : (
          pastBookings.map((b) => (
            <div key={b.id} className="rounded-xl border bg-card p-4 shadow-card flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-sm">{b.customer?.full_name || "Customer"}</p>
                <p className="text-xs text-muted-foreground">{b.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                b.status === "accepted" ? "bg-accent text-accent-foreground"
                : b.status === "completed" ? "bg-accent text-accent-foreground"
                : "bg-destructive/10 text-destructive"
              }`}>
                {b.status === "accepted" ? "Accepted" : b.status === "completed" ? "Completed" : "Declined"}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Recent Repairs */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" /> Recent Repairs
        </h2>
        {dataLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : repairs.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 shadow-card text-center space-y-3">
            <Wrench className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No repairs logged yet.</p>
            <Link to="/repair-log">
              <Button   className="gradient-primary text-primary-foreground">Log Your First Repair</Button>
            </Link>
          </div>
        ) : (
          repairs.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 shadow-card flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-sm">{r.customer_name} — {r.category}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">₹{Number(r.total_amount).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground capitalize">{r.status}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
