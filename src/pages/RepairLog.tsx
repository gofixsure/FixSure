import { useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, CheckCircle, Info, User, Phone, Wrench, Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const PLATFORM_FEE_RATE = 0.10;

export default function RepairLog() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const customerName = searchParams.get("customer") || "";
  const phone = searchParams.get("phone") || "";
  const description = searchParams.get("desc") || "";
  const bookingId = searchParams.get("booking") || "";
  const hasCustomerInfo = !!(customerName && phone);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerName,
    phone,
    category: "",
    price: "",
    repairDescription: "",
    otherCategory: "",
  });
  const [damagePhoto, setDamagePhoto] = useState<string | null>(null);

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth?role=technician" replace />;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setDamagePhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const repairPrice = parseFloat(form.price) || 0;
  const fixSureFee = Math.round(repairPrice * PLATFORM_FEE_RATE);
  const totalAmount = repairPrice + fixSureFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Upload damage photo if present
    let damagePhotoUrl: string | null = null;
    if (damagePhoto) {
      const fileName = `${user.id}/${Date.now()}.jpg`;
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

    const category = form.category === "Other" ? form.otherCategory : form.category;

    const { error } = await supabase.from("repairs").insert({
      technician_id: user.id,
      customer_name: form.customerName,
      customer_phone: form.phone,
      category,
      price: repairPrice,
      fixsure_fee: fixSureFee,
      total_amount: totalAmount,
      repair_description: form.repairDescription,
      damage_photo_url: damagePhotoUrl,
      booking_id: bookingId || null,
      status: "active",
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Failed to log repair", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "✅ Repair logged!", description: "FixSure coverage is now active." });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container py-16 max-w-md text-center space-y-6 animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Repair Confirmed!</h1>
        <p className="text-muted-foreground">FixSure coverage is now active. The customer will receive a WhatsApp confirmation.</p>

        <div className="rounded-xl border bg-card p-5 shadow-card text-left space-y-2 text-sm">
          <p><span className="text-muted-foreground">Customer:</span> {form.customerName}</p>
          <p><span className="text-muted-foreground">Phone:</span> {form.phone}</p>
          <p><span className="text-muted-foreground">Repair:</span> {form.category === "Other" ? form.otherCategory : form.category}</p>
          <p><span className="text-muted-foreground">Repair Cost:</span> ₹{repairPrice.toLocaleString()}</p>
          <p><span className="text-muted-foreground">FixSure Fee (10%):</span> ₹{fixSureFee.toLocaleString()}</p>
          <div className="border-t pt-2 mt-2">
            <p className="font-semibold text-base">Total: ₹{totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <Button   onClick={() => {
          setSubmitted(false);
          setForm({ customerName: "", phone: "", category: "", price: "", repairDescription: "", otherCategory: "" });
          setDamagePhoto(null);
        }}>
          Log Another Repair
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-lg space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Confirm <span className="text-gradient">Repair</span></h1>
        <p className="text-muted-foreground">Fill in the repair details to activate FixSure coverage</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-8 shadow-card space-y-5">
        {hasCustomerInfo && (
          <div className="rounded-lg bg-muted/50 border p-4 space-y-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Customer Details (from booking)</p>
            <p className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {customerName}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> {phone}</p>
            {description && <p className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> {description}</p>}
          </div>
        )}

        {!hasCustomerInfo && (
          <>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input required placeholder="Enter customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone Number</Label>
              <Input required placeholder="+91 9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label>Repair Category</Label>
          <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            <option value="">Select category</option>
            <option>Mobile Screen Repair</option>
            <option>Battery Replacement</option>
            <option>Laptop Repair</option>
            <option>Tablet Repair</option>
            <option>Electronics Repair</option>
            <option>Other</option>
          </select>
          {form.category === "Other" && (
            <Textarea required placeholder="Please specify the repair domain..." rows={2} value={form.otherCategory} onChange={(e) => setForm({ ...form, otherCategory: e.target.value })} className="mt-2" />
          )}
        </div>
        <div className="space-y-2">
          <Label>Repair Amount (₹)</Label>
          <Input required type="number" min="1" placeholder="e.g. 1500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Short Description of Repair</Label>
          <Textarea required placeholder="e.g. Cracked screen top-right corner, touch not working..." rows={3} value={form.repairDescription} onChange={(e) => setForm({ ...form, repairDescription: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Photo of Damage</Label>
          {!damagePhoto ? (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-6 cursor-pointer hover:border-primary/50 transition-colors">
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tap to upload a photo</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            </label>
          ) : (
            <div className="relative rounded-lg overflow-hidden border">
              <img src={damagePhoto} alt="Damage photo" className="w-full h-48 object-cover" />
              <Button type="button"     className="absolute top-2 right-2 h-7 w-7" onClick={() => setDamagePhoto(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {repairPrice > 0 && (
          <div className="rounded-lg bg-accent/50 border p-4 space-y-2 text-sm animate-fade-in">
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
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total Amount</span>
              <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}

        <Button type="submit"   className="w-full gradient-primary text-primary-foreground" disabled={submitting}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging...</> : <><Shield className="mr-2 h-4 w-4" /> Activate FixSure Coverage</>}
        </Button>
      </form>
    </div>
  );
}
