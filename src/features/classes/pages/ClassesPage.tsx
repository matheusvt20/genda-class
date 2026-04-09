import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { PlanLimitModal } from "@/components/ui/PlanLimitModal";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  classStatusLabels,
  findClassScheduleConflicts,
  getActiveClassCount,
  getCourseTypeLabel,
  listClasses,
  saveClass,
  type ClassFormValues,
  type ClassListItem,
} from "@/features/classes/services/classes.service";
import { ClassFormDialog } from "@/features/classes/components/ClassFormDialog";
import { formatarMoeda } from "@/lib/currency";
import { formatarData, formatarHora } from "@/lib/date";

const filtros = [
  { id: "todas", label: "Todas" },
  { id: "abertas", label: "Abertas" },
  { id: "concluidas", label: "Concluídas" },
  { id: "canceladas", label: "Canceladas" },
  { id: "mes", label: "Este mês" },
];

const valoresPadrao: ClassFormValues = {
  title: "",
  courseType: "turma_pequena",
  startDate: "",
  durationDays: 1,
  startTime: "09:00",
  endTime: "18:00",
  locationName: "",
  locationAddress: "",
  capacity: 8,
  pricePerStudent: 0,
  notes: "",
  materialsIncluded: false,
  materialsList: "",
  certificateEnabled: false,
  durationHours: null,
};

function getCourseTypeBadgeStyle(courseType: string) {
  const tipo = courseType.toLowerCase();

  if (tipo.includes("vip")) {
    return { backgroundColor: "#F5F0FF", color: "#6D28D9" };
  }

  if (tipo.includes("workshop")) {
    return { backgroundColor: "#FFF7ED", color: "#9A3412" };
  }

  if (tipo.includes("instrutora")) {
    return { backgroundColor: "#F0FDF4", color: "#166534" };
  }

  return { backgroundColor: "#EEF1FF", color: "#2D4EF5" };
}

function getStatusBadgeStyle(status: ClassListItem["statusExibicao"]) {
  if (status === "aberta") {
    return { backgroundColor: "#DCFCE7", color: "#166534" };
  }

  if (status === "lotada") {
    return { backgroundColor: "#FEF3C7", color: "#92400E" };
  }

  if (status === "cancelada") {
    return { backgroundColor: "#FEE2E2", color: "#B91C1C" };
  }

  return { backgroundColor: "#F1F5F9", color: "#475569" };
}

function getReceivedMetaStyle(recebido: number, esperado: number) {
  if (esperado > 0 && recebido >= esperado) {
    return { color: "#16A34A" };
  }

  if (recebido > 0) {
    return { color: "#EA580C" };
  }

  return { color: "#6B7280" };
}

