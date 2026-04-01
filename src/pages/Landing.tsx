import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, UserCheck, Star, QrCode, Eye, Wrench, MessageCircle, AlertTriangle, XCircle, HelpCircle, Smartphone } from "lucide-react";

const problems = [
  { icon: HelpCircle, title: "Unknown reliability", desc: "Customers don't know which repair shops are reliable" },
  { icon: AlertTriangle, title: "Repairs fail quickly", desc: "Repairs sometimes fail after a few days" },
  { icon: XCircle, title: "No warranty", desc: "Local repairs usually have no warranty" },
];

const solutions = [
  { icon: UserCheck, title: "Verified Technicians", desc: "Technicians join FixSure and create a verified profile." },
  { icon: Shield, title: "Repair Protection", desc: "Repairs can include short-term FixSure protection." },
  { icon: Star, title: "Reliability Score", desc: "Technicians build trust through ratings and successful repairs." },
];

const steps = [
  { icon: QrCode, label: "Scan technician QR" },
  { icon: Eye, label: "View technician FixSure profile" },
  { icon: Wrench, label: "Get repair with FixSure protection" },
  { icon: MessageCircle, label: "Receive warranty confirmation & WhatsApp review" },
];

export default function Landing() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="container py-16 md:py-24 flex flex-col items-center text-center gap-8">
        <div className="space-y-6 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Trust Your Local Repairs with <span className="text-gradient">FixSure</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            FixSure helps you trust local repair technicians by providing repair protection, verified technician profiles, and reliability scores.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/auth?role=customer"><Button   className="gradient-primary text-primary-foreground">Get Services</Button></Link>
            <Link to="/auth?role=technician"><Button    >Offer Services</Button></Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-muted/50 py-16">
        <div className="container text-center space-y-10">
          <h2 className="text-3xl md:text-4xl font-bold">Repair Trust is <span className="text-gradient">Broken</span></h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {problems.map((p) => (
              <div key={p.title} className="bg-card rounded-xl p-6 shadow-card space-y-3 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <p.icon className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="container py-16 text-center space-y-10">
        <h2 className="text-3xl md:text-4xl font-bold">FixSure Builds <span className="text-gradient">Repair Trust</span></h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {solutions.map((s) => (
            <div key={s.title} className="rounded-xl border p-6 shadow-card hover:shadow-card-hover transition-shadow space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                <s.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-16">
        <div className="container text-center space-y-10">
          <h2 className="text-3xl md:text-4xl font-bold">How It <span className="text-gradient">Works</span></h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <div key={i} className="bg-card rounded-xl p-6 shadow-card space-y-3 relative">
                <div className="mx-auto w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {i + 1}
                </div>
                <s.icon className="mx-auto h-8 w-8 text-primary" />
                <p className="text-sm font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold">Ready to build <span className="text-gradient">repair trust</span>?</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/auth?role=customer"><Button   className="gradient-primary text-primary-foreground">Get Services</Button></Link>
          <Link to="/auth?role=technician"><Button    >Offer Services</Button></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 FixSure. Building trust in local repairs.</p>
      </footer>
    </div>
  );
}
