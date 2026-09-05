import {
  initialPlanItems,
  PLAN_VERSION,
  type PlanItem,
  type PlanStatus,
} from "@/lib/plan-data";
import { supabase } from "@/lib/supabase";

export const PLAN_ID = "yongin-tuesday-20260908";
const CACHE_KEY = `yongin-plan:${PLAN_VERSION}`;

type PlanRow = {
  item_id: string;
  day_id: PlanItem["dayId"];
  plan_date: string;
  day_label: string;
  phase: string;
  time_range: string;
  duration_minutes: number;
  title: string;
  criteria: string;
  kind: PlanItem["kind"];
  status: PlanStatus;
  progress: number;
  note: string;
  updated_at: string;
};

export type PlanSource = "supabase" | "local";

function rowToItem(row: PlanRow): PlanItem {
  return {
    id: row.item_id,
    dayId: row.day_id,
    date: row.plan_date,
    dayLabel: row.day_label,
    phase: row.phase,
    time: row.time_range,
    durationMinutes: row.duration_minutes,
    title: row.title,
    criteria: row.criteria,
    kind: row.kind,
    status: row.status,
    progress: row.progress,
    note: row.note,
  };
}

function readLocal(): PlanItem[] {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? (JSON.parse(stored) as PlanItem[]) : initialPlanItems;
  } catch {
    return initialPlanItems;
  }
}

export function cachePlan(items: PlanItem[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(items));
}

export async function loadPlan(): Promise<{
  items: PlanItem[];
  source: PlanSource;
  syncedAt: string | null;
}> {
  if (!supabase) {
    return { items: readLocal(), source: "local", syncedAt: null };
  }

  const { data, error } = await supabase
    .from("project_plan_item")
    .select(
      "item_id,day_id,plan_date,day_label,phase,time_range,duration_minutes,title,criteria,kind,status,progress,note,updated_at"
    )
    .eq("plan_id", PLAN_ID)
    .order("sort_order");

  if (error || !data?.length) {
    return { items: readLocal(), source: "local", syncedAt: null };
  }

  const items = (data as PlanRow[]).map(rowToItem);
  cachePlan(items);
  return {
    items,
    source: "supabase",
    syncedAt: data.reduce(
      (latest, row) => (row.updated_at > latest ? row.updated_at : latest),
      data[0].updated_at
    ),
  };
}

export async function savePlanItem(
  item: PlanItem
): Promise<{ source: PlanSource; syncedAt: string | null }> {
  const cached = readLocal().map(current =>
    current.id === item.id ? item : current
  );
  cachePlan(cached);

  if (!supabase) return { source: "local", syncedAt: null };

  const { data, error } = await supabase
    .from("project_plan_item")
    .update({
      status: item.status,
      progress: item.progress,
      note: item.note,
      updated_by: "Manus 운영보드",
    })
    .eq("plan_id", PLAN_ID)
    .eq("item_id", item.id)
    .select("updated_at")
    .single();

  if (error) throw error;
  return { source: "supabase", syncedAt: data.updated_at as string };
}

export function subscribeToPlan(onChange: () => void) {
  if (!supabase) return () => undefined;
  const client = supabase;

  const channel = client
    .channel(`plan:${PLAN_ID}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "project_plan_item",
        filter: `plan_id=eq.${PLAN_ID}`,
      },
      onChange
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