export function ClassesPage() {
  const { workspace } = useAuth();
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("todas");
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  async function confirmarConflitos(values: ClassFormValues) {
    if (!workspace?.id) {
      return true;
    }

    const conflitos = await findClassScheduleConflicts(workspace.id, values);

    if (conflitos.length === 0) {
      return true;
    }

    const mensagem = [
      "Já existem turmas cadastradas nesse mesmo período:",
      ...conflitos.map(
        (conflito) =>
          `- ${conflito.title} (${conflito.overlappingDates
            .map((data) => new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR"))
            .join(", ")})`,
      ),
      "",
      "Deseja salvar mesmo assim?",
    ].join("\n");

    return window.confirm(mensagem);
  }

  async function loadClasses() {
    if (!workspace?.id) {
      return;
    }

    setLoading(true);
    try {
      setClasses(await listClasses(workspace.id));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClasses();
  }, [workspace?.id]);

  const filteredClasses = useMemo(() => {
    const now = new Date();
    return classes.filter((item) => {
      if (activeFilter === "abertas") {
        return item.statusExibicao === "aberta" || item.statusExibicao === "lotada";
      }

      if (activeFilter === "concluidas") {
        return item.statusExibicao === "concluida";
      }

      if (activeFilter === "canceladas") {
        return item.statusExibicao === "cancelada";
      }

      if (activeFilter === "mes") {
        const startsAt = new Date(item.starts_at);
        return startsAt.getMonth() === now.getMonth() && startsAt.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [activeFilter, classes]);

  const activeClassesCount = useMemo(
    () => classes.filter((item) => item.status !== "cancelled" && item.status !== "completed").length,
    [classes],
  );

  const classLimitReached = activeClassesCount >= 1;

  async function handleOpenNewClassDialog() {
    if (!workspace?.id) {
      return;
    }

    const count = await getActiveClassCount(workspace.id);

    if (count >= 1) {
      setLimitModalOpen(true);
      return;
    }

    setDialogOpen(true);
  }

  async function handleCreate(values: ClassFormValues) {
    if (!workspace?.id) {
      return;
    }

    setSaving(true);
    try {
      const podeSalvar = await confirmarConflitos(values);

      if (!podeSalvar) {
        return;
      }

      await saveClass(workspace.id, values);
      setDialogOpen(false);
      await loadClasses();
    } catch (error) {
      if (error instanceof Error && error.message === "PLAN_LIMIT_CLASSES") {
        setDialogOpen(false);
        setLimitModalOpen(true);
        return;
      }

      throw error;
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600">Turmas</p>
          <h2 className="text-3xl font-semibold text-slate-900">Gestão de turmas</h2>
          <p className="mt-2 text-sm text-slate-500">Acompanhe vagas, recebimentos e status das próximas aulas.</p>
        </div>
        <Button className="gap-2 whitespace-nowrap self-start sm:self-auto" onClick={() => void handleOpenNewClassDialog()}>
          <Plus className="size-4" />
          Nova turma
          {classLimitReached ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
              Free
            </span>
          ) : null}
        </Button>
      </div>

      <Tabs tabs={filtros} value={activeFilter} onChange={setActiveFilter} />

      {filteredClasses.length === 0 ? (
        <EmptyState
          titulo="Nenhuma turma por aqui"
          descricao="Crie sua primeira turma para começar a organizar vagas, pagamentos e resultados."
        />
      ) : (
        <div className="space-y-2">
          {filteredClasses.map((turma) => (
            <div
              key={turma.id}
              className="bg-white px-4 py-3"
              style={{
                borderRadius: "var(--border-radius-lg)",
                border: "0.5px solid var(--color-border-tertiary, #D9DEE8)",
              }}
            >
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-medium leading-tight text-slate-900">
                      {turma.course_name?.trim() || turma.title}
                    </h3>
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium leading-none"
                      style={getCourseTypeBadgeStyle(turma.course_type)}
                    >
                      {getCourseTypeLabel(turma.course_type)}
                    </span>
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium leading-none"
                      style={getStatusBadgeStyle(turma.statusExibicao)}
                    >
                      {classStatusLabels[turma.statusExibicao]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      {formatarData(turma.starts_at)} · {formatarHora(turma.starts_at)}-{formatarHora(turma.ends_at ?? turma.starts_at)}
                    </span>
                    <span>{turma.location_name || "Local a definir"}</span>
                    <span>
                      {turma.vagasOcupadas}/{turma.capacity} vagas
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-[2px] bg-[#F1F3F7]">
                      <div
                        className="h-full rounded-[2px]"
                        style={{
                          width: `${Math.min(100, Math.max(0, turma.percentualOcupacao))}%`,
                          backgroundColor: turma.percentualOcupacao >= 100 ? "#E5780A" : "#2D4EF5",
                        }}
                      />
                    </div>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: turma.percentualOcupacao >= 100 ? "#E5780A" : "#6B7280" }}
                    >
                      {Math.round(turma.percentualOcupacao)}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start text-left sm:min-w-[148px] sm:items-end sm:text-right">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Recebido</p>
                  <p className="text-[16px] font-medium leading-tight text-slate-900">{formatarMoeda(turma.totalRecebido)}</p>
                  <p className="text-[11px] leading-tight" style={getReceivedMetaStyle(turma.totalRecebido, turma.totalEsperado)}>
                    de {formatarMoeda(turma.totalEsperado)}
                  </p>
                  <Link
                    to={`/turmas/${turma.id}`}
                    className="mt-3 inline-flex items-center justify-center rounded-md px-3 py-[5px] text-xs font-medium"
                    style={{ backgroundColor: "#EEF1FF", color: "#2D4EF5" }}
                  >
                    Ver detalhes →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClassFormDialog
        open={dialogOpen}
        title="Nova turma"
        description="Cadastre uma nova turma com data, vagas e condições comerciais."
        loading={saving}
        initialValues={valoresPadrao}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
      <PlanLimitModal open={limitModalOpen} type="turma" onClose={() => setLimitModalOpen(false)} />
    </div>
  );
}
