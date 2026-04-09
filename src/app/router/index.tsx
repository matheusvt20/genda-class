import { Navigate, Outlet, useRoutes } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { AuthLayout } from "@/app/layouts/AuthLayout";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { DepositPage } from "@/features/classes/pages/DepositPage";
import { EnrollmentFormPage } from "@/features/classes/pages/EnrollmentFormPage";
import { PublicAttendancePage } from "@/features/classes/pages/PublicAttendancePage";
import { SalesPage } from "@/features/classes/pages/SalesPage";
import { CalendarPage } from "@/features/calendar/pages/CalendarPage";
import { ClassDetailPage } from "@/features/classes/pages/ClassDetailPage";
import { ClassesPage } from "@/features/classes/pages/ClassesPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { FinancePage } from "@/features/finance/pages/FinancePage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { StudentDetailPage } from "@/features/students/pages/StudentDetailPage";
import { StudentsPage } from "@/features/students/pages/StudentsPage";
import { SalesLandingPage } from "@/pages/SalesLandingPage";

function RotaProtegida() {
  const { user, carregando } = useAuth();

  if (carregando) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RedirecionarSeAutenticada() {
  const { user, carregando } = useAuth();

  if (carregando) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function AppRouter() {
  return useRoutes([
    {
      path: "/presenca/:token",
      element: <PublicAttendancePage />,
    },
    {
      path: "/curso/:slug",
      element: <SalesPage />,
    },
    {
      path: "/curso/:slug/inscricao",
      element: <EnrollmentFormPage />,
    },
    {
      path: "/curso/:slug/sinal",
      element: <DepositPage />,
    },
    {
      path: "/pv",
      element: <SalesLandingPage />,
    },
    {
      element: <RedirecionarSeAutenticada />,
      children: [
        {
          element: <AuthLayout />,
          children: [
            { path: "/login", element: <LoginPage /> },
            { path: "/cadastro", element: <RegisterPage /> },
            { path: "/esqueci-senha", element: <ForgotPasswordPage /> },
          ],
        },
      ],
    },
    {
      element: <RotaProtegida />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: "/", element: <Navigate to="/dashboard" replace /> },
            { path: "/dashboard", element: <DashboardPage /> },
            { path: "/calendario", element: <CalendarPage /> },
            { path: "/turmas", element: <ClassesPage /> },
            { path: "/turmas/:id", element: <ClassDetailPage /> },
            { path: "/alunas", element: <StudentsPage /> },
            { path: "/alunas/:id", element: <StudentDetailPage /> },
            { path: "/financeiro", element: <FinancePage /> },
            { path: "/configuracoes", element: <SettingsPage /> },
          ],
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/dashboard" replace />,
    },
  ]);
}
