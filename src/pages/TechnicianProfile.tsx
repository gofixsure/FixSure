import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldCheck, MapPin, Wrench, Star, BarChart3, AlertCircle, CheckCircle, Send, Loader2, Phone, Sparkles, Store, ExternalLink, MessageSquare, Users, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function TechnicianProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [showBooking, setShowBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [namePhoneSaved, setNamePhoneSaved] = useState(false);

  const { data: tech, isLoading } = useQuery({
    queryKey: ["technician", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, city, phone, phone_verified, technician_profiles(*)")
        .eq("id", id!)
        .eq("role", "technician")
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ["technician-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, customer_id, customer:profiles!inner(full_name)")
        .eq("technician_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tech) {
    return <div className="container py-20 text-center text-muted-foreground">Technician not found.</div>;
  }

  const tp = tech.technician_profiles as any;
  const totalRepairs = tp?.total_repairs || 0;
  const isNewOnPlatform = totalRepairs < 10;

  // Format address: remove "Hyderabad" since platform currently operates in Hyderabad
  const formatAddress = (address: string | null) => {
    if (!address) return null;
    return address.replace(/,?\s*Hyderabad\s*/gi, "").replace(/,\s*$/, "").trim();
  };

  const needsNamePhone = user && profile && (!profile.full_name || !profile.phone) && !namePhoneSaved;

  const handleSaveNamePhone = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName.trim(), phone: editPhone.trim() })
      .eq("id", user!.id);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    setNamePhoneSaved(true);
    toast({ title: "Profile updated!" });
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      toast({ title: "Please sign in", description: "You need to be logged in to book a repair.", variant: "destructive" });
      return;
    }
    const currentName = namePhoneSaved ? editName : profile.full_name;
    const currentPhone = namePhoneSaved ? editPhone : profile.phone;
    if (!currentName || !currentPhone) {
      toast({ title: "Name and mobile number are required to book", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      customer_id: user.id,
      technician_id: tech.id,
      description,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } else {
      setBooked(true);
    }
  };

  if (booked) {
    return (
      <div className="container py-16 max-w-md text-center space-y-6 animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Booking Sent!</h1>
        <p className="text-muted-foreground">
          Your repair request has been sent to <strong>{tech.full_name}</strong>. They will review and confirm.
        </p>
        <div className="rounded-xl border bg-card p-5 shadow-card text-left space-y-2 text-sm">
          <p><span className="text-muted-foreground">Technician:</span> {tech.full_name}</p>
          <p><span className="text-muted-foreground">Your Name:</span> {namePhoneSaved ? editName : profile?.full_name}</p>
          <p><span className="text-muted-foreground">Phone:</span> {namePhoneSaved ? editPhone : profile?.phone}</p>
          <p><span className="text-muted-foreground">Issue:</span> {description}</p>
        </div>
        <p className="text-xs text-muted-foreground">You'll receive a notification once the technician confirms.</p>
        <Button   onClick={() => navigate("/customer-dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  const formattedAddress = formatAddress(tp?.shop_address);

  return (
    <div className="container py-10 max-w-2xl space-y-8">
      {/* Shop Photo */}
      {tp?.shop_photo_url && (
        <div className="rounded-xl overflow-hidden border shadow-card">
          <img src={tp.shop_photo_url} alt={`${tp?.shop_name || "Shop"}`} className="w-full h-48 object-cover" />
        </div>
      )}

      <div className="rounded-xl border bg-card p-8 shadow-card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{tech.full_name}</h1>
            <p className="text-muted-foreground">{tp?.shop_name || "Independent Technician"}</p>
          </div>
          {tp?.verified && (
            <span className="flex items-center gap-1 text-sm font-medium bg-accent text-accent-foreground px-3 py-1 rounded-full">
              <ShieldCheck className="h-4 w-4" /> FixSure Verified
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Wrench className="h-4 w-4" />{tp?.category || "General"}</span>
          <span className="flex items-center gap-1"><Star className="h-4 w-4" />{tp?.experience_years || 0} years experience</span>
        </div>

        {/* Full Shop Address */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{tp?.shop_address || tech.city || "Not specified"}</span>
        </div>

        {/* Google Maps Link */}
{/* Get Directions */}
{tp && (
  <button
  onClick={() => {
    const match = tp.maps_link.match(/@([\d.]+),([\d.]+)/);

    if (match) {
      const lat = match[1];
      const lng = match[2];

      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, "_blank");
    } else {
      window.open(tp.maps_link, "_blank"); // fallback
    }
  }}
  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
>
  Get Directions
</button>
)}

        {/* Call Technician Button */}
        {tech.phone_verified && tech.phone && (
          <a
            href={`tel:${tech.phone}`}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/80 transition-colors"
          >
            <Phone className="h-4 w-4" /> Call Technician: {tech.phone}
          </a>
        )}
      </div>

      {/* Reliability Score or New Badge */}
      {isNewOnPlatform ? (
        <div className="rounded-xl bg-accent/50 border p-6 text-center space-y-2">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <p className="text-lg font-semibold text-primary">Recently onboarded on FixSure</p>
          <p className="text-sm text-muted-foreground">This technician is new to the platform. Reliability score will be available after 10 repairs.</p>
        </div>
      ) : (
        <div className="rounded-xl gradient-primary p-8 text-primary-foreground text-center space-y-2">
          <p className="text-sm font-medium opacity-90">Reliability Score</p>
          <p className="text-6xl font-extrabold">{tp?.reliability_score || 0}%</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Repairs", value: totalRepairs.toLocaleString(), icon: BarChart3 },
          { label: "Avg Rating", value: `${tp?.avg_rating || 0}/5`, icon: Star },
          { label: "Claim Rate", value: `${tp?.claim_rate || 0}%`, icon: AlertCircle },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 text-center shadow-card space-y-1">
            <s.icon className="mx-auto h-5 w-5 text-primary" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-accent/50 border p-6 space-y-2">
        <h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> FixSure Protection</h3>
        <p className="text-sm text-muted-foreground">
          Repairs done with this technician can include FixSure protection which provides short-term warranty coverage. A 10% platform + coverage fee is added to the repair cost.
        </p>
      </div>

      {!showBooking ? (
        <Button   className="w-full gradient-primary text-primary-foreground" onClick={() => setShowBooking(true)}>
          <Send className="mr-2 h-4 w-4" /> Request Service
        </Button>
      ) : (
        <form onSubmit={handleBook} className="rounded-xl border bg-card p-8 shadow-card space-y-5 animate-fade-in">
          <h3 className="font-semibold text-lg">Request Service from {tech.full_name}</h3>

          {!user ? (
            <p className="text-sm text-destructive">Please sign in to book a repair.</p>
          ) : needsNamePhone ? (
            <div className="space-y-4 rounded-lg bg-accent/30 p-4">
              <p className="text-sm font-medium text-primary">Please provide your details to continue</p>
              <div className="space-y-2">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input required placeholder="Your full name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number <span className="text-destructive">*</span></Label>
                <Input required type="tel" placeholder="e.g. 9876543210" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <Button type="button"   onClick={handleSaveNamePhone}>
                Save & Continue
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-accent/30 p-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">Name:</span> {namePhoneSaved ? editName : profile?.full_name}</p>
              <p><span className="text-muted-foreground">Phone:</span> {namePhoneSaved ? editPhone : profile?.phone}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Describe the Issue</Label>
            <Textarea required placeholder="e.g. Screen cracked, battery draining fast..." rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit"   className="w-full gradient-primary text-primary-foreground" disabled={submitting || !user || (needsNamePhone && !namePhoneSaved)}>
            {submitting ? "Sending..." : "Send Booking Request"}
          </Button>
        </form>
      )}

      {/* Rating Transparency */}
      {reviews && reviews.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Rating Transparency
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-accent/50 p-4 text-center space-y-1">
              <p className="text-2xl font-bold">{reviews.length}</p>
              <p className="text-xs text-muted-foreground">Total Ratings</p>
            </div>
            <div className="rounded-lg bg-accent/50 p-4 text-center space-y-1">
              <p className="text-2xl font-bold flex items-center justify-center gap-1">
                <TrendingDown className="h-4 w-4 text-destructive" />
                {reviews.filter((r: any) => r.rating < (tp?.avg_rating || 0)).length}
              </p>
              <p className="text-xs text-muted-foreground">Below Average</p>
            </div>
          </div>
          {/* Star distribution */}
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r: any) => r.rating === star).length;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-right text-muted-foreground">{star}★</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-xs text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Reviews */}
      {reviews && reviews.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Customer Reviews ({reviews.length})
          </h3>
          {reviews.filter((r: any) => r.comment).map((r: any) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 shadow-card space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{r.customer?.full_name || "Customer"}</p>
                <div className="flex items-center gap-1 text-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "text-primary fill-primary" : "text-muted"}`} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{r.comment}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
          {reviews.filter((r: any) => !r.comment).length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              + {reviews.filter((r: any) => !r.comment).length} rating(s) without written feedback
            </p>
          )}
        </div>
      )}
    </div>
  );
}
