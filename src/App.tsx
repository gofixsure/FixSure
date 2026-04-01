import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import TechnicianSearch from "./pages/TechnicianSearch";
import TechnicianProfile from "./pages/TechnicianProfile";
import TechnicianOnboarding from "./pages/TechnicianOnboarding";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import RepairLog from "./pages/RepairLog";
import WhatsAppSim from "./pages/WhatsAppSim";
import ClaimSubmission from "./pages/ClaimSubmission";
import AdminDashboard from "./pages/AdminDashboard";
import ReviewPage from "./pages/ReviewPage";
import TechnicianNotifications from "./pages/TechnicianNotifications";
import ProfileEdit from "./pages/ProfileEdit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/search" element={<TechnicianSearch />} />
            <Route path="/technician/:id" element={<TechnicianProfile />} />
            <Route path="/onboarding" element={<TechnicianOnboarding />} />
            <Route path="/repair-log" element={<RepairLog />} />
            <Route path="/whatsapp" element={<WhatsAppSim />} />
            <Route path="/claim" element={<ClaimSubmission />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/notifications" element={<TechnicianNotifications />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/profile" element={<ProfileEdit />} />
            <Route path="/customer-dashboard" element={<CustomerDashboard />} />
            <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
