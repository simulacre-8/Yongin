import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, Database, Search, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import {
  loadHomeNavigation,
  loadHomeObligations,
  RELATED_LAW_OPTIONS,
  type HomeNavigationData,
  type HomeObligationItem,
  type HomeObligationView,
} from "@/lib/home-obligation-api";

const viewMeta: Record<
  HomeObligationView,
  { title: string; description: string; basis: string }
> = {
  all: {
    title: "전체 의무",
    description: "용인시 관련 법령 의무풀 전체를 확인합니다.",
    basis: "용인시 관련법령 의무풀",
  },
  "safety-system": {
    title: "안전보건관리체계",
    description:
      "안전·보건 목표, 조직, 인력, 예산, 점검 및 도급 관리 등 안전보건관리체계 의무를 확인합니다.",
    basis: "중대재해처벌법 제4조제1항제1호·제9조제1항제1호",
  },
  recurrence: {
    title: "재발방지 대책",
    description:
      "중대재해 발생 후 원인분석과 재발방지대책 이행 의무를 확인합니다.",
    basis: "중대재해처벌법 제4조제1항제2호·제9조제1항제2호",
  },
  "corrective-order": {
    title: "개선·시정명령 이행",
    description:
      "행정기관 등의 개선·시정명령 근거 의무와 향후 수신 공문·이행내역 관리 구조를 확인합니다.",
    basis: "중대재해처벌법 제4조제1항제3호·제9조제1항제3호",
  },
  "related-law": {
    title: "관계법령 관리조치",
    description: "중대재해처벌법 외 관계법령 의무를 법령별로 좁혀 검색합니다.",
    basis: "중대재해처벌법 제4조제1항제4호·제9조제1항제4호",
  },
  industrial: {
    title: "중대산업재해",
    description: "중대산업재해 관련 제4조·제5조의 14개 세부 의무를 확인합니다.",
    basis: "중대재해처벌법 제4조·제5조",
  },
  "citizen-facility": {
    title: "공중이용시설·공중교통수단",
    description:
      "공중이용시설과 공중교통수단의 중대시민재해 의무 13건을 확인합니다.",
    basis: "중대재해처벌법 제9조",
  },
  "citizen-product": {
    title: "원료·제조물",
    description: "원료·제조물의 중대시민재해 의무 9건을 확인합니다.",
    basis: "중대재해처벌법 제9조",
  },
};

