import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { initializeStorage } from "@/lib/storage";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ClinicSettings from "@/pages/ClinicSettings";
import DoctorsManagement from "@/pages/DoctorsManagement";
import TreatmentsSetup from "@/pages/TreatmentsSetup";
import PatientsList from "@/pages/PatientsList";
import PatientProfile from "@/pages/PatientProfile";
import TreatmentSessionsPage from "@/pages/TreatmentSessionsPage";
import Appointments from "@/pages/Appointments";
import StaffManagement from "@/pages/StaffManagement";
import InvoicesPage from "@/pages/Invoices";
import PaymentsPage from "@/pages/PaymentsPage";
import ExpensesPage from "@/pages/Expenses";
import DoctorAccounting from "@/pages/DoctorAccounting";
import RevenueReport from "@/pages/RevenueReport";
import LabSettings from "@/pages/LabSettings";
import LabOrders from "@/pages/LabOrders";
import LabFinancials from "@/pages/LabFinancials";
import SharePatientView from "@/pages/SharePatientView";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initializeStorage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
              <Route path="/patients" element={<PatientsList />} />
              <Route path="/patients/:id" element={<PatientProfile />} />
                <Route path="/patients/:id/treatments/:treatmentId/sessions" element={<TreatmentSessionsPage />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/settings/clinic" element={<ClinicSettings />} />
              <Route path="/settings/treatments" element={<TreatmentsSetup />} />
              <Route path="/settings/doctors" element={<DoctorsManagement />} />
              <Route path="/settings/staff" element={<StaffManagement />} />
              <Route path="/finance/invoices" element={<InvoicesPage />} />
              <Route path="/finance/payments" element={<PaymentsPage />} />
              <Route path="/finance/expenses" element={<ExpensesPage />} />
              <Route path="/finance/doctor-accounting" element={<DoctorAccounting />} />
              <Route path="/finance/reports" element={<RevenueReport />} />
              <Route path="/labs/settings" element={<LabSettings />} />
              <Route path="/labs/orders" element={<LabOrders />} />
                <Route path="/labs/financials" element={<LabFinancials />} />
              </Route>
            </Route>
            <Route path="/share/patient/:token" element={<SharePatientView />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
