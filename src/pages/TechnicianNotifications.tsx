import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Clock, CheckCircle, XCircle, User, Phone, Wrench,
  Camera, X, Info, Shield, Loader2, Send
} from "lucide-react";

interface BookingWithCustomer {
  id: string;
  description: string;
  status: string;
  created_at: string;
  customer_id: string;
  customer: {
    full_name: string;
    phone: string | null;
  } | null;
}

const PLATFORM_FEE_RATE = 0.10;

export default function TechnicianNotifications() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Repair detail form state per booking
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [repairForm, setRepairForm] = useState({
    category: "",
    price: "",
    repairDescription: "",
    otherCategory: "",
  });
  const [damagePhoto, setDamagePhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, description, status, created_at, customer_id, customer:profiles!bookings_customer_id_fkey(full_name, phone)")
        .eq("technician_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setBookings(data as BookingWithCustomer[]);
      setDataLoading(false);
    };
    fetchBookings();
  }, [user]);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth?role=technician" replace />;

  const pending = bookings.filter((b) => b.status === "pending");
  const handled = bookings.filter((b) => b.status !== "pending");

  const handleDecline = async (id: string) => {
    await supabase.from("bookings").update({ status: "declined" }).eq("id", id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "declined" } : b)));
  };

  const handleAcceptClick = (bookingId: string) => {
    setActiveForm(bookingId);
    setRepairForm({ category: "", price: "", repairDescription: "", otherCategory: "" });
    setDamagePhoto(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDamagePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const repairPrice = parseFloat(repairForm.price) || 0;
  const fixSureFee = Math.round(repairPrice * PLATFORM_FEE_RATE);
  const totalAmount = repairPrice + fixSureFee;

  const handleConfirmRepair = async (booking: BookingWithCustomer) => {
    if (!repairForm.category || !repairForm.price) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // Upload damage photo if present
    let damagePhotoUrl: string | null = null;
    if (damagePhoto) {
      const fileName = `${user!.id}/${Date.now()}.jpg`;
      const base64 = damagePhoto.split(",")[1];
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { data: uploadData } = await supabase.storage
        .from("technician-uploads")
        .upload(fileName, byteArray, { contentType: "image/jpeg" });
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("technician-uploads")
          .getPublicUrl(uploadData.path);
        damagePhotoUrl = urlData.publicUrl;
      }
    }

    // Create repair record
    const { error: repairError } = await supabase.from("repairs").insert({
      technician_id: user!.id,
      booking_id: booking.id,
      customer_name: booking.customer?.full_name || "",
      customer_phone: booking.customer?.phone || "",
      category: repairForm.category === "Other" ? repairForm.otherCategory : repairForm.category,
      price: repairPrice,
      fixsure_fee: fixSureFee,
      total_amount: totalAmount,
      repair_description: repairForm.repairDescription,
      damage_photo_url: damagePhotoUrl,
      status: "active",
    });

    if (repairError) {
      toast({ title: "Failed to log repair", description: repairError.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Update booking status
    await supabase.from("bookings").update({ status: "accepted" }).eq("id", booking.id);

    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: "accepted" } : b)));
    setActiveForm(null);
    setSubmitting(false);

    toast({
      title: "✅ Repair Confirmed!",
      description: `WhatsApp notification sent to ${booking.customer?.full_name}. FixSure coverage is now active.`,
    });
  };

  return (
    <div className="container py-10 max-w-lg space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">Notifications</span>
        </h1>
        <p className="text-muted-foreground">Incoming repair booking requests</p>
      </div>

      {dataLoading && (
        <div className="text-center py-10">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!dataLoading && bookings.length === 0 && (
        <div className="rounded-xl border bg-card p-10 shadow-card text-center space-y-3">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No booking requests yet.</p>
          <p className="text-xs text-muted-foreground">
            When a customer books a repair from your profile or scans your QR code, the request will appear here.
          </p>
        </div>
      )}

      {/* Pending bookings */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Clock className="h-4 w-4" /> Pending Requests ({pending.length})
          </h2>
          {pending.map((booking) => (
            <div key={booking.id} className="rounded-xl border bg-card p-5 shadow-card space-y-4 animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {booking.customer?.full_name || "Customer"}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {booking.customer?.phone || "No phone"}
                  </p>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                  New
                </span>
              </div>
              <div className="text-sm text-muted-foreground flex items-start gap-2">
                <Wrench className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{booking.description || "No description provided"}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(booking.created_at).toLocaleString()}
              </p>

              {/* Repair Detail Form */}
              {activeForm === booking.id ? (
                <div className="border-t pt-4 space-y-4 animate-fade-in">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" /> Fill Repair Details
                  </h4>

                  <div className="space-y-2">
                    <Label>Repair Category</Label>
                    <select
                      required
                      value={repairForm.category}
                      onChange={(e) => setRepairForm({ ...repairForm, category: e.target.value })}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select category</option>
                      <option>Mobile Screen Repair</option>
                      <option>Battery Replacement</option>
                      <option>Laptop Repair</option>
                      <option>Tablet Repair</option>
                      <option>Electronics Repair</option>
                      <option>Other</option>
                    </select>
                    {repairForm.category === "Other" && (
                      <Textarea
                        placeholder="Specify repair type..."
                        rows={2}
                        value={repairForm.otherCategory}
                        onChange={(e) => setRepairForm({ ...repairForm, otherCategory: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea
                      placeholder="e.g. Cracked screen top-right, touch not working..."
                      rows={2}
                      value={repairForm.repairDescription}
                      onChange={(e) => setRepairForm({ ...repairForm, repairDescription: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Photo of Damage</Label>
                    {!damagePhoto ? (
                      <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-4 cursor-pointer hover:border-primary/50 transition-colors">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Tap to upload</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden border">
                        <img src={damagePhoto} alt="Damage" className="w-full h-32 object-cover" />
                        <Button type="button"     className="absolute top-2 right-2 h-6 w-6" onClick={() => setDamagePhoto(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Repair Amount (₹)</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 1500"
                      value={repairForm.price}
                      onChange={(e) => setRepairForm({ ...repairForm, price: e.target.value })}
                    />
                  </div>

                  {/* Price breakdown */}
                  {repairPrice > 0 && (
                    <div className="rounded-lg bg-accent/50 border p-3 space-y-1.5 text-sm animate-fade-in">
                      <div className="flex items-center gap-2 text-accent-foreground font-medium">
                        <Info className="h-4 w-4" /> Price Breakdown
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Repair Cost</span>
                        <span>₹{repairPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FixSure Platform + Coverage (10%)</span>
                        <span>₹{fixSureFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1.5 font-semibold">
                        <span>Total</span>
                        <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gradient-primary text-primary-foreground"
                      disabled={submitting || !repairForm.category || !repairForm.price}
                      onClick={() => handleConfirmRepair(booking)}
                    >
                      {submitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...</>
                      ) : (
                        <><Send className="mr-2 h-4 w-4" /> Confirm & Notify Customer</>
                      )}
                    </Button>
                    <Button   onClick={() => setActiveForm(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                     
                    className="flex-1 gradient-primary text-primary-foreground"
                    onClick={() => handleAcceptClick(booking.id)}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" /> Accept & Fill Details
                  </Button>
                  <Button
                     
                     
                    onClick={() => handleDecline(booking.id)}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Handled bookings */}
      {handled.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Previous Requests</h2>
          {handled.map((booking) => (
            <div key={booking.id} className="rounded-xl border bg-card p-4 shadow-card flex items-center justify-between opacity-70">
              <div>
                <p className="font-medium text-sm">{booking.customer?.full_name || "Customer"}</p>
                <p className="text-xs text-muted-foreground">{booking.description}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                booking.status === "accepted" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"
              }`}>
                {booking.status === "accepted" ? "Accepted" : "Declined"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
