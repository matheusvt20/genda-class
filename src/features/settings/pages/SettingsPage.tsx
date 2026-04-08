import { Card } from "@/components/ui/Card";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function SettingsPage() {
  const { perfil, workspace } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-brand-600">Configurações</p>
        <h2 className="text-3xl font-semibold text-slate-900">Dados iniciais da conta</h2>
      </div>

      <Card className="space-y-4">
        <div>
          <p className="text-sm text-slate-500">Nome da usuária</p>
          <p className="text-lg font-semibold text-slate-900">{perfil?.full_name || "Não informado"}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Workspace</p>
          <p className="text-lg font-semibold text-slate-900">{workspace?.name || "Ainda não carregado"}</p>
        </div>
      </Card>
    </div>
  );
}
