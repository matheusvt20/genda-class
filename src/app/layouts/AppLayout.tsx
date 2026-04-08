import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, GraduationCap, Users, Wallet, Settings, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/core/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";

const itensMenu = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/turmas", label: "Turmas", icon: GraduationCap },
  { to: "/alunas", label: "Alunas", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppLayout() {
  const { perfil, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  const nomeUsuario = perfil?.full_name?.trim() || "Usuária";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white px-5 py-6 shadow-soft transition-transform lg:static lg:translate-x-0",
            menuAberto ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">Genda Class</p>
              <p className="text-lg font-semibold text-slate-900">Painel da escola</p>
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

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
                  onClick={() => setMenuAberto(true)}
                  aria-label="Abrir menu"
                >
                  <Menu className="size-5" />
                </button>
                <div>
                  <p className="text-sm text-slate-500">Bem-vinda de volta</p>
                  <h1 className="text-base font-semibold text-slate-900">{nomeUsuario}</h1>
                </div>
              </div>

              <Button variante="secundaria" className="gap-2" onClick={() => void sair()}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
