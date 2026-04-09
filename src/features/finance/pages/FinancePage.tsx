import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PaymentFormDialog } from "@/features/classes/components/PaymentFormDialog";
import { createPayment, type PaymentFormValues } from "@/features/classes/services/classes.service";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/core/supabase/client";
import {
  getFinancePageData,
  type FinanceEntryRecord,
  type FinanceFilters,
  type FinancePageData,
} from "@/features/finance/services/finance.service";
import { formatarMoeda } from "@/lib/currency";
import { formatarData, formatarDataInput, formatarHora } from "@/lib/date";

type PeriodPreset = "mes" | "ultimos_30" | "ano" | "customizado";
type FinanceTab = "entradas" | "por_turma" | "inadimplencia";

type InadimplenciaItem = {
  enrollmentId: string;
  classId: string;
  studentId: string;
  studentName: string;
  classTitle: string;
  classStartsAt: string;
  balanceDue: number;
  paymentStatus: string;
};

const tabs = [
  { id: "entradas", label: "Entradas" },
  { id: "por_turma", label: "Por turma" },
  { id: "inadimplencia", label: "Inadimplência" },
] as const;

const periodOptions = [
  { value: "mes", label: "Este mês" },
  { value: "ultimos_30", label: "Últimos 30 dias" },
  { value: "ano", label: "Este ano" },
  { value: "customizado", label: "Personalizado" },
] as const;

