import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, CalendarDays, GraduationCap, Users, Wallet, Settings, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/core/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getActiveClassCount } from "@/features/classes/services/classes.service";
import { getStudentCount } from "@/features/students/services/students.service";

const itensMenu = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/turmas", label: "Turmas", icon: GraduationCap },
  { to: "/alunas", label: "Alunas", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppLayout() {
  const { perfil, sair, user, workspace } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [activeClassesCount, setActiveClassesCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  const nomeUsuario =
    perfil?.full_name?.trim() ||
    (typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "") ||
    "Usuária";

  useEffect(() => {
    if (!workspace?.id) {
      return;
    }

    let active = true;

    void (async () => {
      try {
        const [classesCount, studentsCount] = await Promise.all([
          getActiveClassCount(workspace.id),
          getStudentCount(workspace.id),
        ]);

        if (!active) {
          return;
        }

        setActiveClassesCount(classesCount);
        setStudentCount(studentsCount);
      } catch {
        if (!active) {
          return;
        }

        setActiveClassesCount(0);
        setStudentCount(0);
      }
    })();

    return () => {
      active = false;
    };
  }, [workspace?.id]);

  const turmasUsageClassName =
    activeClassesCount >= 1 ? "text-rose-600" : activeClassesCount >= 0.8 ? "text-orange-500" : "text-slate-500";
  const alunasUsageClassName =
    studentCount >= 20 ? "text-rose-600" : studentCount >= 16 ? "text-orange-500" : "text-slate-500";

  function renderUsageIndicators() {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <span className={cn("font-medium", turmasUsageClassName)}>{activeClassesCount}/1 turma</span>
        {studentCount > 15 ? <span className={cn("font-medium", alunasUsageClassName)}>{studentCount}/20 alunas</span> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-900">
      <div className="flex min-h-screen max-w-full overflow-x-hidden">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-5 py-6 shadow-soft transition-transform lg:static lg:translate-x-0",
            menuAberto ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">Genda Class</p>
              <p className="text-lg font-semibold text-slate-900">Painel da escola</p>
              {renderUsageIndicators()}
            </Link>
            <button
              type="button"
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMenuAberto(false)}
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-10 space-y-2">
            {itensMenu.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100",
                    )
                  }
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {menuAberto ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu lateral"
          />
        ) : null}

        <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
                  onClick={() => setMenuAberto(true)}
                  aria-label="Abrir menu"
                >
                  <Menu className="size-5" />
                </button>
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">Bem-vinda de volta</p>
                  <h1 className="truncate text-base font-semibold text-slate-900">{nomeUsuario}</h1>
                  <div className="mt-1 lg:hidden">{renderUsageIndicators()}</div>
                </div>
              </div>

              <Button
                variante="secundaria"
                className="shrink-0 gap-2 px-3 sm:px-4"
                onClick={() => void sair()}
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
