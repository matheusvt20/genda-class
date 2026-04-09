import { supabase } from "@/core/supabase/client";

export type FinanceFilters = {
  startDate: string;
  endDate: string;
  classId: string;
  paymentStatus: "todos" | "paid" | "pending" | "cancelled";
  paymentMethod: "todos" | "pix" | "dinheiro" | "cartao" | "transferencia" | "outro";
  costStatus: "todos" | "previsto" | "realizado";
  costCategory:
    | "todos"
    | "materiais"
    | "aluguel"
    | "coffee"
    | "certificado"
    | "kit"
    | "transporte"
    | "marketing"
    | "outros";
};

export type FinanceEntryRecord = {
  id: string;
  workspace_id: string;
  class_id: string;
  class_title: string | null;
  class_starts_at: string | null;
  entry_type: "payment" | "cost";
  occurred_at: string;
  amount: number;
  impact_amount: number;
  status: string;
  payment_type: string | null;
  payment_method: string | null;
  cost_category: string | null;
  student_id: string | null;
  student_name: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ClassFinancialSummary = {
  class_id: string;
  workspace_id: string;
  class_title: string;
  starts_at: string;
  class_status: string;
  capacity: number;
  price_per_student: number;
  enrollment_count: number;
  occupied_seats: number;
  expected_revenue: number;
  received_amount: number;
  open_amount: number;
  pending_amount: number;
  expected_costs: number;
  realized_costs: number;
  estimated_profit: number;
  realized_profit: number;
  realized_margin_percent: number;
  break_even_students: number;
};

export type FinancePageData = {
  classes: Array<{ id: string; title: string }>;
  summaries: ClassFinancialSummary[];
  paymentEntries: FinanceEntryRecord[];
  costEntries: FinanceEntryRecord[];
  kpis: {
    expectedRevenue: number;
    receivedAmount: number;
    openAmount: number;
    expectedCosts: number;
    realizedCosts: number;
    estimatedProfit: number;
    realizedProfit: number;
  };
};

function toIsoStart(date: string) {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toIsoEnd(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export async function getFinancePageData(workspaceId: string, filters: FinanceFilters): Promise<FinancePageData> {
  let entriesQuery = supabase
    .from("vw_financial_entries")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false });

  let summariesQuery = supabase
    .from("vw_class_financial_summary")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("starts_at", { ascending: false });

  if (filters.classId) {
    entriesQuery = entriesQuery.eq("class_id", filters.classId);
    summariesQuery = summariesQuery.eq("class_id", filters.classId);
  }

  if (filters.startDate) {
    entriesQuery = entriesQuery.gte("occurred_at", toIsoStart(filters.startDate));
    summariesQuery = summariesQuery.gte("starts_at", toIsoStart(filters.startDate));
  }

  if (filters.endDate) {
    entriesQuery = entriesQuery.lte("occurred_at", toIsoEnd(filters.endDate));
    summariesQuery = summariesQuery.lte("starts_at", toIsoEnd(filters.endDate));
  }

  const [entriesResponse, summariesResponse, classesResponse] = await Promise.all([
    entriesQuery.returns<FinanceEntryRecord[]>(),
    summariesQuery.returns<ClassFinancialSummary[]>(),
    supabase
      .from("classes")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .order("starts_at", { ascending: false })
      .returns<Array<{ id: string; title: string }>>(),
  ]);

  if (entriesResponse.error) {
    throw entriesResponse.error;
  }

  if (summariesResponse.error) {
    throw summariesResponse.error;
  }

  if (classesResponse.error) {
    throw classesResponse.error;
  }

  const allEntries = entriesResponse.data ?? [];
  const summaries = summariesResponse.data ?? [];

  const paymentEntries = allEntries
    .filter((entry) => entry.entry_type === "payment")
    .filter((entry) => (filters.paymentStatus === "todos" ? true : entry.status === filters.paymentStatus))
    .filter((entry) => (filters.paymentMethod === "todos" ? true : entry.payment_method === filters.paymentMethod));

  const costEntries = allEntries
    .filter((entry) => entry.entry_type === "cost")
    .filter((entry) => (filters.costStatus === "todos" ? true : entry.status === filters.costStatus))
    .filter((entry) => (filters.costCategory === "todos" ? true : entry.cost_category === filters.costCategory));

  return {
    classes: classesResponse.data ?? [],
    summaries,
    paymentEntries,
    costEntries,
    kpis: {
      expectedRevenue: summaries.reduce((total, item) => total + Number(item.expected_revenue), 0),
      receivedAmount: summaries.reduce((total, item) => total + Number(item.received_amount), 0),
      openAmount: summaries.reduce((total, item) => total + Number(item.open_amount), 0),
      expectedCosts: summaries.reduce((total, item) => total + Number(item.expected_costs), 0),
      realizedCosts: summaries.reduce((total, item) => total + Number(item.realized_costs), 0),
      estimatedProfit: summaries.reduce((total, item) => total + Number(item.estimated_profit), 0),
      realizedProfit: summaries.reduce((total, item) => total + Number(item.realized_profit), 0),
    },
  };
}