const paymentStatusOptions = [
  { value: "todos", label: "Todos" },
  { value: "paid", label: "Pago" },
  { value: "pending", label: "Pendente" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const paymentMethodOptions = [
  { value: "todos", label: "Todos" },
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const;

const paymentTypeLabels: Record<string, string> = {
  deposito: "Depósito",
  parcela: "Parcela",
  saldo_final: "Saldo final",
  ajuste: "Ajuste",
  reembolso: "Reembolso",
};

const paymentMethodLabels: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

const costCategoryLabels: Record<string, string> = {
  materiais: "Materiais",
  aluguel: "Aluguel",
  coffee: "Coffee",
  certificado: "Certificado",
  kit: "Kit",
  transporte: "Transporte",
  marketing: "Marketing",
  outros: "Outros",
};

const statusLabels: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  cancelled: "Cancelado",
  previsto: "Previsto",
  realizado: "Realizado",
  nao_pago: "Não pago",
  parcial: "Parcial",
  pago: "Pago",
};

function getStartOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getEndOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

function getStartOfYear() {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

function getPresetRange(period: PeriodPreset) {
  const now = new Date();

  if (period === "ultimos_30") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return {
      startDate: formatarDataInput(start),
      endDate: formatarDataInput(now),
    };
  }

  if (period === "ano") {
    return {
      startDate: formatarDataInput(getStartOfYear()),
      endDate: formatarDataInput(now),
    };
  }

  return {
    startDate: formatarDataInput(getStartOfMonth()),
    endDate: formatarDataInput(getEndOfMonth()),
  };
}

function getStatusBadgeClass(status: string) {
  if (status === "paid" || status === "realizado" || status === "pago") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "pending" || status === "previsto" || status === "parcial") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "cancelled" || status === "nao_pago") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getEntryTypeLabel(entry: FinanceEntryRecord) {
  if (entry.entry_type === "payment") {
    return paymentTypeLabels[entry.payment_type ?? ""] ?? "Pagamento";
  }

  return costCategoryLabels[entry.cost_category ?? ""] ?? "Custo";
}

function getEntryMethodLabel(entry: FinanceEntryRecord) {
  if (entry.entry_type !== "payment") {
    return "—";
  }

  return paymentMethodLabels[entry.payment_method ?? ""] ?? "Outro";
}

function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-80 animate-pulse rounded bg-slate-200" />
      </Card>

      <div className="space-y-2">
        {[0, 1].map((row) => (
          <div key={row} className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white px-[14px] py-[10px]"
              >
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-7 w-28 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="min-w-[120px] flex-1 space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
              <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="h-16 animate-pulse border-b border-slate-200 bg-slate-50" />
        <div className="h-16 animate-pulse border-b border-slate-100 bg-white" />
        <div className="h-16 animate-pulse border-b border-slate-100 bg-white" />
        <div className="h-16 animate-pulse bg-white" />
      </Card>
    </div>
  );
}

export function FinancePage() {
  const { workspace } = useAuth();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("mes");
  const [customStartDate, setCustomStartDate] = useState(() => formatarDataInput(getStartOfMonth()));
  const [customEndDate, setCustomEndDate] = useState(() => formatarDataInput(getEndOfMonth()));
  const [classId, setClassId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<FinanceFilters["paymentStatus"]>("todos");
  const [paymentMethod, setPaymentMethod] = useState<FinanceFilters["paymentMethod"]>("todos");
  const [activeTab, setActiveTab] = useState<FinanceTab>("entradas");
  const [financeData, setFinanceData] = useState<FinancePageData | null>(null);
  const [inadimplencia, setInadimplencia] = useState<InadimplenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<InadimplenciaItem | null>(null);

  const appliedPeriod = useMemo(() => {
    if (periodPreset === "customizado") {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    return getPresetRange(periodPreset);
  }, [customEndDate, customStartDate, periodPreset]);

  useEffect(() => {
    if (!workspace?.id) {
      return;
    }

    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [financeResponse, debtResponse] = await Promise.all([
          getFinancePageData(workspace.id, {
            startDate: appliedPeriod.startDate,
            endDate: appliedPeriod.endDate,
            classId,
            paymentStatus,
            paymentMethod,
            costStatus: "todos",
            costCategory: "todos",
          }),
          supabase
            .from("class_enrollments")
            .select("id, class_id, student_id, balance_due, payment_status, classes!inner(title, starts_at), students!inner(full_name)")
            .eq("workspace_id", workspace.id)
            .gt("balance_due", 0)
            .gte("classes.starts_at", new Date(`${appliedPeriod.startDate}T00:00:00`).toISOString())
            .lte("classes.starts_at", new Date(`${appliedPeriod.endDate}T23:59:59.999`).toISOString())
            .returns<
              Array<{
                id: string;
                class_id: string;
                student_id: string;
                balance_due: number;
                payment_status: string;
                classes: { title: string; starts_at: string };
                students: { full_name: string };
              }>
            >(),
        ]);

        if (!active) {
          return;
        }

        if (debtResponse.error) {
          throw debtResponse.error;
        }

        setFinanceData(financeResponse);
        setInadimplencia(
          (debtResponse.data ?? [])
            .map((item) => ({
              enrollmentId: item.id,
              classId: item.class_id,
              studentId: item.student_id,
              studentName: item.students.full_name,
              classTitle: item.classes.title,
              classStartsAt: item.classes.starts_at,
              balanceDue: Number(item.balance_due),
              paymentStatus: item.payment_status,
            }))
            .sort((left, right) => right.balanceDue - left.balanceDue),
        );
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Não foi possível carregar o financeiro.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [appliedPeriod.endDate, appliedPeriod.startDate, classId, paymentMethod, paymentStatus, workspace?.id]);

  const vencido = useMemo(() => {
    if (!financeData) {
      return 0;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return financeData.summaries.reduce((total, item) => {
      if (Number(item.open_amount) <= 0) {
        return total;
      }

      const classStart = new Date(item.starts_at);
      classStart.setHours(0, 0, 0, 0);

      return classStart < todayStart ? total + Number(item.open_amount) : total;
    }, 0);
  }, [financeData]);

  const kpis = useMemo(() => {
    if (!financeData) {
      return [];
    }

    return [
      { label: "Previsto a receber", value: formatarMoeda(financeData.kpis.expectedRevenue), color: "#0F172A" },
      { label: "Recebido", value: formatarMoeda(financeData.kpis.receivedAmount), color: "#16A34A" },
      { label: "Em aberto", value: formatarMoeda(financeData.kpis.openAmount), color: "#E5780A" },
      { label: "Vencido", value: formatarMoeda(vencido), color: "#DC2626" },
      { label: "Custos previstos", value: formatarMoeda(financeData.kpis.expectedCosts), color: "#0F172A" },
      { label: "Custos realizados", value: formatarMoeda(financeData.kpis.realizedCosts), color: "#0F172A" },
      { label: "Lucro estimado", value: formatarMoeda(financeData.kpis.estimatedProfit), color: "#2D4EF5" },
      { label: "Lucro realizado", value: formatarMoeda(financeData.kpis.realizedProfit), color: "#2D4EF5" },
    ];
  }, [financeData, vencido]);

  const entryRows = useMemo(() => {
    if (!financeData) {
      return [];
    }

    return [...financeData.paymentEntries, ...financeData.costEntries].sort(
      (left, right) => new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime(),
    );
  }, [financeData]);

  const paymentInitialValues: PaymentFormValues = {
    enrollmentId: selectedDebt?.enrollmentId ?? "",
    studentId: selectedDebt?.studentId ?? "",
    amount: selectedDebt?.balanceDue ?? 0,
    description: "",
    receiptUrl: "",
    paymentType: "parcela",
    paymentMethod: "pix",
    status: "paid",
    paidAt: new Date().toISOString().slice(0, 16),
    notes: "",
  };

  async function refreshFinance() {
    if (!workspace?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [financeResponse, debtResponse] = await Promise.all([
        getFinancePageData(workspace.id, {
          startDate: appliedPeriod.startDate,
          endDate: appliedPeriod.endDate,
          classId,
          paymentStatus,
          paymentMethod,
          costStatus: "todos",
          costCategory: "todos",
        }),
        supabase
          .from("class_enrollments")
          .select("id, class_id, student_id, balance_due, payment_status, classes!inner(title, starts_at), students!inner(full_name)")
          .eq("workspace_id", workspace.id)
          .gt("balance_due", 0)
          .gte("classes.starts_at", new Date(`${appliedPeriod.startDate}T00:00:00`).toISOString())
          .lte("classes.starts_at", new Date(`${appliedPeriod.endDate}T23:59:59.999`).toISOString())
          .returns<
            Array<{
              id: string;
              class_id: string;
              student_id: string;
              balance_due: number;
              payment_status: string;
              classes: { title: string; starts_at: string };
              students: { full_name: string };
            }>
          >(),
      ]);

      if (debtResponse.error) {
        throw debtResponse.error;
      }

      setFinanceData(financeResponse);
      setInadimplencia(
        (debtResponse.data ?? [])
          .map((item) => ({
            enrollmentId: item.id,
            classId: item.class_id,
            studentId: item.student_id,
            studentName: item.students.full_name,
            classTitle: item.classes.title,
            classStartsAt: item.classes.starts_at,
            balanceDue: Number(item.balance_due),
            paymentStatus: item.payment_status,
          }))
          .sort((left, right) => right.balanceDue - left.balanceDue),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o financeiro.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePayment(values: PaymentFormValues) {
    if (!workspace?.id || !selectedDebt) {
      return;
    }

    setSavingPayment(true);
    try {
      await createPayment(workspace.id, selectedDebt.classId, {
        ...values,
        paidAt: new Date(values.paidAt).toISOString(),
      });
      setPaymentDialogOpen(false);
      setSelectedDebt(null);
      await refreshFinance();
    } finally {
      setSavingPayment(false);
    }
  }

  if (loading) {
    return <FinanceSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="space-y-3 p-6">
          <p className="text-sm font-medium text-brand-600">Financeiro</p>
          <h2 className="text-3xl font-semibold text-slate-900">Recebimentos e custos</h2>
        </Card>
        <Card className="p-6">
          <p className="text-base font-medium text-slate-900">Não foi possível carregar o financeiro.</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </Card>
      </div>
    );
  }

  if (!financeData) {
    return <FinanceSkeleton />;
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="space-y-3 p-6">
          <p className="text-sm font-medium text-brand-600">Financeiro</p>
          <h2 className="text-3xl font-semibold text-slate-900">Recebimentos e custos</h2>
        </Card>

        <div className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {kpis.slice(0, 4).map((item) => (
              <div
                key={item.label}
                className="bg-white px-[14px] py-[10px]"
                style={{
                  borderRadius: "var(--border-radius-md)",
                  border: "0.5px solid var(--color-border-tertiary)",
                }}
              >
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">{item.label}</p>
                <p className="text-[18px] font-medium" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {kpis.slice(4).map((item) => (
              <div
                key={item.label}
                className="bg-white px-[14px] py-[10px]"
                style={{
                  borderRadius: "var(--border-radius-md)",
                  border: "0.5px solid var(--color-border-tertiary)",
                }}
              >
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">{item.label}</p>
                <p className="text-[18px] font-medium" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Card className="p-4 sm:px-4 sm:py-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[120px] flex-1">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Período</span>
              <select
                value={periodPreset}
                onChange={(event) => setPeriodPreset(event.target.value as PeriodPreset)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {periodOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[120px] flex-1">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Turma</span>
              <select
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                <option value="">Todas as turmas</option>
                {financeData.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[120px] flex-1">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Status</span>
              <select
                value={paymentStatus}
                onChange={(event) => setPaymentStatus(event.target.value as FinanceFilters["paymentStatus"])}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {paymentStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[120px] flex-1">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Método</span>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as FinanceFilters["paymentMethod"])}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {paymentMethodOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            {periodPreset === "customizado" ? (
              <>
                <label className="min-w-[120px] flex-1">
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">Data inicial</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => setCustomStartDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </label>
                <label className="min-w-[120px] flex-1">
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">Data final</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                </label>
              </>
            ) : null}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto border-b border-slate-200 bg-white">
            <div className="flex min-w-max">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="px-5 py-4 text-[13px] font-medium transition sm:px-8 sm:py-5"
                  style={{
                    backgroundColor: active ? "#EEF1FF" : "#FFFFFF",
                    color: active ? "#2D4EF5" : "#334155",
                    borderBottom: active ? "2px solid #2D4EF5" : "2px solid transparent",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
            </div>
          </div>

          {activeTab === "entradas" ? (
            entryRows.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">
                Nenhuma entrada encontrada. Registre pagamentos e custos para acompanhar o financeiro.
              </div>
            ) : (
              <>
              <div className="grid gap-3 p-4 sm:hidden">
                {entryRows.map((entry) => (
                  <div key={`${entry.entry_type}-${entry.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{entry.class_title ?? "Sem turma"}</p>
                        <p className="text-xs text-slate-500">{entry.student_name ?? "Sem aluna vinculada"}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(entry.status)}`}>
                        {statusLabels[entry.status] ?? entry.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1 text-[12px] text-slate-500">
                      <p>{formatarData(entry.occurred_at)} • {formatarHora(entry.occurred_at)}</p>
                      <p>{getEntryTypeLabel(entry)} • {getEntryMethodLabel(entry)}</p>
                    </div>
                    <p className="mt-3 text-right text-[14px] font-semibold text-slate-900">{formatarMoeda(entry.amount)}</p>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="text-left text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">
                      <th className="px-4 py-2">Data</th>
                      <th className="px-4 py-2">Turma</th>
                      <th className="px-4 py-2">Aluna</th>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">Método</th>
                      <th className="px-4 py-2 text-right">Valor</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {entryRows.map((entry) => (
                      <tr key={`${entry.entry_type}-${entry.id}`} className="border-b border-slate-200/80 text-[13px] text-slate-700">
                        <td className="px-4 py-[10px]">
                          <div>{formatarData(entry.occurred_at)}</div>
                          <div className="text-xs text-slate-400">{formatarHora(entry.occurred_at)}</div>
                        </td>
                        <td className="px-4 py-[10px]">{entry.class_title ?? "—"}</td>
                        <td className="px-4 py-[10px]">{entry.student_name ?? "—"}</td>
                        <td className="px-4 py-[10px]">{getEntryTypeLabel(entry)}</td>
                        <td className="px-4 py-[10px]">{getEntryMethodLabel(entry)}</td>
                        <td className="px-4 py-[10px] text-right font-medium text-slate-900">{formatarMoeda(entry.amount)}</td>
                        <td className="px-4 py-[10px]">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(entry.status)}`}>
                            {statusLabels[entry.status] ?? entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )
          ) : null}

          {activeTab === "por_turma" ? (
            financeData.summaries.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">
                Nenhuma turma encontrada para o período selecionado.
              </div>
            ) : (
              <>
              <div className="grid gap-3 p-4 sm:hidden">
                {financeData.summaries.map((item) => (
                  <div key={item.class_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">{item.class_title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatarData(item.starts_at)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <p className="text-slate-500">Esperado</p>
                        <p className="mt-1 font-medium text-slate-900">{formatarMoeda(item.expected_revenue)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Recebido</p>
                        <p className="mt-1 font-medium text-slate-900">{formatarMoeda(item.received_amount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Custos</p>
                        <p className="mt-1 font-medium text-slate-900">{formatarMoeda(item.realized_costs)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Lucro</p>
                        <p className="mt-1 font-medium text-slate-900">{formatarMoeda(item.realized_profit)}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Margem: {Number(item.realized_margin_percent).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="text-left text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">
                      <th className="px-4 py-2">Turma</th>
                      <th className="px-4 py-2">Faturamento esperado</th>
                      <th className="px-4 py-2">Recebido</th>
                      <th className="px-4 py-2">Custos</th>
                      <th className="px-4 py-2">Lucro</th>
                      <th className="px-4 py-2">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {financeData.summaries.map((item) => (
                      <tr key={item.class_id} className="border-b border-slate-200/80 text-[13px] text-slate-700">
                        <td className="px-4 py-[10px]">
                          <div className="font-medium text-slate-900">{item.class_title}</div>
                          <div className="text-xs text-slate-400">{formatarData(item.starts_at)}</div>
                        </td>
                        <td className="px-4 py-[10px]">{formatarMoeda(item.expected_revenue)}</td>
                        <td className="px-4 py-[10px]">{formatarMoeda(item.received_amount)}</td>
                        <td className="px-4 py-[10px]">
                          <div>{formatarMoeda(item.realized_costs)}</div>
                          <div className="text-xs text-slate-400">Previstos: {formatarMoeda(item.expected_costs)}</div>
                        </td>
                        <td className="px-4 py-[10px]">
                          <div>{formatarMoeda(item.realized_profit)}</div>
                          <div className="text-xs text-slate-400">Estimado: {formatarMoeda(item.estimated_profit)}</div>
                        </td>
                        <td className="px-4 py-[10px]">{Number(item.realized_margin_percent).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )
          ) : null}

          {activeTab === "inadimplencia" ? (
            inadimplencia.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">Nenhuma inadimplência encontrada.</div>
            ) : (
              <>
              <div className="grid gap-3 p-4 sm:hidden">
                {inadimplencia.map((item) => (
                  <div key={item.enrollmentId} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.studentName}</p>
                        <p className="text-xs text-slate-500">{item.classTitle}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(item.paymentStatus)}`}>
                        {statusLabels[item.paymentStatus] ?? item.paymentStatus}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[12px]">
                      <p className="text-slate-500">{formatarData(item.classStartsAt)}</p>
                      <p className="font-semibold text-amber-600">{formatarMoeda(item.balanceDue)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDebt(item);
                        setPaymentDialogOpen(true);
                      }}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#EEF1FF] px-3 py-2 text-xs font-medium text-[#2D4EF5]"
                    >
                      Registrar pagamento
                    </button>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="min-w-full">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="text-left text-[11px] font-medium uppercase tracking-[0.05em] text-slate-500">
                      <th className="px-4 py-2">Aluna</th>
                      <th className="px-4 py-2">Turma</th>
                      <th className="px-4 py-2">Valor pendente</th>
                      <th className="px-4 py-2">Data do curso</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {inadimplencia.map((item) => (
                      <tr key={item.enrollmentId} className="border-b border-slate-200/80 text-[13px] text-slate-700">
                        <td className="px-4 py-[10px] font-medium text-slate-900">{item.studentName}</td>
                        <td className="px-4 py-[10px]">{item.classTitle}</td>
                        <td className="px-4 py-[10px] font-medium text-amber-600">{formatarMoeda(item.balanceDue)}</td>
                        <td className="px-4 py-[10px]">{formatarData(item.classStartsAt)}</td>
                        <td className="px-4 py-[10px]">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(item.paymentStatus)}`}>
                            {statusLabels[item.paymentStatus] ?? item.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-[10px] text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDebt(item);
                              setPaymentDialogOpen(true);
                            }}
                            className="inline-flex rounded-lg bg-[#EEF1FF] px-3 py-2 text-xs font-medium text-[#2D4EF5]"
                          >
                            Registrar pagamento
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )
          ) : null}
        </Card>
      </div>

      <PaymentFormDialog
        open={paymentDialogOpen}
        loading={savingPayment}
        enrollments={
          selectedDebt
            ? [
                {
                  id: selectedDebt.enrollmentId,
                  studentId: selectedDebt.studentId,
                  studentName: selectedDebt.studentName,
                  salePrice: selectedDebt.balanceDue,
                  totalPaid: 0,
                  balanceDue: selectedDebt.balanceDue,
                },
              ]
            : []
        }
        title="Registrar pagamento"
        description={selectedDebt ? `Registrar recebimento de ${selectedDebt.studentName}.` : "Registrar recebimento."}
        initialValues={paymentInitialValues}
        onClose={() => {
          setPaymentDialogOpen(false);
          setSelectedDebt(null);
        }}
        onSubmit={handleCreatePayment}
      />
    </>
  );
}
