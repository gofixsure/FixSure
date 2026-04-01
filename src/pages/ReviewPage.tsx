import { useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, CheckCircle, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function ReviewPage() {
  const [searchParams] = useSearchParams();
  const techId = searchParams.get("tech") || "";
  const bookingId = searchParams.get("booking") || "";
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch technician info from DB
  const { data: tech, isLoading } = useQuery({
    queryKey: ["review-tech", techId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, city, technician_profiles(shop_name)")
        .eq("id", techId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!techId,
  });

  if (authLoading || isLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth?role=customer" replace />;

  if (!techId || !bookingId) {
    return (
      <div className="container py-16 text-center space-y-4">
        <p className="text-muted-foreground">Missing review parameters. Please use the review link from your dashboard.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);

    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      customer_id: user.id,
      technician_id: techId,
      rating,
      comment,
    });

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already reviewed", description: "You've already submitted a review for this booking.", variant: "destructive" });
      } else {
        toast({ title: "Failed to submit review", description: error.message, variant: "destructive" });
      }
      return;
    }

    toast({ title: "Review submitted!" });
    setSubmitted(true);
  };

  const tp = tech?.technician_profiles as any;
  console.log("TP DATA:", tp);

  if (submitted) {
    return (
      <div className="container py-16 max-w-md text-center space-y-6 animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Thank You!</h1>
        <p className="text-muted-foreground">
          Your review has been submitted. This helps other customers trust {tech?.full_name || "the technician"} and improves the FixSure community.
        </p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-6 w-6 ${star <= rating ? "fill-warning text-warning" : "text-muted"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Rate Your <span className="text-gradient">Repair</span></h1>
        <p className="text-sm text-muted-foreground">Your feedback helps build trust in local repairs</p>
      </div>

      {tech && (
        <div className="rounded-xl border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            {tech.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold">{tech.full_name}</p>
            <p className="text-sm text-muted-foreground">{tp?.shop_name || "Technician"} · {tech.city || ""}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-card space-y-6">
        <div className="space-y-3 text-center">
          <Label className="text-base">How was your repair experience?</Label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= (hoveredStar || rating)
                      ? "fill-warning text-warning"
                      : "text-muted"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {rating === 0 && "Tap a star to rate"}
            {rating === 1 && "Poor"}
            {rating === 2 && "Below Average"}
            {rating === 3 && "Average"}
            {rating === 4 && "Good"}
            {rating === 5 && "Excellent"}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Write a review <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea
            placeholder="Tell us about your experience..."
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full gradient-primary text-primary-foreground"
          disabled={rating === 0 || submitting}
        >
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Review"}
        </Button>
      </form>
    </div>
  );
}
