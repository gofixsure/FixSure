import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, CheckCircle, XCircle, Star, Wrench, IndianRupee, ChevronRight } from "lucide-react";

interface TechnicianRow {
  id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  tp?: {
    shop_name: string;
    category: string;
    verified: boolean;
    total_repairs: number;
    avg_rating: number;
    platform_dues: number;
    reliability_score: number;
    claim_rate: number;
    experience_years: number;
  } | null;
}

interface Props {
  onSelect: (id: string) => void;
}

export default function AdminTechnicianList({ onSelect }: Props) {
  const [technicians, setTechnicians] = useState<TechnicianRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, city, avatar_url")
        .eq("role", "technician")
        .order("created_at", { ascending: false });

      if (!profiles || profiles.length === 0) {
        setLoading(false);
        return;
      }

      const ids = profiles.map((p) => p.id);
      const { data: tps } = await supabase
        .from("technician_profiles")
        .select("id, shop_name, category, verified, total_repairs, avg_rating, platform_dues, reliability_score, claim_rate, experience_years")
        .in("id", ids);

      const tpMap = new Map((tps || []).map((t) => [t.id, t]));

      setTechnicians(
        profiles.map((p) => ({
          ...p,
          tp: tpMap.get(p.id) || null,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 shadow-card text-center space-y-3">
        <Users className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No technicians registered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {technicians.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className="w-full text-left rounded-xl border bg-card p-4 shadow-card hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{t.full_name}</p>
                {t.tp?.verified ? (
                  <Badge className="text-[10px] px-2 py-1 rounded border">
                    <CheckCircle className="h-3 w-3 mr-0.5" /> Verified
                  </Badge>
                ) : (
                  <Badge className="text-[10px] px-2 py-1 rounded border">
                    <XCircle className="h-3 w-3 mr-0.5" /> Unverified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {t.tp?.shop_name || "No shop"} • {t.city || "—"}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" /> {Number(t.tp?.avg_rating || 0).toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> {t.tp?.total_repairs || 0} repairs
                </span>
                <span className="flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" /> ₹{Number(t.tp?.platform_dues || 0).toLocaleString()} dues
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </button>
      ))}
    </div>
  );
}
