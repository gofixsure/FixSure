import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Claims are now handled in the Customer Dashboard's Claims tab
export default function ClaimSubmission() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="container py-16 text-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth?role=customer" replace />;

  // Redirect to customer dashboard claims tab
  return <Navigate to="/customer-dashboard" replace />;
}
