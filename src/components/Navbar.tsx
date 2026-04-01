import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, Menu, X, LogOut, User, Settings, ChevronDown, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QRCodeSVG } from "qrcode.react";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const { user, profile, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dashboardPath = profile?.role === "admin"
    ? "/admin"
    : profile?.role === "technician"
    ? "/technician-dashboard"
    : "/customer-dashboard";

  const navItems = user
    ? [
        { label: "Dashboard", path: dashboardPath },
        ...(profile?.role === "customer"
          ? [{ label: "Find Technician", path: "/search" }]
          : []),
        ...(profile?.role === "technician"
          ? [
              { label: "Log Repair", path: "/repair-log" },
              { label: "Notifications", path: "/notifications" },
            ]
          : []),
      ]
    : [
        { label: "Home", path: "/" },
        { label: "Find Technician", path: "/search" },
      ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleSignOut = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate("/");
  };

  const profileUrl = user ? `${window.location.origin}/technician/${user.id}` : "";

  return (
    < >
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to={user ? dashboardPath : "/"} className="flex items-center gap-2">
  <img src="/favicon.ico" alt="FixSure" className="h-8 w-8" />
  <span className="font-bold text-xl">FixSure</span>
</Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-muted transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-card shadow-lg py-2 animate-fade-in z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                        {profile?.role}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <User className="h-4 w-4" /> Edit Profile
                    </Link>
                    {profile?.role === "technician" && (
                      <button
                        onClick={() => { setProfileOpen(false); setShowQr(true); }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                      >
                        <QrCode className="h-4 w-4" /> My QR Code
                      </button>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth">
                <Button   className="ml-1 gradient-primary text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link to="/profile" className="p-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
            <button className="p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 pb-4 animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground"
                >
                  Edit Profile
                </Link>
                {profile?.role === "technician" && (
                  <button
                    onClick={() => { setMobileOpen(false); setShowQr(true); }}
                    className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground"
                  >
                    My QR Code
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-destructive"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="block px-4 py-3">
                <Button   className="w-full gradient-primary text-primary-foreground">Get Started</Button>
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* QR Code Modal */}
      {showQr && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowQr(false)}>
          <div className="bg-card rounded-2xl border shadow-lg p-8 max-w-sm w-full mx-4 text-center space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Your <span className="text-gradient">FixSure</span> QR Code</h2>
            <p className="text-sm text-muted-foreground">Display this in your shop so customers can scan and book repairs</p>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl" id="navbar-qr">
                <QRCodeSVG value={profileUrl} size={180} level="H" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground break-all">{profileUrl}</p>
            <div className="flex gap-2">
              <Button
                className="flex-1 gradient-primary text-primary-foreground"
                onClick={() => {
                  const svg = document.querySelector("#navbar-qr svg") as SVGSVGElement;
                  if (!svg) return;
                  const canvas = document.createElement("canvas");
                  canvas.width = 400; canvas.height = 400;
                  const ctx = canvas.getContext("2d")!;
                  const svgData = new XMLSerializer().serializeToString(svg);
                  const img = new Image();
                  img.onload = () => {
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, 400, 400);
                    ctx.drawImage(img, 10, 10, 380, 380);
                    const a = document.createElement("a");
                    a.download = "fixsure-qr.png";
                    a.href = canvas.toDataURL("image/png");
                    a.click();
                  };
                  img.src = "data:image/svg+xml;base64," + btoa(svgData);
                }}
              >
                Download QR
              </Button>
              <Button 
                className="border px-3 py-1 rounded"
                onClick={() => setShowQr(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
