import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateProgress,
  dayMilestones,
  initialPlanItems,
  PLAN_DEADLINE,
  type PlanItem,
  type PlanStatus,
} from "@/lib/plan-data";
import {
  loadPlan,
  savePlanItem,
  subscribeToPlan,
  type PlanSource,
} from "@/lib/plan-api";

const days = [
  { id: "sat", label: "토요일", date: "9.5", phase: "기반 구축" },
  { id: "sun", label: "일요일", date: "9.6", phase: "법령 DB·판정" },
  { id: "mon", label: "월요일", date: "9.7", phase: "증빙·점검·동결" },
  { id: "tue", label: "화요일", date: "9.8", phase: "리허설·최종 동결" },
] as const;

const statusMeta: Record<
  PlanStatus,
  { label: string; short: string; className: string }
> = {
  pending: { label: "대기", short: "대기", className: "plan-status-pending" },
  in_progress: {
    label: "진행 중",
    short: "진행",
    className: "plan-status-progress",
  },
  done: { label: "완료", short: "완료", className: "plan-status-done" },
  blocked: {
    label: "차단됨",
    short: "차단",
    className: "plan-status-blocked",
  },
};

function formatSyncedAt(value: string | null) {
  if (!value) return "로컬에 임시 저장";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export default function Plan() {
  const [items, setItems] = useState<PlanItem[]>(initialPlanItems);
  const [source, setSource] = useState<PlanSource>("local");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<"all" | PlanItem["dayId"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PlanStatus>("all");
  const [query, setQuery] = useState("");

  async function refresh(showToast = false) {
    const result = await loadPlan();
    setItems(result.items);
    setSource(result.source);
    setSyncedAt(result.syncedAt);
    setLoading(false);
    if (showToast)
      toast.success(
        result.source === "supabase"
          ? "클라우드 진행률을 다시 불러왔습니다."
          : "로컬 진행률을 불러왔습니다."
      );
  }

  useEffect(() => {
    void refresh();
    return subscribeToPlan(() => void refresh());
  }, []);

  const summary = useMemo(() => calculateProgress(items), [items]);
  const deadline = new Date(PLAN_DEADLINE);
  const remainingMs = deadline.getTime() - Date.now();
  const remainingHours = Math.max(0, Math.ceil(remainingMs / 3_600_000));
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    return items.filter(
      item =>
        (dayFilter === "all" || item.dayId === dayFilter) &&
        (statusFilter === "all" || item.status === statusFilter) &&
        (!normalized ||
          `${item.title} ${item.criteria} ${item.note}`
            .toLocaleLowerCase("ko-KR")
            .includes(normalized))
    );
  }, [dayFilter, items, query, statusFilter]);

  async function commit(updated: PlanItem, previous: PlanItem) {
    setItems(current =>
      current.map(item => (item.id === updated.id ? updated : item))
    );
    setSavingId(updated.id);
    try {
      const result = await savePlanItem(updated);
      setSource(result.source);
      setSyncedAt(result.syncedAt);
      if (result.source === "local") {
        toast.warning("클라우드 연결 전이라 이 브라우저에만 저장했습니다.");
      }
    } catch (error) {
      setItems(current =>
        current.map(item => (item.id === previous.id ? previous : item))
      );
      toast.error(
        `저장 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      );
    } finally {
      setSavingId(null);
    }
  }

  function updateStatus(item: PlanItem, status: PlanStatus) {
    const progress =
      status === "done"
        ? 100
        : status === "pending" && item.progress === 100
          ? 0
          : status === "in_progress" && item.progress === 0
            ? 10
            : item.progress;
    void commit({ ...item, status, progress }, item);
  }

  function updateProgress(item: PlanItem, progress: number) {
    const status: PlanStatus =
      progress === 100
        ? "done"
        : progress === 0
          ? "pending"
          : item.status === "blocked"
            ? "blocked"
            : "in_progress";
    void commit({ ...item, progress, status }, item);
  }

  const groupedDays = days
    .map(day => ({
      ...day,
      items: visibleItems.filter(item => item.dayId === day.id),
      allItems: items.filter(item => item.dayId === day.id),
    }))
    .filter(day => day.items.length > 0);

  return (
    <section className="page plan-page">
      <div className="page-heading plan-heading">
        <div>
          <span className="eyebrow">TUESDAY DELIVERY CONTROL</span>
          <h1>화요일까지 구현 추진현황</h1>
          <p>
            원본 Markdown의 49개 시간대를 작업 단위로 관리합니다. 진행률은
            작업시간 가중치로 계산됩니다.
          </p>
        </div>
        <div className="plan-cloud-stack">
          <span className={`plan-cloud ${source}`}>
            {source === "supabase" ? (
              <Cloud size={14} />
            ) : (
              <CloudOff size={14} />
            )}
            {source === "supabase" ? "Supabase 클라우드 저장" : "로컬 폴백"}
          </span>
          <button className="plan-refresh" onClick={() => void refresh(true)}>
            <RefreshCcw size={13} /> 마지막 동기화 {formatSyncedAt(syncedAt)}
          </button>
        </div>
      </div>

      <div className="plan-hero">
        <div
          className="plan-progress-ring"
          style={
            {
              "--plan-rate": `${summary.percent * 3.6}deg`,
            } as React.CSSProperties
          }
        >
          <div>
            <strong>{summary.percent}%</strong>
            <span>전체 진행률</span>
          </div>
        </div>
        <div className="plan-hero-copy">
          <span className="plan-kicker">
            <Sparkles size={13} /> 현재 구현 근거를 반영한 초기값
          </span>
          <h2>기반 구축 완료, 업무 데이터 연결 진행 중</h2>
          <p>
            Supabase 스키마·RLS·Storage·스모크 테스트와 공통 UI는 완료했습니다.
            이제 50~150개 법령 확정, 화면별 원격 CRUD, 전체 E2E가 핵심
            경로입니다.
          </p>
          <div className="plan-hero-meta">
            <span>
              <CalendarClock size={14} /> 최종 동결 9월 8일 12:00 KST
            </span>
            <span>
              <TimerReset size={14} /> 마감까지 약 {remainingHours}시간
            </span>
          </div>
        </div>
        <div className="plan-stat-grid">
          <div className="plan-stat done">
            <CheckCircle2 size={18} />
            <strong>{summary.completed}</strong>
            <span>완료</span>
          </div>
          <div className="plan-stat progress">
            <Loader2 size={18} />
            <strong>{summary.inProgress}</strong>
            <span>진행</span>
          </div>
          <div className="plan-stat blocked">
            <AlertTriangle size={18} />
            <strong>{summary.blocked}</strong>
            <span>차단</span>
          </div>
          <div className="plan-stat pending">
            <CalendarClock size={18} />
            <strong>{summary.pending}</strong>
            <span>대기</span>
          </div>
        </div>
      </div>

      <div className="plan-toolbar">
        <div className="plan-day-tabs" role="tablist" aria-label="일자 필터">
          <button
            className={dayFilter === "all" ? "active" : ""}
            onClick={() => setDayFilter("all")}
          >
            전체
          </button>
          {days.map(day => (
            <button
              key={day.id}
              className={dayFilter === day.id ? "active" : ""}
              onClick={() => setDayFilter(day.id)}
            >
              {day.date} {day.label}
            </button>
          ))}
        </div>
        <div className="plan-filters">
          <label>
            <Filter size={13} />
            <select
              aria-label="상태 필터"
              value={statusFilter}
              onChange={event =>
                setStatusFilter(event.target.value as "all" | PlanStatus)
              }
            >
              <option value="all">모든 상태</option>
              <option value="done">완료</option>
              <option value="in_progress">진행 중</option>
              <option value="pending">대기</option>
              <option value="blocked">차단됨</option>
            </select>
          </label>
          <label className="plan-search">
            <Search size={14} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="작업·완료조건·메모 검색"
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="plan-loading">
          <Loader2 size={22} /> 클라우드 추진현황을 불러오는 중입니다.
        </div>
      ) : groupedDays.length ? (
        <div className="plan-days">
          {groupedDays.map(day => {
            const daySummary = calculateProgress(day.allItems);
            return (
              <article className="plan-day-card" key={day.id}>
                <header className="plan-day-header">
                  <div className="plan-day-date">
                    <strong>{day.date}</strong>
                    <span>{day.label}</span>
                  </div>
                  <div className="plan-day-title">
                    <span>{day.phase}</span>
                    <strong>{dayMilestones[day.id]}</strong>
                  </div>
                  <div className="plan-day-progress">
                    <div>
                      <span>일자 진행률</span>
                      <strong>{daySummary.percent}%</strong>
                    </div>
                    <div className="plan-bar">
                      <i style={{ width: `${daySummary.percent}%` }} />
                    </div>
                  </div>
                </header>

                <div className="plan-table-head">
                  <span>시간</span>
                  <span>작업·완료 조건</span>
                  <span>상태</span>
                  <span>진행률</span>
                  <span>현재 메모</span>
                </div>

                {day.items.map(item =>
                  item.kind === "buffer" ? (
                    <div className="plan-buffer-row" key={item.id}>
                      <span>{item.time}</span>
                      <strong>{item.title}</strong>
                      <p>{item.criteria}</p>
                    </div>
                  ) : (
                    <div className="plan-task-row" key={item.id}>
                      <time>{item.time}</time>
                      <div className="plan-task-copy">
                        <strong>{item.title}</strong>
                        <p>{item.criteria}</p>
                      </div>
                      <select
                        className={`plan-status-select ${statusMeta[item.status].className}`}
                        aria-label={`${item.title} 상태`}
                        value={item.status}
                        disabled={savingId === item.id}
                        onChange={event =>
                          updateStatus(item, event.target.value as PlanStatus)
                        }
                      >
                        {Object.entries(statusMeta).map(([value, meta]) => (
                          <option value={value} key={value}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                      <div className="plan-progress-control">
                        <div className="plan-bar compact">
                          <i style={{ width: `${item.progress}%` }} />
                        </div>
                        <select
                          aria-label={`${item.title} 진행률`}
                          value={item.progress}
                          disabled={savingId === item.id}
                          onChange={event =>
                            updateProgress(item, Number(event.target.value))
                          }
                        >
                          {[0, 10, 25, 50, 60, 70, 75, 80, 90, 100].map(
                            value => (
                              <option key={value} value={value}>
                                {value}%
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div className="plan-note-cell">
                        <input
                          aria-label={`${item.title} 메모`}
                          value={item.note}
                          placeholder="진행 메모"
                          onChange={event => {
                            const note = event.target.value;
                            setItems(current =>
                              current.map(currentItem =>
                                currentItem.id === item.id
                                  ? { ...currentItem, note }
                                  : currentItem
                              )
                            );
                          }}
                          onBlur={event => {
                            const updated = {
                              ...item,
                              note: event.target.value,
                            };
                            void commit(updated, item);
                          }}
                        />
                        <button
                          title="완료로 표시"
                          aria-label={`${item.title} 완료로 표시`}
                          disabled={
                            savingId === item.id || item.status === "done"
                          }
                          onClick={() => updateStatus(item, "done")}
                        >
                          {savingId === item.id ? (
                            <Loader2 size={13} />
                          ) : (
                            <Check size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="plan-empty">조건에 맞는 작업이 없습니다.</div>
      )}
    </section>
  );
}
