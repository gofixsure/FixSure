import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, MessageCircle, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useMessageStore } from "@/store/messageStore";

export default function WhatsAppSim() {
  const [reviewed, setReviewed] = useState(false);
  const [followUp, setFollowUp] = useState<null | "yes" | "no">(null);
  const messages = useMessageStore((s) => s.messages);

  return (
    <div className="container py-10 max-w-md space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">WhatsApp <span className="text-gradient">Simulation</span></h1>
        <p className="text-sm text-muted-foreground">Simulated customer messages</p>
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        {/* Chat header */}
        <div className="gradient-primary px-4 py-3 flex items-center gap-2 text-primary-foreground">
          <MessageCircle className="h-5 w-5" />
          <span className="font-semibold text-sm">FixSure</span>
        </div>

        <div className="p-4 space-y-4 bg-muted/30 min-h-[300px]">
          {/* Dynamic messages from bookings */}
          {messages.length > 0 && messages.map((msg) => (
            <div key={msg.id} className={`rounded-xl p-4 shadow-card space-y-2 max-w-[85%] ${
              msg.sender === "fixsure" ? "bg-card" : "bg-accent/50 ml-auto text-right"
            }`}>
              {msg.sender === "fixsure" && (
                <p className="text-sm font-medium flex items-center gap-1">
                  <Shield className="h-4 w-4 text-primary" /> FixSure
                </p>
              )}
              <div className="text-sm whitespace-pre-line">{msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}</div>
              <p className="text-xs text-muted-foreground">{msg.timestamp.toLocaleTimeString()}</p>
            </div>
          ))}

          {/* Empty state when no messages */}
          {messages.length === 0 && !reviewed && (
            <>
              {/* Default demo message */}
              <div className="bg-card rounded-xl p-4 shadow-card space-y-2 max-w-[85%]">
                <p className="text-sm font-medium flex items-center gap-1"><Shield className="h-4 w-4 text-primary" /> FixSure</p>
                <p className="text-sm">Your repair with <strong>Ramesh Kumar</strong> is protected by FixSure.</p>
                <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
                  <p>📱 Repair: Mobile Screen Replacement</p>
                  <p>💰 Price: ₹1,500</p>
                  <p>🛡️ Coverage: 15 days</p>
                </div>
              </div>

              {/* Review request */}
              <div className="bg-card rounded-xl p-4 shadow-card space-y-3 max-w-[85%]">
                <p className="text-sm">How was your repair experience? Tap below to leave a review:</p>
                <Link to="/review?tech=1">
                  <Button   className="gradient-primary text-primary-foreground text-xs w-full" onClick={() => setReviewed(true)}>
                    ⭐ Rate & Review
                  </Button>
                </Link>
              </div>
            </>
          )}

          {reviewed && (
            <>
              <div className="bg-accent/50 rounded-xl p-3 text-sm max-w-[60%] ml-auto text-right">
                👍 Good
              </div>

              <div className="text-center text-xs text-muted-foreground py-2">— 7 days later —</div>

              <div className="bg-card rounded-xl p-4 shadow-card space-y-3 max-w-[85%]">
                <p className="text-sm">Is your repair still working properly?</p>
                {followUp === null ? (
                  <div className="flex gap-2">
                    <Button     onClick={() => setFollowUp("yes")} className="text-xs">✅ YES</Button>
                    <Button     onClick={() => setFollowUp("no")} className="text-xs">❌ NO</Button>
                  </div>
                ) : followUp === "yes" ? (
                  <p className="text-sm text-success font-medium">Great! Your FixSure coverage was a success. 🎉</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">Sorry to hear that. You can file a claim.</p>
                    <Link to="/claim">
                      <Button   className="gradient-primary text-primary-foreground text-xs">Submit Claim</Button>
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Hint when no dynamic messages */}
          {messages.length === 0 && (
            <div className="text-center pt-4">
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
                <Inbox className="h-3 w-3" />
                Book a repair & accept it to see live messages here
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
