import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, UserCheck, Wrench, ArrowLeft, Loader2, Phone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";

type SignupStep = "details" | "otp" | "password";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get("role") as "customer" | "technician") || null;
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const [role, setRole] = useState<"customer" | "technician" | null>(initialRole);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });

  // OTP state
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [otpValue, setOtpValue] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  // Step 1: Role selection
  if (!role) {
    return (
      <div className="container py-16 max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Shield className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold">Join <span className="text-gradient">FixSure</span></h1>
          <p className="text-muted-foreground">How would you like to use FixSure?</p>
        </div>
        <div className="grid gap-4">
          <button
            onClick={() => setRole("customer")}
            className="rounded-xl border-2 border-transparent bg-card p-6 shadow-card hover:border-primary hover:shadow-card-hover transition-all text-left space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Get Services</p>
                <p className="text-sm text-muted-foreground">Find trusted technicians for your repairs</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setRole("technician")}
            className="rounded-xl border-2 border-transparent bg-card p-6 shadow-card hover:border-primary hover:shadow-card-hover transition-all text-left space-y-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Offer Services</p>
                <p className="text-sm text-muted-foreground">Join as a technician and grow your business</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const handleSendOtp = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setOtpSending(true);

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(otp);

    // Store OTP in database
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabase.from("otp_verifications" as any).insert({
      phone: form.phone,
      otp_code: otp,
      expires_at: expiresAt,
    });

    setOtpSending(false);
    setSignupStep("otp");

    // Simulated: show OTP in toast
    toast({
      title: "📱 OTP Sent (Simulated)",
      description: `Your verification code is: ${otp}`,
    });
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast({ title: "Please enter the 6-digit OTP", variant: "destructive" });
      return;
    }

    // Verify OTP from database
    const { data } = await supabase
      .from("otp_verifications" as any)
      .select("*")
      .eq("phone", form.phone)
      .eq("otp_code", otpValue)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data || (data as any[]).length === 0) {
      toast({ title: "Invalid or expired OTP", description: "Please try again.", variant: "destructive" });
      return;
    }

    // Mark OTP as verified
    await supabase
      .from("otp_verifications" as any)
      .update({ verified: true })
      .eq("id", (data as any[])[0].id);

    toast({ title: "✅ Phone verified!" });
    setSignupStep("password");
  };

  const handleResendOtp = async () => {
    setOtpValue("");
    await handleSendOtp();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      const { error } = await signUp(form.email, form.password, form.fullName, role, form.phone);
      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      } else {
        // Mark phone as verified in profile (will be set after profile is created by trigger)
        setTimeout(async () => {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from("profiles").update({ phone_verified: true } as any).eq("id", newUser.id);
          }
        }, 1000);
        toast({ title: "Account created!", description: "You're now signed in." });
        navigate(role === "technician" ? "/onboarding" : "/customer-dashboard");
      }
    } else {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        // Login security notification
        const { data: { user: loggedInUser } } = await supabase.auth.getUser();
        if (loggedInUser) {
          const now = new Date().toLocaleString();
          await createNotification(
            loggedInUser.id,
            "🔒 New Login Detected",
            `A new login was detected on your account at ${now}. If this wasn't you, please change your password immediately.`,
            "security"
          );
        }
        navigate(role === "technician" ? "/technician-dashboard" : "/customer-dashboard");
      }
    }
    setLoading(false);
  };

  // OTP Verification Screen
  if (mode === "signup" && signupStep === "otp") {
    return (
      <div className="container py-16 max-w-md space-y-8">
        <button onClick={() => setSignupStep("details")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verify Phone Number</h1>
          <p className="text-muted-foreground text-sm">
            Enter the 6-digit code sent to <strong>{form.phone}</strong>
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-card space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerifyOtp}
             
            className="w-full gradient-primary text-primary-foreground"
            disabled={otpValue.length !== 6}
          >
            Verify & Continue
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            <button type="button" onClick={handleResendOtp} className="text-primary font-medium hover:underline">
              Resend OTP
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-16 max-w-md space-y-8">
      <button onClick={() => { setRole(null); setSignupStep("details"); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
          {role === "customer" ? <UserCheck className="h-6 w-6 text-primary" /> : <Wrench className="h-6 w-6 text-primary" />}
        </div>
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Welcome Back" : signupStep === "password" ? "Set Password" : "Create Account"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {role === "customer" ? "Get trusted repair services" : "Manage your repair business"}
        </p>
      </div>

      {/* Signup Step 1: Details */}
      {mode === "signup" && signupStep === "details" && (
        <div className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input required placeholder="Enter your full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input required placeholder="e.g. +91 98765 43210" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <Button
            onClick={handleSendOtp}
             
            className="w-full gradient-primary text-primary-foreground"
            disabled={otpSending || !form.fullName || !form.email || !form.phone}
          >
            {otpSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</> : "Continue — Verify Phone"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
              Sign in
            </button>
          </p>
        </div>
      )}

      {/* Signup Step 3: Password */}
      {mode === "signup" && signupStep === "password" && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <div className="rounded-lg bg-accent/30 p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Name:</span> {form.fullName}</p>
            <p><span className="text-muted-foreground">Email:</span> {form.email}</p>
            <p><span className="text-muted-foreground">Phone:</span> {form.phone} <span className="text-primary font-medium">✓ Verified</span></p>
          </div>
          <div className="space-y-2">
            <Label>Create Password</Label>
            <Input required type="password" placeholder="Min 6 characters" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <Button type="submit"   className="w-full gradient-primary text-primary-foreground" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      )}

      {/* Login Form */}
      {mode === "login" && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-card space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input required type="password" placeholder="Min 6 characters" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <Button type="submit"   className="w-full gradient-primary text-primary-foreground" disabled={loading}>
            {loading ? "Please wait..." : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button type="button" onClick={() => { setMode("signup"); setSignupStep("details"); }} className="text-primary font-medium hover:underline">
              Sign up
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
