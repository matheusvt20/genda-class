import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/core/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateLeadPixStatus } from "@/features/classes/services/public-sales.service";
import { classStatusLabels, listClasses, type ClassListItem } from "@/features/classes/services/classes.service";
import { getDashboardData, type DashboardData } from "@/features/dashboard/services/dashboard.service";
import { formatarMoeda } from "@/lib/currency";
import { extrairHora, formatarData } from "@/lib/date";

type DashboardLeadRow = {
  id: string;
  full_name: string;
  status: string;
  pix_status: string;
  created_at: string;
  classes: {
    title: string;
    deposit_amount: number | null;
  };
};

type DashboardExtras = {
  turmasConcluidasNoMes: number;
  alunasListaEspera: number;
  valorPendenteNoMes: number;
  lucroRealizadoNoMes: number;
  proximasTurmas: ClassListItem[];
  novosLeads: DashboardLeadRow[];
  sinaisPendentes: DashboardLeadRow[];
};

function capitalize(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getFirstName(fullName: string | null | undefined) {
  return fullName?.trim().split(" ")[0] || "por aqui";
}

function getStatusBadgeClass(status: string) {
  if (status === "aberta") {
    return "bg-[#DCFCE7] text-[#166534]";
  }

  if (status === "lotada") {
    return "bg-[#FEF3C7] text-[#A16207]";
  }

  if (status === "concluida") {
    return "bg-slate-100 text-slate-600";
  }

  if (status === "cancelada") {
    return "bg-[#FEE2E2] text-[#DC2626]";
  }

  return "bg-[#EEF1FF] text-[#2D4EF5]";
}

function SectionCard({
  title,
  linkLabel,
  linkTo,
  children,
}: {
  title: string;
  linkLabel: string;
  linkTo: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-0 shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
        <h3 className="text-[13px] font-medium text-slate-900">{title}</h3>
        <Link to={linkTo} className="text-sm font-medium text-[#2D4EF5]">
          {linkLabel}
        </Link>
      </div>
      <div>{children}</div>
    </Card>
  );
}

export function DashboardPage() {
  const { workspace, perfil } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [extras, setExtras] = useState<DashboardExtras | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingLeadId, setConfirmingLeadId] = useState<string | null>(null);

  async function loadDashboard() {
    if (!workspace?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const [
        dashboardData,
        allClasses,
        enrollmentsResponse,
        financialSummaryResponse,
        leadsResponse,
      ] = await Promise.all([
        getDashboardData(workspace.id),
        listClasses(workspace.id),
        supabase
          .from("class_enrollments")
          .select("status, balance_due, classes!inner(starts_at)")
          .eq("workspace_id", workspace.id)
          .gte("classes.starts_at", monthStart)
          .lte("classes.starts_at", monthEnd)
          .returns<Array<{ status: string; balance_due: number; classes: { starts_at: string } }>>(),
        supabase
          .from("vw_class_financial_summary")
          .select("realized_profit, starts_at")
          .eq("workspace_id", workspace.id)
          .gte("starts_at", monthStart)
          .lte("starts_at", monthEnd)
          .returns<Array<{ realized_profit: number; starts_at: string }>>(),
        supabase
          .from("class_leads")
          .select("id, full_name, status, pix_status, created_at, classes!inner(title, deposit_amount)")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .returns<DashboardLeadRow[]>(),
      ]);

      if (enrollmentsResponse.error) {
        throw enrollmentsResponse.error;
      }

      if (financialSummaryResponse.error) {
        throw financialSummaryResponse.error;
      }

      if (leadsResponse.error) {
        throw leadsResponse.error;
      }

      const turmasDoMes = allClasses.filter((item) => {
        const startsAt = new Date(item.starts_at);
        return startsAt >= new Date(monthStart) && startsAt <= new Date(monthEnd);
      });

      const proximasTurmas = allClasses
        .filter((item) => new Date(item.starts_at) >= new Date())
        .slice(0, 5);

      const alunasListaEspera = (enrollmentsResponse.data ?? []).filter((item) => item.status === "lista_espera").length;
      const valorPendenteNoMes = (enrollmentsResponse.data ?? [])
        .filter((item) => Number(item.balance_due) > 0)
        .reduce((total, item) => total + Number(item.balance_due), 0);
      const lucroRealizadoNoMes = (financialSummaryResponse.data ?? []).reduce(
        (total, item) => total + Number(item.realized_profit ?? 0),
        0,
      );

      const leads = leadsResponse.data ?? [];
      const novosLeads = leads
        .filter((item) => item.status === "novo" || item.pix_status === "enviado")
        .slice(0, 5);
      const sinaisPendentes = leads.filter((item) => item.pix_status === "enviado").slice(0, 5);

      setData(dashboardData);
      setExtras({
        turmasConcluidasNoMes: turmasDoMes.filter((item) => item.statusExibicao === "concluida").length,
        alunasListaEspera,
        valorPendenteNoMes,
        lucroRealizadoNoMes,
        proximasTurmas,
        novosLeads,
        sinaisPendentes,
      });
    } catch (err) {
      setData(null);
      setExtras(null);
      setError(err instanceof Error ? err.message : "Não foi possível carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [workspace?.id]);

  const currentDateLabel = useMemo(() => {
    return capitalize(
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);

  async function handleConfirmLead(leadId: string) {
    setConfirmingLeadId(leadId);

    try {
      await updateLeadPixStatus(leadId, "confirmado");
      await loadDashboard();
    } finally {
      setConfirmingLeadId(null);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <EmptyState
        titulo="Não foi possível carregar o dashboard"
        descricao="Verifique se as migrations do Supabase foram aplicadas e tente novamente."
      />
    );
  }

  if (!data || !extras) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-[#2D4EF5]">Dashboard</p>
            <h2 className="text-[20px] font-medium text-slate-900">Bom dia, {getFirstName(perfil?.full_name)}</h2>
            <p className="text-xs text-slate-500">{currentDateLabel}</p>
          </div>
          <Link to="/turmas" className="self-start sm:self-auto">
            <Button className="h-12 whitespace-nowrap rounded-[18px] bg-[#2D4EF5] px-6 text-base font-semibold hover:bg-[#2443de]">
              + Nova turma
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-2 xl:grid-cols-4">
        <Card className="rounded-[24px] border border-slate-200 bg-white px-[14px] py-[10px] shadow-soft">
          <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Turmas do mês</p>
          <p className="mt-1 text-[22px] font-medium text-slate-900">{data.turmasDoMes}</p>
          <p className="mt-1 text-[11px] text-slate-500">{extras.turmasConcluidasNoMes} concluídas</p>
        </Card>

        <Card className="rounded-[24px] border border-slate-200 bg-white px-[14px] py-[10px] shadow-soft">
          <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Alunas confirmadas</p>
          <p className="mt-1 text-[22px] font-medium text-slate-900">{data.alunasConfirmadas}</p>
          <p className="mt-1 text-[11px] text-slate-500">{extras.alunasListaEspera} na lista de espera</p>
        </Card>

        <Card className="rounded-[24px] border border-slate-200 bg-white px-[14px] py-[10px] shadow-soft">
          <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Recebido no mês</p>
          <p className="mt-1 text-[22px] font-medium text-[#16A34A]">{formatarMoeda(data.recebido)}</p>
          <p className="mt-1 text-[11px] text-slate-500">{formatarMoeda(extras.valorPendenteNoMes)} pendente</p>
        </Card>

        <Card className="rounded-[24px] border border-slate-200 bg-white px-[14px] py-[10px] shadow-soft">
          <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Lucro estimado</p>
          <p className="mt-1 text-[22px] font-medium text-[#2D4EF5]">{formatarMoeda(data.lucroEstimado)}</p>
          <p className="mt-1 text-[11px] text-slate-500">{formatarMoeda(extras.lucroRealizadoNoMes)} realizado</p>
        </Card>
      </div>

      <div className="grid gap-[10px] xl:grid-cols-2">
        <SectionCard title="Próximas turmas" linkLabel="Ver todas" linkTo="/turmas">
          {extras.proximasTurmas.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-500">Nenhuma outra turma futura.</div>
          ) : (
            extras.proximasTurmas.map((item, index) => (
              <div
                key={item.id}
                className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between ${index < extras.proximasTurmas.length - 1 ? "border-b border-slate-200" : ""}`}
              >
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-900">{item.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatarData(item.starts_at)} · {extrairHora(item.starts_at)} · {item.location_name || "Local a definir"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${getStatusBadgeClass(item.statusExibicao)}`}>
                    {classStatusLabels[item.statusExibicao]}
                  </span>
                  <p className="mt-2 text-sm text-slate-500">
                    {item.vagasOcupadas}/{item.capacity} vagas
                  </p>
                </div>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Pagamentos pendentes" linkLabel="Ver financeiro" linkTo="/financeiro">
          {data.pendencias.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-500">Nenhuma pendência encontrada.</div>
          ) : (
            data.pendencias.slice(0, 5).map((item, index) => (
              <div
                key={item.enrollmentId}
                className={`px-4 py-4 ${index < Math.min(data.pendencias.length, 5) - 1 ? "border-b border-slate-200" : ""}`}
              >
                <p className="text-sm font-semibold text-slate-900">{item.studentName}</p>
                <div className="mt-1 flex items-center justify-between gap-4">
                  <p className="text-[11px] text-slate-500">{item.classTitle}</p>
                  <p className="text-sm font-medium text-[#E5780A]">{formatarMoeda(item.balanceDue)}</p>
                </div>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Novos leads" linkLabel="Ver todos" linkTo="/turmas">
          {extras.novosLeads.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-500">Nenhum lead novo.</div>
          ) : (
            extras.novosLeads.map((item, index) => (
              <div
                key={item.id}
                className={`px-4 py-4 ${index < extras.novosLeads.length - 1 ? "border-b border-slate-200" : ""}`}
              >
                <p className="text-sm font-semibold text-slate-900">{item.full_name}</p>
                <div className="mt-1 flex items-center justify-between gap-4">
                  <p className="text-[11px] text-slate-500">{item.classes.title}</p>
                  <p className="text-[11px] text-slate-500">{formatarData(item.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard title="Sinais aguardando confirmação" linkLabel="Ver todos" linkTo="/turmas">
          {extras.sinaisPendentes.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-500">Nenhum sinal pendente.</div>
          ) : (
            extras.sinaisPendentes.map((item, index) => (
              <div
                key={item.id}
                className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${index < extras.sinaisPendentes.length - 1 ? "border-b border-slate-200" : ""}`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.full_name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.classes.title}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-700">
                    {formatarMoeda(Number(item.classes.deposit_amount ?? 0))}
                  </p>
                </div>
                <Button
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => void handleConfirmLead(item.id)}
                  disabled={confirmingLeadId === item.id}
                >
                  {confirmingLeadId === item.id ? "Confirmando..." : "Confirmar"}
                </Button>
              </div>
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}