const homeStyles = `
  .obligation-home {
    width: 100%; max-width: 1500px; margin: 0 auto; color: #202126;
    animation: obligation-home-in 180ms cubic-bezier(.23,1,.32,1);
  }
  @keyframes obligation-home-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .obligation-home * { box-sizing: border-box; }
  .obligation-home-header { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
  .obligation-home-eyebrow { margin: 0 0 7px; color: #a93193; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
  .obligation-home h1 { margin: 0; color: #18161a; font-size: 28px; font-weight: 850; letter-spacing: -.045em; }
  .obligation-home-header p:last-child { margin: 8px 0 0; color: #6d6870; font-size: 13px; }
  .obligation-home-source { display: flex; align-items: center; gap: 7px; padding: 10px 13px; border: 1px solid #ddd5df; border-radius: 10px; background: #fff; color: #5d5560; font-size: 11px; white-space: nowrap; }
  .obligation-home-source strong { color: #087b6b; }
  .obligation-home-kpis { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; margin-bottom: 14px; }
  .obligation-home-kpi { min-height: 92px; padding: 17px 18px; border: 1px solid #e0dce2; border-radius: 12px; background: #fff; box-shadow: 0 7px 20px rgba(55,40,58,.045); }
  .obligation-home-kpi span { display: block; color: #77717a; font-size: 11px; font-weight: 700; }
  .obligation-home-kpi strong { display: block; margin-top: 8px; color: #1e2023; font-size: 24px; font-weight: 850; line-height: 1; }
  .obligation-home-kpi strong em { color: #a93193; font-size: inherit; font-style: normal; }
  .obligation-home-guide { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 13px 16px; border: 1px solid #b9dfd8; border-radius: 10px; background: #eaf8f5; color: #415b56; font-size: 12px; }
  .obligation-home-guide svg { flex: 0 0 auto; color: #159b85; }
  .obligation-home-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 13px 15px; border: 1px solid #e1dde3; border-radius: 12px 12px 0 0; background: #fff; }
  .obligation-home-filter { min-width: 82px; height: 32px; padding: 0 15px; border: 1px solid #d9d5dc; border-radius: 17px; background: #fff; color: #625c65; font-size: 12px; font-weight: 700; }
  .obligation-home-filter.active { border-color: #17151a; background: #17151a; color: #fff; }
  .obligation-home-filter:hover { border-color: #a93193; color: #a93193; }
  .obligation-home-filter.active:hover { color: #fff; }
  .obligation-home-search-panel { display: grid; grid-template-columns: minmax(190px,.42fr) minmax(320px,1fr) 92px; gap: 10px; padding: 14px 15px; border: 1px solid #e1dde3; border-top: 0; background: #f2f2f5; }
  .obligation-home-search-panel select, .obligation-home-search-panel input { width: 100%; height: 38px; border: 1px solid #d6d2d9; border-radius: 8px; background: #fff; color: #363238; padding: 0 12px; font: inherit; font-size: 12px; }
  .obligation-home-search-panel button { display: flex; align-items: center; justify-content: center; gap: 6px; height: 38px; border: 1px solid #a93193; border-radius: 8px; background: #fff; color: #a93193; font-size: 12px; font-weight: 800; }
  .obligation-home-list { border: 1px solid #e1dde3; border-top: 0; border-radius: 0 0 12px 12px; background: #fff; overflow: hidden; }
  .obligation-home-list-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 16px; border-bottom: 1px solid #e5e1e7; }
  .obligation-home-list-head h2 { margin: 0; color: #232026; font-size: 14px; font-weight: 850; }
  .obligation-home-list-head h2 strong { color: #a93193; font-size: inherit; }
  .obligation-home-list-head span { color: #8b858d; font-size: 10px; }
  .obligation-home-table-wrap { max-height: 570px; overflow: auto; }
  .obligation-home-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
  .obligation-home-table th { position: sticky; top: 0; z-index: 1; height: 38px; padding: 8px 10px; border-bottom: 1px solid #dcd8de; background: #f2f3f5; color: #615b63; font-weight: 800; text-align: left; }
  .obligation-home-table td { min-height: 48px; padding: 10px; border-bottom: 1px solid #efedf0; color: #514c53; line-height: 1.5; vertical-align: middle; }
  .obligation-home-table tbody tr:hover { background: #fff8fc; }
  .obligation-home-table .obligation-title { color: #262128; font-size: 12px; font-weight: 800; }
  .obligation-home-table .obligation-title small { display: block; margin-top: 3px; color: #9a4a86; font-size: 9px; font-weight: 700; }
  .obligation-home-table .legal-basis { color: #443e46; font-weight: 650; }
  .obligation-home-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 2px 8px; border-radius: 11px; background: #f3ebf2; color: #8a316f; font-size: 10px; font-weight: 750; }
  .obligation-home-empty { padding: 55px 20px; color: #888189; text-align: center; font-size: 12px; }
  .obligation-home-empty strong { display: block; margin-bottom: 7px; color: #4c464e; font-size: 14px; }
  .corrective-register { margin: 14px 0; border: 1px solid #ead7e5; border-radius: 12px; background: #fff; overflow: hidden; }
  .corrective-register-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid #eadfe7; background: #fbf4f9; }
  .corrective-register-header h2 { margin: 0; color: #682358; font-size: 14px; }
  .corrective-register-header span { color: #a93193; font-size: 11px; font-weight: 800; }
  .corrective-register-columns { display: grid; grid-template-columns: 1.3fr .8fr .7fr .7fr 1.3fr .55fr; padding: 10px 14px; background: #f4f4f6; color: #625d64; font-size: 10px; font-weight: 800; }
  .corrective-register-empty { padding: 28px 16px; color: #89828b; text-align: center; font-size: 11px; }
  @media (max-width: 1120px) { .obligation-home-kpis { grid-template-columns: repeat(2,minmax(0,1fr)); } .obligation-home-search-panel { grid-template-columns: 1fr; } }
`;

