import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import TeamPage from "./pages/TeamPage";
import MinePage from "./pages/MinePage";
import CheckInPage from "./pages/CheckInPage";
import TaskCenterPage from "./pages/TaskCenterPage";
import RechargePage from "./pages/RechargePage";
import RechargeStatusPage from "./pages/RechargeStatusPage";
import WithdrawPage from "./pages/WithdrawPage";
import WithdrawStatusPage from "./pages/WithdrawStatusPage";
import BindCardPage from "./pages/BindCardPage";
import RecordsPage from "./pages/RecordsPage";
import CustomerServicePage from "./pages/CustomerServicePage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import RegulationPage from "./pages/RegulationPage";
import AdminPage from "./pages/AdminPage";
import RedeemGiftPage from "./pages/RedeemGiftPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/product" element={<ProductPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/mine" element={<MinePage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/tasks" element={<TaskCenterPage />} />
          <Route path="/recharge" element={<RechargePage />} />
          <Route path="/recharge-status" element={<RechargeStatusPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/withdraw-status" element={<WithdrawStatusPage />} />
          <Route path="/bind-card" element={<BindCardPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/customer-service" element={<CustomerServicePage />} />
          <Route path="/edit-profile" element={<ProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/regulation" element={<RegulationPage />} />
          <Route path="/redeem" element={<RedeemGiftPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;