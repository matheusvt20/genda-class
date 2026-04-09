import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ClassFormDialog } from "@/features/classes/components/ClassFormDialog";
import {
  classStatusLabels,
  findClassScheduleConflicts,
  getClassOccupiedDates,
  getCourseTypeLabel,
  listClasses,
  saveClass,
  type ClassFormValues,
  type ClassListItem,
} from "@/features/classes/services/classes.service";
import { formatarMoeda } from "@/lib/currency";
import { formatarData, formatarHora, inicioDaSemana } from "@/lib/date";

type ViewMode = "semana" | "mes" | "dia";

type DrawerState =
  | { type: "class"; classItem: ClassListItem }
  | { type: "day"; dateKey: string; classes: ClassListItem[] }
  | null;

const HEADER_BLUE = "#2D4EF5";
const TODAY_SURFACE = "#EEF1FF";
const HOUR_START = 6;
const HOUR_END = 22;
const HOUR_SLOT_HEIGHT = 56;
const TOTAL_GRID_HEIGHT = (HOUR_END - HOUR_START) * HOUR_SLOT_HEIGHT;
const weekHours = Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index);
const weekDayLabels = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
const tabs = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "dia", label: "Dia" },
] as const;
const legendItems = [
  { label: "Turma / Formação", color: "#2D4EF5" },
  { label: "VIP", color: "#7C3AED" },
  { label: "Workshop", color: "#E5780A" },
  { label: "Formação de instrutora", color: "#059669" },
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

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addToReferenceDate(value: Date, mode: ViewMode, direction: 1 | -1) {
  const next = new Date(value);

  if (mode === "mes") {
    next.setMonth(next.getMonth() + direction);
    return next;
  }

  if (mode === "semana") {
    next.setDate(next.getDate() + direction * 7);
    return next;
  }

  next.setDate(next.getDate() + direction);
  return next;
}

function diasDoMes(data: Date) {
  const inicio = new Date(data.getFullYear(), data.getMonth(), 1);
  const fim = new Date(data.getFullYear(), data.getMonth() + 1, 0);
  const inicioGrid = inicioDaSemana(inicio);
  const dias: Date[] = [];
  const cursor = new Date(inicioGrid);

  while (dias.length < 42) {
    dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return { dias, mesAtual: fim.getMonth() };
}

function isSameDay(left: Date, right: Date) {
  return getDateKey(left) === getDateKey(right);
}

function getMonthLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(" de ", " ")
    .toUpperCase();
}

function getCourseTypeColor(courseType: string) {
  const tipo = courseType.toLowerCase();

  if (tipo.includes("vip")) {
    return "#7C3AED";
  }

  if (tipo.includes("workshop")) {
    return "#E5780A";
  }

  if (tipo.includes("instrutora")) {
    return "#059669";
  }

  return "#2D4EF5";
}

function getCourseTypeTint(courseType: string) {
  const tipo = courseType.toLowerCase();

  if (tipo.includes("vip")) {
    return "rgba(124, 58, 237, 0.08)";
  }

  if (tipo.includes("workshop")) {
    return "rgba(229, 120, 10, 0.08)";
  }

  if (tipo.includes("instrutora") || tipo.includes("tecnica")) {
    return "rgba(5, 150, 105, 0.08)";
  }

  return "rgba(45, 78, 245, 0.08)";
}

function getStatusBulletColor(status: ClassListItem["statusExibicao"]) {
  if (status === "cancelada") {
    return "#CBD5E1";
  }

  if (status === "concluida") {
    return "#86EFAC";
  }

  if (status === "lotada") {
    return "#FCA5A5";
  }

  return "rgba(255,255,255,0.92)";
}

function getDailyMinutes(item: ClassListItem) {
  const startsAt = new Date(item.starts_at);
  const endsAt = item.ends_at ? new Date(item.ends_at) : new Date(item.starts_at);
  const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endMinutes = endsAt.getHours() * 60 + endsAt.getMinutes();

  return {
    startMinutes,
    endMinutes: Math.max(startMinutes + 60, endMinutes),
  };
}

function getWeeklyBlockStyle(item: ClassListItem, index: number) {
  const { startMinutes, endMinutes } = getDailyMinutes(item);
  const top = ((startMinutes - HOUR_START * 60) / 60) * HOUR_SLOT_HEIGHT + 4;
  const height = Math.max(44, ((endMinutes - startMinutes) / 60) * HOUR_SLOT_HEIGHT - 8);
  const overlapOffset = (index % 2) * 6;

  return {
    top: `${Math.max(4, top)}px`,
    height: `${height}px`,
    left: `${6 + overlapOffset}px`,
    right: `${6}px`,
  };
}

function getRangeLabel(item: ClassListItem) {
  const dates = getClassOccupiedDates(item.starts_at, item.duration_days);
  if (dates.length <= 1) {
    return formatarData(item.starts_at);
  }

  return `${formatarData(dates[0])} até ${formatarData(dates[dates.length - 1])}`;
}

function getTurmaCountLabel(total: number) {
  if (total === 0) {
    return "livre";
  }

  return total === 1 ? "1 turma" : `${total} turmas`;
}

function getMetrics(classes: ClassListItem[]) {
  return {
    totalTurmas: classes.length,
    alunasConfirmadas: classes.reduce((total, item) => total + item.vagasOcupadas, 0),
    recebido: classes.reduce((total, item) => total + item.totalRecebido, 0),
    projecao: classes.reduce((total, item) => total + item.totalEsperado, 0),
  };
}

function Drawer({
  state,
  onClose,
  onOpenClass,
}: {
  state: DrawerState;
  onClose: () => void;
  onOpenClass: (classItem: ClassListItem) => void;
}) {
  if (!state) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40">
      <button type="button" className="absolute inset-0" aria-label="Fechar drawer" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[28px] bg-white sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px] sm:rounded-none sm:rounded-l-[28px]">
        <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
              {state.type === "class" ? "Resumo da turma" : "Turmas do dia"}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {state.type === "class" ? state.classItem.title : formatarData(createDateFromKey(state.dateKey))}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {state.type === "class" ? (
            <div className="space-y-4 rounded-[24px] border border-slate-200 p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: getCourseTypeColor(state.classItem.course_type) }}
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
                    {getCourseTypeLabel(state.classItem.course_type)}
                  </p>
                </div>
                <h4 className="text-lg font-semibold text-slate-900">
                  {state.classItem.course_name?.trim() || state.classItem.title}
                </h4>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <p>Horário: {formatarHora(state.classItem.starts_at)} às {formatarHora(state.classItem.ends_at ?? state.classItem.starts_at)}</p>
                <p>Período: {getRangeLabel(state.classItem)}</p>
                <p>Local: {state.classItem.location_name || "A definir"}</p>
                <p>Ocupação: {state.classItem.vagasOcupadas}/{state.classItem.capacity} vagas</p>
                <p>Status: {classStatusLabels[state.classItem.statusExibicao]}</p>
                <p>Recebido: {formatarMoeda(state.classItem.totalRecebido)}</p>
                <p>Projeção: {formatarMoeda(state.classItem.totalEsperado)}</p>
              </div>
              <Link
                to={`/turmas/${state.classItem.id}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white"
              >
                Ver detalhes
              </Link>
            </div>
          ) : (
            state.classes.map((item) => (
              <button
                key={`${state.dateKey}-${item.id}`}
                type="button"
                onClick={() => onOpenClass(item)}
                className="w-full rounded-[24px] border border-slate-200 p-4 text-left transition hover:border-brand-200"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: getCourseTypeColor(item.course_type) }}
                  />
                  <p className="text-sm font-semibold text-slate-700">{getCourseTypeLabel(item.course_type)}</p>
                </div>
                <h4 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h4>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>{formatarHora(item.starts_at)} às {formatarHora(item.ends_at ?? item.starts_at)}</p>
                  <p>{item.vagasOcupadas}/{item.capacity} vagas</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { workspace } = useAuth();
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("mes");

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
            .map((data) => createDateFromKey(data).toLocaleDateString("pt-BR"))
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

  const weekDays = useMemo(() => {
    const start = inicioDaSemana(referenceDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [referenceDate]);

  const monthGrid = useMemo(() => diasDoMes(referenceDate), [referenceDate]);

  const classesByDate = useMemo(() => {
    const map = new Map<string, ClassListItem[]>();

    for (const turma of classes) {
      for (const dateKey of getClassOccupiedDates(turma.starts_at, turma.duration_days)) {
        map.set(dateKey, [...(map.get(dateKey) ?? []), turma]);
      }
    }

    for (const [key, items] of map.entries()) {
      map.set(
        key,
        [...items].sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()),
      );
    }

    return map;
  }, [classes]);

  const today = new Date();
  const todayKey = getDateKey(today);
  const selectedDayKey = getDateKey(referenceDate);
  const dailyClasses = classesByDate.get(selectedDayKey) ?? [];

  const weeklyDateKeys = useMemo(() => new Set(weekDays.map((day) => getDateKey(day))), [weekDays]);
  const weeklyClasses = useMemo(() => {
    const unique = new Map<string, ClassListItem>();

    for (const item of classes) {
      const intersects = getClassOccupiedDates(item.starts_at, item.duration_days).some((dateKey) =>
        weeklyDateKeys.has(dateKey),
      );

      if (intersects) {
        unique.set(item.id, item);
      }
    }

    return [...unique.values()];
  }, [classes, weeklyDateKeys]);

  const monthlyDateKeys = useMemo(
    () =>
      new Set(
        monthGrid.dias.filter((day) => day.getMonth() === monthGrid.mesAtual).map((day) => getDateKey(day)),
      ),
    [monthGrid],
  );

  const monthlyClasses = useMemo(() => {
    const unique = new Map<string, ClassListItem>();

    for (const item of classes) {
      const intersects = getClassOccupiedDates(item.starts_at, item.duration_days).some((dateKey) =>
        monthlyDateKeys.has(dateKey),
      );

      if (intersects) {
        unique.set(item.id, item);
      }
    }

    return [...unique.values()];
  }, [classes, monthlyDateKeys]);

  const activeMetrics = useMemo(() => {
    if (viewMode === "mes") {
      return getMetrics(monthlyClasses);
    }

    if (viewMode === "dia") {
      return getMetrics(dailyClasses);
    }

    return getMetrics(weeklyClasses);
  }, [dailyClasses, monthlyClasses, viewMode, weeklyClasses]);

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
    } finally {
      setSaving(false);
    }
  }

  function handleTouchEnd(touchEndX: number) {
    if (viewMode !== "dia" || touchStartX === null) {
      return;
    }

    const delta = touchStartX - touchEndX;
    if (Math.abs(delta) < 40) {
      return;
    }

    setReferenceDate((current) => addToReferenceDate(current, "dia", delta > 0 ? 1 : -1));
  }

  function renderHeader() {
    const metricItems = [
      ["turmas", String(activeMetrics.totalTurmas)],
      ["alunas", String(activeMetrics.alunasConfirmadas)],
      ["recebido", formatarMoeda(activeMetrics.recebido)],
      ["projeção", formatarMoeda(activeMetrics.projecao)],
    ];

    return (
      <div className="w-full overflow-hidden bg-[#2D4EF5] px-4 py-3 text-white box-border">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 overflow-hidden box-border">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold uppercase tracking-[0.16em] text-white/75">
              {getMonthLabel(referenceDate)}
            </p>
            <h2 className="mt-1 text-[18px] font-semibold leading-none text-white">Agenda de turmas</h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 overflow-hidden">
            {metricItems.map(([label, value]) => (
              <div key={label} className="whitespace-nowrap text-center">
                <div className="whitespace-nowrap text-[13px] font-semibold leading-none text-white">
                  {value}
                </div>
                <div className="mt-1 whitespace-nowrap text-[13px] font-medium lowercase leading-none text-white/75">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReferenceDate((current) => addToReferenceDate(current, viewMode, -1))}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 text-[13px] font-semibold text-white transition hover:bg-white/15"
              >
                <ChevronLeft className="mr-2 size-4" />
                <span className="leading-none">Anterior</span>
              </button>
              <button
                type="button"
                onClick={() => setReferenceDate(new Date())}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 text-[13px] font-semibold text-white transition hover:bg-white/15"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setReferenceDate((current) => addToReferenceDate(current, viewMode, 1))}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 text-[13px] font-semibold text-white transition hover:bg-white/15"
              >
                <span className="leading-none">Próximo</span>
                <ChevronRight className="ml-2 size-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => {
                const active = tab.id === viewMode;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewMode(tab.id)}
                    className={`inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-[13px] font-semibold transition ${
                      active
                        ? "border-white bg-white text-brand-700"
                        : "border-white/25 bg-white/10 text-white/75 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderWeeklyView() {
    return (
      <>
        <div className="overflow-x-auto">
          <div className="w-full">
            <div
              className="grid border-b border-slate-200"
              style={{ gridTemplateColumns: "104px repeat(7, minmax(0, 1fr))" }}
            >
              <div className="border-r border-slate-200 bg-white" />
              {weekDays.map((day, index) => {
                const dateKey = getDateKey(day);
                const items = classesByDate.get(dateKey) ?? [];
                const isToday = isSameDay(day, today);
                const accentColor = isToday
                  ? "#2D4EF5"
                  : items.length > 0
                    ? getCourseTypeColor(items[0].course_type)
                    : "#6B7280";
                const daySurface = isToday
                  ? "#EEF1FF"
                  : items.length > 0
                    ? getCourseTypeTint(items[0].course_type)
                    : "#FFFFFF";

                return (
                  <div
                    key={dateKey}
                    className="border-r border-slate-200 px-4 py-4 text-center last:border-r-0"
                    style={{ backgroundColor: daySurface }}
                  >
                    <p className="text-[12px] font-medium uppercase leading-none" style={{ color: isToday ? "#2D4EF5" : "#6B7280" }}>
                      {weekDayLabels[index]}
                    </p>
                    <p className="mt-2 text-[18px] font-semibold leading-none" style={{ color: isToday ? "#2D4EF5" : "#2F2F2F" }}>
                      {day.toLocaleDateString("pt-BR", { day: "2-digit" })}
                    </p>
                    <p className="mt-2 text-[11px] leading-none" style={{ color: accentColor }}>
                      {getTurmaCountLabel(items.length)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div
              className="grid"
              style={{ gridTemplateColumns: "104px repeat(7, minmax(0, 1fr))" }}
            >
              <div className="border-r border-slate-200 bg-white">
                <div className="relative" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                  {weekHours.map((hour, index) => (
                    <div
                      key={hour}
                      className="absolute inset-x-0 border-t border-slate-200 px-4 pt-2 text-[12px] font-medium text-slate-500"
                      style={{ top: `${index * HOUR_SLOT_HEIGHT}px` }}
                    >
                      {`${String(hour).padStart(2, "0")}:00`}
                    </div>
                  ))}
                  <div className="absolute inset-x-0 border-t border-slate-200 px-4 pt-2 text-[12px] font-medium text-slate-500" style={{ top: `${TOTAL_GRID_HEIGHT}px` }}>
                    22:00
                  </div>
                </div>
              </div>

              {weekDays.map((day) => {
                const dateKey = getDateKey(day);
                const items = classesByDate.get(dateKey) ?? [];
                const isToday = isSameDay(day, today);
                const columnSurface = isToday
                  ? "#EEF1FF"
                  : items.length > 0
                    ? getCourseTypeTint(items[0].course_type)
                    : "#FFFFFF";

                return (
                  <div
                    key={dateKey}
                    className="relative border-r border-slate-200 last:border-r-0"
                    style={{ height: `${TOTAL_GRID_HEIGHT}px`, backgroundColor: columnSurface }}
                  >
                    {weekHours.map((hour, index) => (
                      <div
                        key={`${dateKey}-${hour}`}
                        className="absolute inset-x-0 border-t border-slate-200"
                        style={{ top: `${index * HOUR_SLOT_HEIGHT}px` }}
                      />
                    ))}
                    <div
                      className="absolute inset-x-0 border-t border-slate-200"
                      style={{ top: `${TOTAL_GRID_HEIGHT}px` }}
                    />

                    {items.map((item, index) => (
                      <button
                        key={`${dateKey}-${item.id}`}
                        type="button"
                        onClick={() => setDrawerState({ type: "class", classItem: item })}
                        className="absolute overflow-hidden rounded-[16px] px-4 py-3 text-left text-white shadow-soft"
                        style={{
                          ...getWeeklyBlockStyle(item, index),
                          backgroundColor: getCourseTypeColor(item.course_type),
                        }}
                      >
                        <p className="line-clamp-2 text-[11px] font-bold leading-tight text-white">{item.title}</p>
                        <p className="mt-1 text-[10px] leading-none text-white/85">
                          {formatarHora(item.starts_at)} - {formatarHora(item.ends_at ?? item.starts_at)}
                        </p>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-slate-200 px-8 py-4">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-[14px] text-slate-700">
              <span className="size-4 rounded-md" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderMonthlyView() {
    return (
      <>
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-7 border-b border-slate-200">
              {weekDayLabels.map((label) => (
                <div key={label} className="border-r border-slate-200 px-2 py-3 text-center last:border-r-0">
                  <p className="text-[11px] font-semibold text-slate-600">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthGrid.dias.map((day) => {
                const dateKey = getDateKey(day);
                const items = classesByDate.get(dateKey) ?? [];
                const hiddenCount = Math.max(0, items.length - 2);
                const isCurrentMonth = day.getMonth() === monthGrid.mesAtual;

                return (
                  <div
                    key={dateKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDrawerState({ type: "day", dateKey, classes: items })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDrawerState({ type: "day", dateKey, classes: items });
                      }
                    }}
                    className={`min-h-[90px] border-r border-b border-slate-200 p-[6px] align-top last:border-r-0 ${
                      isCurrentMonth ? "bg-white" : "bg-slate-50"
                    } ${dateKey === todayKey ? "bg-[#EEF1FF]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[12px] font-semibold ${isCurrentMonth ? "text-slate-800" : "text-slate-400"}`}>
                        {day.toLocaleDateString("pt-BR", { day: "2-digit" })}
                      </p>
                      {items.length > 0 ? (
                        <span
                          className="inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: getCourseTypeColor(items[0].course_type) }}
                        >
                          {items.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1.5 space-y-1.5">
                      {items.slice(0, 2).map((item) => (
                        <button
                          key={`${dateKey}-${item.id}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDrawerState({ type: "class", classItem: item });
                          }}
                          className="block w-full rounded-xl px-2 py-2 text-left text-white"
                          style={{ backgroundColor: getCourseTypeColor(item.course_type) }}
                        >
                          <p className="line-clamp-2 text-[11px] font-semibold leading-tight">{item.title}</p>
                          <p className="mt-1 text-[10px] leading-tight text-white/90">
                            {formatarHora(item.starts_at)} · {item.vagasOcupadas}/{item.capacity} vagas
                          </p>
                          {item.statusExibicao === "lotada" ? (
                            <p className="mt-1 text-[10px] font-bold uppercase leading-none text-[#FEE2E2]">
                              LOTADA
                            </p>
                          ) : null}
                        </button>
                      ))}

                      {hiddenCount > 0 ? (
                        <div className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                          +{hiddenCount}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200 px-4 py-3">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="size-4 rounded-md" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  function renderDailyView() {
    return (
      <div
        className="space-y-3 p-3 sm:p-4"
        onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
            {formatarData(referenceDate)}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">Agenda do dia</h3>
        </div>

        {dailyClasses.length === 0 ? (
          <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
            Nenhuma turma agendada para este dia.
          </div>
        ) : (
          dailyClasses.map((item) => (
            <div
              key={`${selectedDayKey}-${item.id}`}
              className="rounded-[18px] border border-slate-200 bg-white px-4 py-3"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: getCourseTypeColor(item.course_type) }}
                    />
                    <p className="text-xs font-semibold text-brand-600">{getCourseTypeLabel(item.course_type)}</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {classStatusLabels[item.statusExibicao]}
                    </span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 text-base font-semibold text-slate-900 sm:text-lg">{item.title}</h3>
                </div>

                <div className="grid gap-x-4 gap-y-1 text-sm text-slate-600 sm:grid-cols-2 lg:gap-x-5">
                  <p>Horário: {formatarHora(item.starts_at)} às {formatarHora(item.ends_at ?? item.starts_at)}</p>
                  <p>Período: {getRangeLabel(item)}</p>
                  <p>Local: {item.location_name || "A definir"}</p>
                  <p>Vagas: {item.vagasOcupadas}/{item.capacity}</p>
                </div>

                <div className="flex justify-end lg:justify-self-end">
                  <Link
                    to={`/turmas/${item.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white"
                  >
                    Ver detalhes
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Nova turma
        </Button>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        {renderHeader()}
        {viewMode === "semana" ? renderWeeklyView() : null}
        {viewMode === "mes" ? renderMonthlyView() : null}
        {viewMode === "dia" ? renderDailyView() : null}
      </div>

      <Drawer
        state={drawerState}
        onClose={() => setDrawerState(null)}
        onOpenClass={(classItem) => setDrawerState({ type: "class", classItem })}
      />

      <ClassFormDialog
        open={dialogOpen}
        title="Nova turma"
        description="Cadastre uma nova turma direto do calendário."
        loading={saving}
        initialValues={{
          ...valoresPadrao,
          startDate: getDateKey(referenceDate),
        }}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
