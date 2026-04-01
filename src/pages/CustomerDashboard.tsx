import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications";
import {
  Search, Clock, CheckCircle, XCircle, User, LogOut, Wrench,
  Bell, Star, MessageSquare, Loader2, AlertTriangle, Wallet, ThumbsUp
} from "lucide-react";
import CustomerClaimsTab from "@/components/CustomerClaimsTab";

interface DbNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

interface ClaimForConfirm {
  id: string;
  booking_id: string;
  technician_id: string;
  claim_type: string;
  status: string;
}

interface Booking {
  id: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  technician_id: string;
  technician: { full_name: string; phone: string | null } | null;
}

interface Repair {
  id: string;
  category: string;
  total_amount: number;
  repair_description: string | null;
  technician_id: string;
  booking_id: string | null;
  status: string;
  created_at: string;
}

type Tab = "overview" | "notifications" | "reviews" | "claims" | "wallet";

export default function CustomerDashboard() {
  const { profile, user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [dbNotifications, setDbNotifications] = useState<DbNotification[]>([]);
  const [reRepairClaims, setReRepairClaims] = useState<ClaimForConfirm[]>([]);
  const [confirmingClaimId, setConfirmingClaimId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  // Review state
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewTechId, setReviewTechId] = useState<string | null>(null);
  const [reviewTechName, setReviewTechName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());
  const [lastSeenNotificationAt, setLastSeenNotificationAt] = useState(0);
  const [lastSeenReviewsAt, setLastSeenReviewsAt] = useState(0);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    const storedSeenAt = window.localStorage.getItem(`customer_notifications_seen_${user.id}`);
    if (storedSeenAt) {
      setLastSeenNotificationAt(Number(storedSeenAt) || now);
    } else {
      // First visit: mark all existing notifications as seen
      window.localStorage.setItem(`customer_notifications_seen_${user.id}`, String(now));
      setLastSeenNotificationAt(now);
    }
    const storedReviewsAt = window.localStorage.getItem(`customer_reviews_seen_${user.id}`);
    if (storedReviewsAt) {
      setLastSeenReviewsAt(Number(storedReviewsAt) || now);
    } else {
      window.localStorage.setItem(`customer_reviews_seen_${user.id}`, String(now));
      setLastSeenReviewsAt(now);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [bookingRes, repairRes, reviewRes, notifRes, claimsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, description, status, created_at, updated_at, technician_id, technician:profiles!bookings_technician_id_fkey(full_name, phone)")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("repairs")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("booking_id")
          .eq("customer_id", user.id),
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("claims")
          .select("id, booking_id, technician_id, claim_type, status")
          .eq("customer_id", user.id)
          .eq("claim_type", "re-repair")
          .eq("status", "re_repair_completed"),
      ]);
      if (bookingRes.data) setBookings(bookingRes.data as Booking[]);
      if (repairRes.data && bookingRes.data) {
        const myBookingIds = new Set(bookingRes.data.map((b: any) => b.id));
        setRepairs((repairRes.data as Repair[]).filter((r) => r.booking_id && myBookingIds.has(r.booking_id)));
      }
      if (reviewRes.data) {
        setReviewedBookings(new Set(reviewRes.data.map((r: any) => r.booking_id)));
      }
      if (notifRes.data) setDbNotifications(notifRes.data as DbNotification[]);
      if (claimsRes.data) setReRepairClaims(claimsRes.data as ClaimForConfirm[]);
      setLoadingData(false);
    };
    fetchData();
  }, [user]);

  const handleConfirmReRepair = async (claim: ClaimForConfirm) => {
    setConfirmingClaimId(claim.id);
    const { error } = await supabase
      .from("claims")
      .update({ status: "claim_resolved" })
      .eq("id", claim.id);
    if (error) {
      toast({ title: "Failed to confirm", description: error.message, variant: "destructive" });
      setConfirmingClaimId(null);
      return;
    }
    setReRepairClaims((prev) => prev.filter((c) => c.id !== claim.id));
    await createNotification(
      claim.technician_id,
      "✅ Re-Repair Confirmed",
      "The customer has confirmed the re-repair is resolved. Your FixSure protection payout has been updated.",
      "claim",
      claim.id
    );
    toast({ title: "Re-repair confirmed!", description: "Thank you for confirming. The issue is now resolved." });
    setConfirmingClaimId(null);
  };

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth?role=customer" replace />;

  const statusIcon = (status: string) => {
    if (status === "pending") return <Clock className="h-4 w-4 text-warning" />;
    if (status === "accepted") return <CheckCircle className="h-4 w-4 text-primary" />;
    if (status === "declined") return <XCircle className="h-4 w-4 text-destructive" />;
    return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const confirmedBookings = bookings.filter((b) => b.status === "accepted");
  const notifications = bookings.filter((b) => b.status !== "pending");
  const unreadNotificationsCount = notifications.filter((b) => {
    const notificationTime = new Date(b.updated_at || b.created_at).getTime();
    return notificationTime > lastSeenNotificationAt;
  }).length;

  // Count unreviewed bookings that appeared after lastSeenReviewsAt
  const unreviewedCount = confirmedBookings.filter((b) => {
    if (reviewedBookings.has(b.id)) return false;
    const bookingTime = new Date(b.updated_at || b.created_at).getTime();
    return bookingTime > lastSeenReviewsAt;
  }).length;

  const markNotificationsSeen = () => {
    const latestNotificationTime = notifications.reduce(
      (latest, b) => Math.max(latest, new Date(b.updated_at || b.created_at).getTime()),
      lastSeenNotificationAt
    );

    setLastSeenNotificationAt(latestNotificationTime);
    window.localStorage.setItem(`customer_notifications_seen_${user.id}`, String(latestNotificationTime));
  };

  const markReviewsSeen = () => {
    const now = Date.now();
    setLastSeenReviewsAt(now);
    window.localStorage.setItem(`customer_reviews_seen_${user.id}`, String(now));
  };

  const handleSubmitReview = async () => {
    if (!rating || !reviewTechId || !reviewBookingId) return;
    setSubmittingReview(true);

    const { error } = await supabase.from("reviews" as any).insert({
      booking_id: reviewBookingId,
      customer_id: user!.id,
      technician_id: reviewTechId,
      rating,
      comment: reviewComment,
    });

    if (error) {
      setSubmittingReview(false);
      return;
    }

    setReviewedBookings((prev) => new Set(prev).add(reviewBookingId));
    setReviewBookingId(null);
    setRating(0);
    setReviewComment("");
    setSubmittingReview(false);
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: User },
    { key: "notifications", label: "Updates", icon: Bell },
    { key: "reviews", label: "Review", icon: Star },
    { key: "claims", label: "Claims", icon: AlertTriangle },
    { key: "wallet", label: "Wallet", icon: Wallet },
  ];

  return (
    <div className="container py-10 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            Welcome, <span className="text-gradient">{profile?.full_name || "Customer"}</span>
          </h1>
          <p className="text-muted-foreground text-sm">Your repair dashboard</p>
        </div>
        <Button     onClick={signOut}>
          <LogOut className="mr-1 h-4 w-4" /> Sign Out
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border bg-muted/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === "notifications") markNotificationsSeen();
              if (t.key === "reviews") markReviewsSeen();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === "notifications" && unreadNotificationsCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
            {t.key === "reviews" && unreviewedCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                {unreviewedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link to="/search">
              <div className="rounded-xl border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow text-center space-y-2 cursor-pointer">
                <Search className="mx-auto h-6 w-6 text-primary" />
                <p className="font-medium text-sm">Find Technician</p>
              </div>
            </Link>
            <div onClick={() => setTab("claims")} className="rounded-xl border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow text-center space-y-2 cursor-pointer">
              <AlertTriangle className="mx-auto h-6 w-6 text-primary" />
              <p className="font-medium text-sm">File a Claim</p>
            </div>
          </div>

          {/* Profile Card */}
          <div className="rounded-xl border bg-card p-6 shadow-card space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Your Profile
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{profile?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{profile?.phone || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">City</p>
                <p className="font-medium">{profile?.city || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email || "—"}</p>
              </div>
            </div>
          </div>

          {/* Bookings */}
          <div className="space-y-3">
            <h2 className="font-semibold">Your Bookings</h2>
            {loadingData ? (
              <p className="text-sm text-muted-foreground">Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 shadow-card text-center space-y-3">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No bookings yet.</p>
                <Link to="/search">
                  <Button   className="gradient-primary text-primary-foreground">Find a Technician</Button>
                </Link>
              </div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="rounded-xl border bg-card p-4 shadow-card flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{b.technician?.full_name || "Technician"}</p>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon(b.status)}
                    <span className="text-xs font-medium capitalize">{b.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {tab === "notifications" && (
        <div className="space-y-4">
          {loadingData ? (
            <div className="text-center py-10">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (dbNotifications.length === 0 && bookings.length === 0) ? (
            <div className="rounded-xl border bg-card p-10 shadow-card text-center space-y-3">
              <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications yet.</p>
              <p className="text-xs text-muted-foreground">
                Book a repair and you'll see status updates here.
              </p>
            </div>
          ) : (
            <>
              {/* Re-repair confirmation banner */}
              {reRepairClaims.length > 0 && reRepairClaims.map((claim) => {
                const booking = bookings.find((b) => b.id === claim.booking_id);
                return (
                  <div key={claim.id} className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5 shadow-card space-y-3 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <Wrench className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">🔧 Re-Repair Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {booking?.technician?.full_name || "Your technician"} has completed the re-repair. Is the issue resolved?
                        </p>
                      </div>
                    </div>
                    <Button
                       
                      className="w-full gradient-primary text-primary-foreground"
                      disabled={confirmingClaimId === claim.id}
                      onClick={() => handleConfirmReRepair(claim)}
                    >
                      {confirmingClaimId === claim.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="mr-1 h-4 w-4" />
                      )}
                      Confirm Repair Resolved
                    </Button>
                  </div>
                );
              })}

              {/* DB Notifications */}
              {dbNotifications.map((n) => (
                <div key={n.id} className={`rounded-xl border bg-card p-5 shadow-card space-y-2 animate-fade-in ${!n.read ? "border-primary/30" : ""}`}>
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.message}</p>
                </div>
              ))}

              {/* Booking-based notifications */}
              {bookings.map((b) => {
                const repair = repairs.find((r) => r.booking_id === b.id);
                return (
                  <div key={b.id} className="rounded-xl border bg-card p-5 shadow-card space-y-3 animate-fade-in">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-primary" />
                          {b.technician?.full_name || "Technician"}
                        </p>
                        <p className="text-xs text-muted-foreground">{b.description}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        b.status === "pending" ? "bg-warning/10 text-warning"
                        : b.status === "accepted" ? "bg-accent text-accent-foreground"
                        : "bg-destructive/10 text-destructive"
                      }`}>
                        {b.status === "pending" ? "Pending" : b.status === "accepted" ? "Confirmed" : "Declined"}
                      </span>
                    </div>

                    {b.status === "accepted" && repair && (
                      <div className="rounded-lg bg-accent/30 p-3 space-y-1.5 text-sm">
                        <p className="font-medium text-xs text-primary">✅ Booking Confirmed</p>
                        <p className="text-muted-foreground">{repair.repair_description || repair.category}</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Amount</span>
                          <span className="font-semibold">₹{Number(repair.total_amount).toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {b.status === "pending" && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Waiting for technician to respond...
                      </p>
                    )}

                    {b.status === "declined" && (
                      <p className="text-xs text-muted-foreground">
                        The technician declined this request. Try booking another technician.
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleString()}</p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {tab === "reviews" && (
        <div className="space-y-4">
          {confirmedBookings.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 shadow-card text-center space-y-3">
              <Star className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No completed repairs to review yet.</p>
              <p className="text-xs text-muted-foreground">
                Once a technician confirms your repair, you can rate them here.
              </p>
            </div>
          ) : (
            confirmedBookings.map((b) => {
              const reviewed = reviewedBookings.has(b.id);
              const repair = repairs.find((r) => r.booking_id === b.id);

              if (reviewBookingId === b.id) {
                return (
                  <div key={b.id} className="rounded-xl border bg-card p-6 shadow-card space-y-5 animate-fade-in">
                    <h3 className="font-semibold text-sm">Rate {reviewTechName}</h3>
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
                            className={`h-9 w-9 transition-colors ${
                              star <= (hoveredStar || rating) ? "fill-warning text-warning" : "text-muted"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      {rating === 0 && "Tap a star to rate"}
                      {rating === 1 && "Poor"}
                      {rating === 2 && "Below Average"}
                      {rating === 3 && "Average"}
                      {rating === 4 && "Good"}
                      {rating === 5 && "Excellent"}
                    </p>
                    <div className="space-y-2">
                      <Label>Write a review <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Textarea
                        placeholder="Tell us about your experience..."
                        rows={3}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gradient-primary text-primary-foreground"
                        disabled={rating === 0 || submittingReview}
                        onClick={handleSubmitReview}
                      >
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </Button>
                      <Button   onClick={() => setReviewBookingId(null)}>Cancel</Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={b.id} className="rounded-xl border bg-card p-5 shadow-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{b.technician?.full_name || "Technician"}</p>
                      <p className="text-xs text-muted-foreground">{b.description}</p>
                      {repair && (
                        <p className="text-xs text-muted-foreground">Amount: ₹{Number(repair.total_amount).toLocaleString()}</p>
                      )}
                    </div>
                    {reviewed ? (
                      <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Reviewed
                      </span>
                    ) : (
                      <Button
                         
                        className="gradient-primary text-primary-foreground"
                        onClick={() => {
                          setReviewBookingId(b.id);
                          setReviewTechId(b.technician_id);
                          setReviewTechName(b.technician?.full_name || "Technician");
                          setRating(0);
                          setReviewComment("");
                        }}
                      >
                        <MessageSquare className="mr-1 h-3 w-3" /> Rate
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {/* Claims Tab */}
      {tab === "claims" && (
        <CustomerClaimsTab bookings={bookings} userId={user!.id} />
      )}

      {/* Wallet Tab */}
      {tab === "wallet" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-card space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Pending Refund
            </h2>
            <p className="text-3xl font-bold">₹{Number(profile?.pending_refund || 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              This is the total refund amount from approved claims. Refunds are processed at the end of each billing cycle.
            </p>
            <span className="inline-block text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full font-medium">
              Paid at end of cycle
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