function viewFromLocation(location: string): {
  view: HomeObligationView;
  detailId?: string;
} {
  const segments = location.split("?")[0].split("/").filter(Boolean);
  const candidate = segments[1] as HomeObligationView | undefined;
  const supported: HomeObligationView[] = [
    "all",
    "safety-system",
    "recurrence",
    "corrective-order",
    "related-law",
    "industrial",
    "citizen-facility",
    "citizen-product",
  ];
  return {
    view: candidate && supported.includes(candidate) ? candidate : "all",
    detailId: segments[2],
  };
}

export default function Home() {
  const [location, navigate] = useLocation();
  const route = useMemo(() => viewFromLocation(location), [location]);
  const [navigation, setNavigation] = useState<HomeNavigationData | null>(null);
  const [items, setItems] = useState<HomeObligationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "fallback">("supabase");
  const [reason, setReason] = useState("");
  const [lawName, setLawName] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  useEffect(() => {
    let active = true;
    loadHomeNavigation().then(result => {
      if (active) setNavigation(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadHomeObligations({
      view: route.view,
      search: appliedSearch,
      lawName: route.view === "related-law" ? lawName : "",
      detailId: route.detailId,
    }).then(result => {
      if (!active) return;
      setItems(result.items);
      setTotalCount(result.totalCount);
      setSource(result.source);
      setReason(result.reason || "");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [appliedSearch, lawName, route.detailId, route.view]);

  useEffect(() => {
    setSearchDraft("");
    setAppliedSearch("");
    if (route.view !== "related-law") setLawName("");
  }, [route.view]);

  const meta = viewMeta[route.view];
  const totalObligations = navigation?.total || 3688;
  const relationCount = navigation?.categories.relatedLaw || 3658;
  const categoryCount =
    (navigation?.categories.safetySystem || 24) +
    (navigation?.categories.recurrence || 3) +
    (navigation?.categories.correctiveOrder || 3) +
    relationCount;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setAppliedSearch(searchDraft.trim());
  };

  const quickFilters: Array<{ view: HomeObligationView; label: string }> = [
    { view: "all", label: "전체" },
    { view: "safety-system", label: "안전보건관리체계" },
    { view: "recurrence", label: "재발방지" },
    { view: "corrective-order", label: "개선·시정명령" },
    { view: "related-law", label: "관계법령" },
  ];

  return (
    <div className="page obligation-home">
      <style>{homeStyles}</style>
      <header className="obligation-home-header">
        <div>
          <p className="obligation-home-eyebrow">HOME · OBLIGATION CHECKLIST</p>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
        </div>
        <div className="obligation-home-source">
          <Database size={14} aria-hidden="true" />
          데이터 원천{" "}
          <strong>{source === "supabase" ? "Supabase" : "대체값"}</strong>
        </div>
      </header>

      <section className="obligation-home-kpis" aria-label="의무 현황 요약">
        <article className="obligation-home-kpi">
          <span>전체 의무</span>
          <strong>
            <em>{totalObligations.toLocaleString("ko-KR")}</em>건
          </strong>
        </article>
        <article className="obligation-home-kpi">
          <span>현재 선택 결과</span>
          <strong>{totalCount.toLocaleString("ko-KR")}건</strong>
        </article>
        <article className="obligation-home-kpi">
          <span>관계법령 관리조치</span>
          <strong>{relationCount.toLocaleString("ko-KR")}건</strong>
        </article>
        <article className="obligation-home-kpi">
          <span>중처법 카테고리 합계</span>
          <strong>{categoryCount.toLocaleString("ko-KR")}건</strong>
        </article>
      </section>

      <div className="obligation-home-guide">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          <strong>{meta.basis}</strong> 기준으로 분류했습니다. 관계법령 세부
          그룹은 확정 전이므로 법령 드롭다운과 검색으로 먼저 좁혀 봅니다.
        </span>
      </div>

      <div
        className="obligation-home-toolbar"
        aria-label="중처법 의무 빠른 필터"
      >
        {quickFilters.map(filter => (
          <button
            key={filter.view}
            type="button"
            className={`obligation-home-filter${route.view === filter.view ? " active" : ""}`}
            onClick={() => navigate(`/home/${filter.view}`)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {(route.view === "related-law" || route.view === "all") && (
        <form className="obligation-home-search-panel" onSubmit={submitSearch}>
          <select
            aria-label="관계법령 필터"
            value={lawName}
            onChange={event => setLawName(event.target.value)}
            disabled={route.view !== "related-law"}
          >
            <option value="">전체 관계법령</option>
            {RELATED_LAW_OPTIONS.map(law => (
              <option key={law} value={law}>
                {law}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={searchDraft}
            onChange={event => setSearchDraft(event.target.value)}
            placeholder="의무명, 법령명 또는 조문명을 입력하세요"
            aria-label="의무 검색어"
          />
          <button type="submit">
            <Search size={14} aria-hidden="true" /> 검색
          </button>
        </form>
      )}

      {route.view === "corrective-order" && (
        <section
          className="corrective-register"
          aria-label="개선 시정명령 관리"
        >
          <div className="corrective-register-header">
            <h2>개선·시정명령 공문 및 이행내역</h2>
            <span>등록 0건</span>
          </div>
          <div className="corrective-register-columns" aria-hidden="true">
            <span>개선·시정명령</span>
            <span>발신기관</span>
            <span>명령일</span>
            <span>이행기한</span>
            <span>이행내역</span>
            <span>상태</span>
          </div>
          <div className="corrective-register-empty">
            현재 등록된 위반 공문과 이행내역이 없습니다. 실제 수신 공문 데이터가
            제공되면 이 영역에 연결합니다.
          </div>
        </section>
      )}

      <section className="obligation-home-list">
        <div className="obligation-home-list-head">
          <h2>
            의무 체크리스트{" "}
            <strong>{totalCount.toLocaleString("ko-KR")}건</strong>
          </h2>
          <span>
            {loading
              ? "조회 중"
              : items.length < totalCount
                ? `상위 ${items.length}건 표시`
                : `${items.length}건 표시`}
            {reason ? ` · ${reason}` : ""}
          </span>
        </div>
        <div className="obligation-home-table-wrap">
          <table className="obligation-home-table">
            <colgroup>
              <col style={{ width: "32%" }} />
              <col style={{ width: "27%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>의무 항목</th>
                <th>법령·조문</th>
                <th>성격</th>
                <th>주기</th>
                <th>증빙</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                items.map(item => (
                  <tr key={item.id}>
                    <td className="obligation-title">
                      {item.title}
                      <small>{item.id}</small>
                    </td>
                    <td className="legal-basis">
                      {item.lawName} {item.article}
                    </td>
                    <td>{item.nature}</td>
                    <td>{item.frequency}</td>
                    <td>
                      <span className="obligation-home-badge">
                        {item.evidenceRequired ? "필요" : "미지정"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {loading && (
            <div className="obligation-home-empty">
              의무를 불러오는 중입니다.
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="obligation-home-empty">
              <AlertTriangle size={20} aria-hidden="true" />
              <strong>조회된 의무가 없습니다.</strong>
              검색 조건을 변경해 주세요.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
