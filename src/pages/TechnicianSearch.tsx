import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Wrench, ShieldCheck, Star, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface TechnicianWithProfile {
  id: string;
  full_name: string;
  city: string | null;
  avatar_url: string | null;
  technician_profiles: {
    shop_name: string;
    shop_address: string;
    category: string;
    experience_years: number;
    reliability_score: number | null;
    total_repairs: number | null;
    avg_rating: number | null;
    claim_rate: number | null;
    verified: boolean | null;
    selfie_url: string | null;
    maps_link: string | null;
  } | null;
}

export default function TechnicianSearch() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All Cities");
  const [category, setCategory] = useState("All Categories");
  const { user } = useAuth();

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, city, avatar_url, technician_profiles(*)")
        .eq("role", "technician");
      if (error) throw error;
      return (data || []) as TechnicianWithProfile[];
    },
  });

  const cities = useMemo(() => {
    const unique = new Set(technicians.map((t) => t.city).filter(Boolean));
    return ["All Cities", ...Array.from(unique)] as string[];
  }, [technicians]);

  const categories = useMemo(() => {
    const unique = new Set(
      technicians.map((t) => t.technician_profiles?.category).filter(Boolean)
    );
    return ["All Categories", ...Array.from(unique)] as string[];
  }, [technicians]);

  const filtered = useMemo(() => {
    return technicians.filter((t) => {
      const tp = t.technician_profiles;
      const matchQuery =
        t.full_name.toLowerCase().includes(query.toLowerCase()) ||
        (tp?.shop_name || "").toLowerCase().includes(query.toLowerCase());
      const matchCity = city === "All Cities" || t.city === city;
      const matchCat = category === "All Categories" || tp?.category === category;
      return matchQuery && matchCity && matchCat;
    });
  }, [query, city, category, technicians]);

  if (isLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading technicians...</p>
      </div>
    );
  }

  return (
    <div className="container py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Find a <span className="text-gradient">FixSure Technician</span></h1>
        <p className="text-muted-foreground">Search for verified repair technicians near you</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or shop..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          {cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t) => {
          const tp = t.technician_profiles;
          const profilePhoto = tp?.selfie_url || t.avatar_url;
          const initials = t.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
          const totalRepairs = tp?.total_repairs || 0;
          const isNewOnPlatform = totalRepairs < 10;

          return (
            <div key={t.id} className="rounded-xl border bg-card p-6 shadow-card hover:shadow-card-hover transition-shadow space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  {profilePhoto ? (
                    <AvatarImage src={profilePhoto} alt={t.full_name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{t.full_name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{tp?.shop_name || "Independent"}</p>
                </div>
                {tp?.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium bg-accent text-accent-foreground px-2 py-1 rounded-full shrink-0">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{tp?.shop_address || t.city || "Not specified"}</p>
                <p className="flex items-center gap-2"><Wrench className="h-4 w-4" />{tp?.category || "General"}</p>
                <p className="flex items-center gap-2"><Star className="h-4 w-4" />Experience: {tp?.experience_years || 0} years</p>
              </div>

              {/* Rating & Reliability */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{Number(tp?.avg_rating || 0).toFixed(1)}/5</span>
                  <span className="text-muted-foreground">Rating</span>
                </div>
                {isNewOnPlatform ? (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">Recently onboarded on FixSure</span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold">
                    Reliability: <span className="text-primary">{tp?.reliability_score || 0}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end">
                <Link to={`/technician/${t.id}`}>
                  <Button    >View Profile</Button>
                </Link>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {technicians.length === 0
              ? (user
                ? "No technicians have signed up yet. Be the first!"
                : "Sign up to explore FixSure technicians near you.")
              : "No technicians found matching your criteria."}
          </div>
        )}
      </div>
    </div>
  );
}
