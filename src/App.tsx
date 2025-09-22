
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import NotificationManager from "./components/Notifications/NotificationManager";
import { lazy } from 'react';

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const TeamTasks = lazy(() => import("./pages/TeamTasks"));
const AssignedTasks = lazy(() => import("./pages/AssignedTasks"));
const SelfTasks = lazy(() => import("./pages/SelfTasks"));
const DailyJournal = lazy(() => import("./pages/DailyJournal"));
const Analytics = lazy(() => import("./pages/Analytics"));
const PaymentReminders = lazy(() => import("./pages/PaymentReminders"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App: React.FC = () => {
  // Create QueryClient inside component to ensure React context is available
  const queryClient = React.useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
      },
    },
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationManager />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="my-tasks" element={<MyTasks />} />
                  <Route path="team-tasks" element={<TeamTasks />} />
                  <Route path="assigned-tasks" element={<AssignedTasks />} />
                  <Route path="self-tasks" element={<SelfTasks />} />
                  <Route path="daily-journal" element={<DailyJournal />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="payment-reminders" element={<PaymentReminders />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
