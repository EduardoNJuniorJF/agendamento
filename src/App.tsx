import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import CalendarView from "./pages/CalendarView";
import Fleet from "./pages/Fleet";
import Team from "./pages/Team";
import NewAppointment from "./pages/NewAppointment";
import Vacations from "./pages/Vacations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/calendar" element={<Layout><CalendarView /></Layout>} />
          <Route path="/fleet" element={<Layout><Fleet /></Layout>} />
          <Route path="/team" element={<Layout><Team /></Layout>} />
          <Route path="/vacations" element={<Layout><Vacations /></Layout>} />
          <Route path="/new-appointment" element={<Layout><NewAppointment /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
