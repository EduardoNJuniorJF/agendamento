import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import CalendarView from "./pages/CalendarView";
import Fleet from "./pages/Fleet";
import Team from "./pages/Team";
import NewAppointment from "./pages/NewAppointment";
import Vacations from "./pages/Vacations";
import Auth from "./pages/Auth";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Layout><CalendarView /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/fleet"
              element={
                <ProtectedRoute>
                  <Layout><Fleet /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <Layout><Team /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vacations"
              element={
                <ProtectedRoute>
                  <Layout><Vacations /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/new-appointment"
              element={
                <ProtectedRoute>
                  <Layout><NewAppointment /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <Layout><ChangePassword /></Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
