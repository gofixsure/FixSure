import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Upload, MapPin, Star, Wrench, ShieldCheck, Camera, X, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const repairCategories = [
  "Mobile Phones",
  "Smartphones",
  "Laptops",
  "Tablets",
  "Home Electronics",
  "Accessories",
];

const experienceOptions = [
  { label: "1–2 years", years: 2 },
  { label: "3–5 years", years: 5 },
  { label: "5–10 years", years: 10 },
  { label: "10+ years", years: 15 },
];

interface FormData {
  shopName: string;
  shopAddress: string;
  city: string;
  mapsLink: string;
  altPhone: string;
  categories: string[];
  experienceYears: number;
  experienceLabel: string;
  agreed: boolean;
}

const initialForm: FormData = {
  shopName: "",
  shopAddress: "",
  city: "",
  mapsLink: "",
  altPhone: "",
  categories: [],
  experienceYears: 0,
  experienceLabel: "",
  agreed: false,
};

async function uploadFile(userId: string, file: File, folder: string): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${folder}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("technician-uploads").upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from("technician-uploads").getPublicUrl(path);
  return data.publicUrl;
}

export default function TechnicianOnboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [shopFile, setShopFile] = useState<File | null>(null);
  const [shopPreview, setShopPreview] = useState<string | null>(null);

  const handleFileSelect = (
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearFile = (
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => () => {
    setFile(null);
    setPreview(null);
  };

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || form.categories.length === 0) return;

    setSaving(true);
    try {
      // Upload files in parallel
      const [idUrl, selfieUrl, shopUrl] = await Promise.all([
        idFile ? uploadFile(user.id, idFile, "id_proof") : Promise.resolve(null),
        selfieFile ? uploadFile(user.id, selfieFile, "selfie") : Promise.resolve(null),
        shopFile ? uploadFile(user.id, shopFile, "shop") : Promise.resolve(null),
      ]);

      // Update profiles table (city, altPhone)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ city: form.city })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update technician_profiles
      const { error: techError } = await supabase
        .from("technician_profiles")
        .update({
          shop_name: form.shopName,
          shop_address: form.shopAddress,
          maps_link: form.mapsLink,
          alt_phone: form.altPhone,
          category: form.categories.join(", "),
          experience_years: form.experienceYears,
          id_proof_url: idUrl || "",
          selfie_url: selfieUrl || "",
          shop_photo_url: shopUrl || "",
          reliability_score: 0,
        })
        .eq("id", user.id);

      if (techError) throw techError;

      await refreshProfile();
      setSubmitted(true);
      toast({ title: "Profile created!", description: "Your technician profile is now live." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container py-12 max-w-lg text-center space-y-4">
        <h1 className="text-2xl font-bold">Please sign in first</h1>
        <p className="text-muted-foreground">You need to be logged in as a technician to complete onboarding.</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container py-12 max-w-lg space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to FixSure!</h1>
          <p className="text-muted-foreground">Your technician profile has been created and saved.</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{profile?.full_name}</h2>
              <p className="text-sm text-muted-foreground">{form.shopName}</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium bg-accent text-accent-foreground px-2 py-1 rounded-full">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{form.shopAddress}, {form.city}</p>
            <p className="flex items-center gap-2"><Star className="h-4 w-4" />{form.experienceLabel} experience</p>
            <p className="flex items-center gap-2"><Wrench className="h-4 w-4" />{form.categories.join(", ")}</p>
          </div>

          <div className="rounded-lg gradient-primary p-4 text-primary-foreground text-center space-y-1">
            <p className="text-xs font-medium opacity-90">Reliability Score</p>
            <p className="text-4xl font-extrabold">0%</p>
            <p className="text-xs opacity-75">Complete repairs to build your score</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-8 shadow-card text-center space-y-4">
          <h3 className="font-semibold">Your FixSure QR Code</h3>
          <div className="qr-container inline-block p-4 bg-white rounded-xl">
            <QRCodeSVG
              value={`${window.location.origin}/technician/${user?.id}`}
              size={160}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Place this FixSure QR code at your shop so customers can scan it and view your FixSure profile.
          </p>
          <Button
             
             
            onClick={() => {
              const svg = document.querySelector('.qr-container svg');
              if (!svg) return;
              const svgData = new XMLSerializer().serializeToString(svg);
              const canvas = document.createElement('canvas');
              canvas.width = 320; canvas.height = 320;
              const ctx = canvas.getContext('2d');
              const img = new Image();
              img.onload = () => {
                ctx?.drawImage(img, 0, 0, 320, 320);
                const a = document.createElement('a');
                a.download = 'fixsure-qr.png';
                a.href = canvas.toDataURL('image/png');
                a.click();
              };
              img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
            }}
          >
            Download QR Code
          </Button>
        </div>

        <Button className="w-full" onClick={() => navigate("/technician-dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-lg space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Join <span className="text-gradient">FixSure</span></h1>
        <p className="text-muted-foreground">Complete the form to create your verified technician profile</p>
        {profile?.full_name && (
          <p className="text-sm text-muted-foreground">Signed in as <strong>{profile.full_name}</strong></p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Shop Details */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
            Shop Details
          </h3>
          <div className="space-y-2">
            <Label>Shop Name <span className="text-destructive">*</span></Label>
            <Input required placeholder="e.g. Ramesh Mobile Repair" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Shop Address <span className="text-destructive">*</span></Label>
            <Input required placeholder="Full shop address" value={form.shopAddress} onChange={(e) => setForm({ ...form, shopAddress: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>City <span className="text-destructive">*</span></Label>
            <Input required placeholder="e.g. Hyderabad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Google Maps Link <span className="text-destructive">*</span></Label>
            <Input required placeholder="Paste Google Maps URL" value={form.mapsLink} onChange={(e) => setForm({ ...form, mapsLink: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Alternate Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input placeholder="+91 9876543210" value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} />
          </div>
        </div>

        {/* Section 2: Repair Specialization */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
            Repair Specialization
          </h3>
          <Label>Repair Categories <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground">Select all that apply</p>
          <div className="grid grid-cols-2 gap-3">
            {repairCategories.map((cat) => (
              <label
                key={cat}
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors text-sm ${
                  form.categories.includes(cat) ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
              >
                <Checkbox
                  checked={form.categories.includes(cat)}
                  onCheckedChange={() => toggleCategory(cat)}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        {/* Section 3: Experience */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
            Experience
          </h3>
          <Label>Years of Repair Experience <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 gap-3">
            {experienceOptions.map((opt) => (
              <label
                key={opt.label}
                className={`flex items-center justify-center rounded-lg border p-3 cursor-pointer transition-colors text-sm font-medium ${
                  form.experienceLabel === opt.label ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="experience"
                  value={opt.label}
                  checked={form.experienceLabel === opt.label}
                  onChange={() => setForm({ ...form, experienceLabel: opt.label, experienceYears: opt.years })}
                  className="sr-only"
                  required
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Section 4: ID Verification */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
            ID Verification
          </h3>
          <p className="text-xs text-muted-foreground">Upload a government-issued ID for basic trust verification</p>

          <div className="space-y-3">
            <Label>Upload ID Proof (Aadhar / PAN / Driving License) <span className="text-destructive">*</span></Label>
            {!idPreview ? (
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-5 cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload ID proof</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect(setIdFile, setIdPreview)} />
              </label>
            ) : (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={idPreview} alt="ID proof" className="w-full h-40 object-cover" />
                <Button type="button"     className="absolute top-2 right-2 h-7 w-7" onClick={clearFile(setIdFile, setIdPreview)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Selfie Photo <span className="text-destructive">*</span></Label>
            {!selfiePreview ? (
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-5 cursor-pointer hover:border-primary/50 transition-colors">
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to take / upload selfie</span>
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileSelect(setSelfieFile, setSelfiePreview)} />
              </label>
            ) : (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={selfiePreview} alt="Selfie" className="w-full h-40 object-cover" />
                <Button type="button"     className="absolute top-2 right-2 h-7 w-7" onClick={clearFile(setSelfieFile, setSelfiePreview)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Shop Proof */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
            Shop Proof <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
          </h3>
          {!shopPreview ? (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-5 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload a photo of your shop</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect(setShopFile, setShopPreview)} />
            </label>
          ) : (
            <div className="relative rounded-lg overflow-hidden border">
              <img src={shopPreview} alt="Shop photo" className="w-full h-40 object-cover" />
              <Button type="button"     className="absolute top-2 right-2 h-7 w-7" onClick={clearFile(setShopFile, setShopPreview)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Section 6: Agreement */}
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={form.agreed}
              onCheckedChange={(checked) => setForm({ ...form, agreed: checked === true })}
              className="mt-0.5"
            />
            <span className="text-sm">
              I agree to follow FixSure repair protection rules and provide honest service to customers.
              <span className="text-destructive"> *</span>
            </span>
          </label>
        </div>

        <Button
          type="submit"
           
          className="w-full gradient-primary text-primary-foreground"
          disabled={saving || !form.agreed || form.categories.length === 0 || !form.experienceLabel}
        >
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Join FixSure"}
        </Button>
      </form>
    </div>
  );
}
