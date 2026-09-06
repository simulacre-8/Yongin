import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Database,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  buildChecklistSubitems,
  loadHomeNavigation,
  loadHomeObligationDetail,
  loadHomeObligations,
  RELATED_LAW_OPTIONS,
  type HomeNavigationData,
  type HomeObligationDetail,
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
    description: "중대산업재해 관련 제4조·제5조의 14개 의무를 확인합니다.",
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
  .obligation-home { width: 100%; max-width: 1720px; margin: 0 auto; color: #1b2330; animation: obligation-home-in 180ms cubic-bezier(.23,1,.32,1); }
  @keyframes obligation-home-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .obligation-home * { box-sizing: border-box; }
  .obligation-home-layout { display: grid; grid-template-columns: 220px minmax(0,1fr); gap: 22px; align-items: start; }
  .obligation-local-nav { position: sticky; top: 18px; overflow: hidden; border: 1px solid #dce3ea; border-radius: 12px; background: #fff; box-shadow: 0 8px 22px rgba(22,43,77,.05); }
  .obligation-local-nav-title { padding: 14px 16px; background: #172b4d; color: #fff; font-size: 15px; font-weight: 800; }
  .obligation-local-group { padding: 14px 11px 10px; border-top: 1px solid #e8edf2; }
  .obligation-local-group:first-of-type { border-top: 0; }
  .obligation-local-group h2 { margin: 0 5px 7px; color: #6c7789; font-size: 11px; font-weight: 800; letter-spacing: .05em; }
  .obligation-local-link, .obligation-local-label { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 8px; width: 100%; min-height: 34px; padding: 7px 9px; border: 1px solid transparent; border-radius: 7px; color: #495468; font-size: 12px; }
  .obligation-local-link:hover { border-color: #cbdce9; background: #f4f8fb; color: #1d6fa3; }
  .obligation-local-link.active { border-color: #b9d3e6; background: #e7f1f8; color: #155985; font-weight: 800; }
  .obligation-local-link.nested { padding-left: 24px; font-size: 11px; }
  .obligation-local-link.nested::before { content: ""; position: absolute; left: 11px; width: 5px; height: 5px; border-radius: 50%; background: #7fa9c5; }
  .obligation-local-label { color: #253b5c; font-weight: 800; }
  .obligation-local-count { color: #6c7789; font-size: 10px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .obligation-home-main { min-width: 0; }
  .obligation-home-header { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
  .obligation-home-eyebrow { margin: 0 0 7px; color: #1d6fa3; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
  .obligation-home h1 { margin: 0; color: #1b2330; font-size: 28px; font-weight: 850; letter-spacing: -.045em; }
  .obligation-home-header p:last-child { margin: 8px 0 0; color: #6c7789; font-size: 13px; }
  .obligation-home-source { display: flex; align-items: center; gap: 7px; padding: 10px 13px; border: 1px solid #dce3ea; border-radius: 9px; background: #fff; color: #6c7789; font-size: 11px; white-space: nowrap; }
  .obligation-home-source strong { color: #1d6fa3; }
  .obligation-home-kpis { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 12px; margin-bottom: 14px; }
  .obligation-home-kpi { min-height: 88px; padding: 16px 17px; border: 1px solid #dce3ea; border-radius: 10px; background: #fff; box-shadow: 0 6px 18px rgba(22,43,77,.045); }
  .obligation-home-kpi span { display: block; color: #6c7789; font-size: 11px; font-weight: 700; }
  .obligation-home-kpi strong { display: block; margin-top: 8px; color: #1b2330; font-size: 23px; font-weight: 850; line-height: 1; }
  .obligation-home-kpi strong em { color: #1d6fa3; font-size: inherit; font-style: normal; }
  .obligation-home-guide { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 13px 16px; border: 1px solid #b9d3e6; border-radius: 9px; background: #e7f1f8; color: #385269; font-size: 12px; }
  .obligation-home-guide svg { flex: 0 0 auto; color: #1d6fa3; }
  .obligation-home-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 13px 15px; border: 1px solid #dce3ea; border-radius: 10px 10px 0 0; background: #fff; }
  .obligation-home-filter { min-width: 82px; height: 32px; padding: 0 15px; border: 1px solid #d7dfe7; border-radius: 17px; background: #fff; color: #5e6877; font-size: 12px; font-weight: 700; }
  .obligation-home-filter.active { border-color: #172b4d; background: #172b4d; color: #fff; }
  .obligation-home-filter:hover { border-color: #1d6fa3; color: #1d6fa3; }
  .obligation-home-filter.active:hover { color: #fff; }
  .obligation-home-search-panel { display: grid; grid-template-columns: minmax(190px,.42fr) minmax(320px,1fr) 92px; gap: 10px; padding: 14px 15px; border: 1px solid #dce3ea; border-top: 0; background: #f4f6f8; }
  .obligation-home-search-panel select, .obligation-home-search-panel input { width: 100%; height: 38px; border: 1px solid #cfd8e1; border-radius: 8px; background: #fff; color: #263342; padding: 0 12px; font: inherit; font-size: 12px; }
  .obligation-home-search-panel button { display: flex; align-items: center; justify-content: center; gap: 6px; height: 38px; border: 1px solid #1d6fa3; border-radius: 8px; background: #fff; color: #1d6fa3; font-size: 12px; font-weight: 800; }
  .obligation-home-list { border: 1px solid #dce3ea; border-top: 0; border-radius: 0 0 10px 10px; background: #fff; overflow: hidden; }
  .obligation-home-list-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 16px; border-bottom: 1px solid #e5eaf0; }
  .obligation-home-list-head h2 { margin: 0; color: #1b2330; font-size: 14px; font-weight: 850; }
  .obligation-home-list-head h2 strong { color: #1d6fa3; font-size: inherit; }
  .obligation-home-list-head span { color: #7e8794; font-size: 10px; }
  .obligation-home-table-wrap { max-height: 620px; overflow: auto; }
  .obligation-home-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
  .obligation-home-table th { position: sticky; top: 0; z-index: 1; height: 38px; padding: 8px 10px; border-bottom: 1px solid #d8e0e8; background: #eef2f5; color: #5d6877; font-weight: 800; text-align: left; }
  .obligation-home-table td { min-height: 48px; padding: 10px; border-bottom: 1px solid #edf0f3; color: #495468; line-height: 1.5; vertical-align: middle; }
  .obligation-home-table tbody tr { cursor: pointer; }
  .obligation-home-table tbody tr:hover { background: #f4f8fb; }
  .obligation-home-table tbody tr:focus-visible { outline: 2px solid #1d6fa3; outline-offset: -2px; }
  .obligation-title-row { display: grid; grid-template-columns: minmax(0,1fr) 18px; align-items: start; gap: 8px; }
  .obligation-home-table .obligation-title { color: #1b2330; font-size: 12px; font-weight: 800; }
  .obligation-home-table .obligation-title small { display: block; margin-top: 3px; color: #1d6fa3; font-size: 9px; font-weight: 700; }
  .obligation-home-subitems { margin: 7px 0 0; padding: 0; list-style: none; color: #707b89; font-size: 10px; font-weight: 500; }
  .obligation-home-subitems li { position: relative; padding-left: 19px; }
  .obligation-home-subitems b { position: absolute; left: 0; color: #517b9b; font-size: 9px; }
  .obligation-home-table .legal-basis { color: #374657; font-weight: 650; }
  .obligation-home-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 2px 8px; border-radius: 11px; background: #e7f1f8; color: #155985; font-size: 10px; font-weight: 750; }
  .obligation-home-empty { padding: 55px 20px; color: #7f8995; text-align: center; font-size: 12px; }
  .obligation-home-empty strong { display: block; margin-bottom: 7px; color: #3e4a58; font-size: 14px; }
  .corrective-register { margin: 14px 0; border: 1px solid #dce3ea; border-radius: 10px; background: #fff; overflow: hidden; }
  .corrective-register-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid #dce3ea; background: #eef4f8; }
  .corrective-register-header h2 { margin: 0; color: #244b69; font-size: 14px; }
  .corrective-register-header span { color: #1d6fa3; font-size: 11px; font-weight: 800; }
  .corrective-register-columns { display: grid; grid-template-columns: 1.3fr .8fr .7fr .7fr 1.3fr .55fr; padding: 10px 14px; background: #f4f6f8; color: #5d6877; font-size: 10px; font-weight: 800; }
  .corrective-register-empty { padding: 28px 16px; color: #7f8995; text-align: center; font-size: 11px; }
  .obligation-detail-back { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; margin-bottom: 14px; padding: 0 12px; border: 1px solid #c8d4df; border-radius: 8px; background: #fff; color: #42566b; font-size: 12px; font-weight: 750; }
  .obligation-detail-summary { display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 10px; margin: 16px 0; }
  .obligation-detail-stat { padding: 13px 14px; border: 1px solid #dce3ea; border-radius: 9px; background: #fff; }
  .obligation-detail-stat span { display: block; color: #6c7789; font-size: 10px; font-weight: 700; }
  .obligation-detail-stat strong { display: block; margin-top: 5px; color: #1b2330; font-size: 20px; font-weight: 850; }
  .obligation-detail-stat.primary { border-color: #b9d3e6; background: #e7f1f8; }
  .obligation-detail-stat.primary strong { color: #155985; }
  .obligation-detail-note { margin-bottom: 14px; padding: 12px 14px; border-left: 3px solid #1d6fa3; background: #f2f7fa; color: #4f6274; font-size: 11px; line-height: 1.65; }
  .obligation-detail-table-wrap { overflow: auto; border: 1px solid #d8e0e8; border-radius: 10px; background: #fff; }
  .obligation-detail-table { min-width: 1180px; width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
  .obligation-detail-table th, .obligation-detail-table td { padding: 10px 8px; border-right: 1px solid #e2e7ed; border-bottom: 1px solid #e7ebef; text-align: center; vertical-align: middle; }
  .obligation-detail-table th { background: #eef2f5; color: #4f5d6c; font-weight: 800; }
  .obligation-detail-table td:first-child, .obligation-detail-table th:first-child { position: sticky; left: 0; z-index: 1; text-align: left; background: #fff; }
  .obligation-detail-table th:first-child { z-index: 2; background: #eef2f5; }
  .obligation-detail-table .subcheck { display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 8px; color: #334252; line-height: 1.55; }
  .obligation-detail-table .subcheck b { color: #1d6fa3; }
  .obligation-detail-table .unassigned { color: #8a94a3; font-size: 10px; }
  .obligation-detail-table tfoot td { background: #f4f7fa; color: #27394b; font-weight: 800; }
  @media (max-width: 1280px) { .obligation-home-layout { grid-template-columns: 196px minmax(0,1fr); gap: 16px; } .obligation-detail-summary { grid-template-columns: repeat(3,minmax(0,1fr)); } }
  @media (max-width: 980px) { .obligation-home-layout { grid-template-columns: 1fr; } .obligation-local-nav { position: static; } .obligation-home-kpis { grid-template-columns: repeat(2,minmax(0,1fr)); } .obligation-home-search-panel { grid-template-columns: 1fr; } }
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

function LocalNavigation({
  route,
  navigation,
}: {
  route: ReturnType<typeof viewFromLocation>;
  navigation: HomeNavigationData | null;
}) {
  const categoryCounts = navigation?.categories || {
    safetySystem: 24,
    recurrence: 3,
    correctiveOrder: 3,
    relatedLaw: 3658,
  };
  const accidentCounts = navigation?.accidentTypes || {
    industrial: 14,
    citizen: 22,
    citizenFacility: 13,
    citizenProduct: 9,
  };
  const categoryItems: Array<[HomeObligationView, string, number]> = [
    ["all", "전체", navigation?.total || 3688],
    ["safety-system", "안전보건관리체계", categoryCounts.safetySystem],
    ["recurrence", "재발방지 대책", categoryCounts.recurrence],
    ["corrective-order", "개선·시정명령 이행", categoryCounts.correctiveOrder],
    ["related-law", "관계법령 관리조치", categoryCounts.relatedLaw],
  ];
  return (
    <aside className="obligation-local-nav" aria-label="홈 의무 분류">
      <div className="obligation-local-nav-title">의무 분류</div>
      <section className="obligation-local-group">
        <h2>중처법 카테고리별</h2>
        {categoryItems.map(([view, label, count]) => (
          <Link
            key={view}
            href={`/home/${view}`}
            className={`obligation-local-link${route.view === view ? " active" : ""}`}
          >
            <span>{label}</span>
            <strong className="obligation-local-count">
              {count.toLocaleString("ko-KR")}
            </strong>
          </Link>
        ))}
      </section>
      <section className="obligation-local-group">
        <h2>중대재해 유형별</h2>
        <Link
          href="/home/industrial"
          className={`obligation-local-link${route.view === "industrial" ? " active" : ""}`}
        >
          <span>중대산업재해</span>
          <strong className="obligation-local-count">
            {accidentCounts.industrial}
          </strong>
        </Link>
        <div className="obligation-local-label">
          <span>중대시민재해</span>
          <strong className="obligation-local-count">
            {accidentCounts.citizen}
          </strong>
        </div>
        <Link
          href="/home/citizen-facility"
          className={`obligation-local-link nested${route.view === "citizen-facility" ? " active" : ""}`}
        >
          <span>공중이용시설·공중교통수단</span>
          <strong className="obligation-local-count">
            {accidentCounts.citizenFacility}
          </strong>
        </Link>
        <Link
          href="/home/citizen-product"
          className={`obligation-local-link nested${route.view === "citizen-product" ? " active" : ""}`}
        >
          <span>원료·제조물</span>
          <strong className="obligation-local-count">
            {accidentCounts.citizenProduct}
          </strong>
        </Link>
      </section>
    </aside>
  );
}

function DetailView({
  item,
  detail,
  backHref,
}: {
  item: HomeObligationItem;
  detail: HomeObligationDetail | null;
  backHref: string;
}) {
  const subitems = buildChecklistSubitems(item);
  const counts = detail?.counts || {
    total: 0,
    done: 0,
    supplement: 0,
    incomplete: 0,
    notApplicable: 0,
    completionRate: 0,
  };
  const stats = [
    ["이행률", `${counts.completionRate.toFixed(1)}%`, true],
    ["전체 점검사항", `${counts.total}건`, false],
    ["이행완료", `${counts.done}건`, false],
    ["보완필요", `${counts.supplement}건`, false],
    ["미이행", `${counts.incomplete}건`, false],
    ["해당없음", `${counts.notApplicable}건`, false],
  ] as const;

  return (
    <>
      <Link href={backHref} className="obligation-detail-back">
        <ArrowLeft size={14} aria-hidden="true" /> 목록으로
      </Link>
      <header className="obligation-home-header">
        <div>
          <p className="obligation-home-eyebrow">
            OBLIGATION DETAIL · {item.id}
          </p>
          <h1>{item.title}</h1>
          <p>
            {item.lawName} {item.article} · {item.frequency}
          </p>
        </div>
        <div className="obligation-home-source">
          <Database size={14} aria-hidden="true" />
          연결 관리대상 <strong>{detail?.mappedTargetCount || 0}개</strong>
        </div>
      </header>

      <section
        className="obligation-detail-summary"
        aria-label="의무 이행 집계"
      >
        {stats.map(([label, value, primary]) => (
          <article
            key={label}
            className={`obligation-detail-stat${primary ? " primary" : ""}`}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <div className="obligation-detail-note" role="note">
        세부 점검사항은 클라이언트 의무풀의 조문명과 상세문장을 그대로 분리해
        표시합니다. 현재 Supabase에는 기획조정실·행정국·중대재해예방팀별 배정
        데이터가 없으므로 조직 셀은 임의 수치 대신 <strong>미배정</strong>으로
        표시합니다. 이행률은 저장된 의무 상태에서 해당없음을 분모에서 제외해
        계산합니다.
      </div>

      <div className="obligation-detail-table-wrap">
        <table className="obligation-detail-table">
          <colgroup>
            <col style={{ width: "33%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>세부 점검사항(하위 의무명)</th>
              <th>이행률</th>
              <th>전체</th>
              <th>완료</th>
              <th>보완</th>
              <th>미이행</th>
              <th>해당없음</th>
              <th>기획조정실</th>
              <th>행정국</th>
              <th>중대재해예방팀</th>
            </tr>
          </thead>
          <tbody>
            {(subitems.length ? subitems : [item.detail]).map(
              (subitem, index) => (
                <tr key={`${item.id}-${index}`}>
                  <td>
                    <div className="subcheck">
                      <b>{index + 1}.</b>
                      <span>{subitem}</span>
                    </div>
                  </td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td className="unassigned">미배정</td>
                  <td className="unassigned">미배정</td>
                  <td className="unassigned">미배정</td>
                </tr>
              )
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>의무 합계</td>
              <td>{counts.completionRate.toFixed(1)}%</td>
              <td>{counts.total}</td>
              <td>{counts.done}</td>
              <td>{counts.supplement}</td>
              <td>{counts.incomplete}</td>
              <td>{counts.notApplicable}</td>
              <td colSpan={3}>조직 배정 데이터 연결 전</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export default function Home() {
  const [location, navigate] = useLocation();
  const route = useMemo(() => viewFromLocation(location), [location]);
  const [navigation, setNavigation] = useState<HomeNavigationData | null>(null);
  const [items, setItems] = useState<HomeObligationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [detail, setDetail] = useState<HomeObligationDetail | null>(null);
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
    setDetail(null);
    loadHomeObligations({
      view: route.view,
      search: appliedSearch,
      lawName: route.view === "related-law" ? lawName : "",
      detailId: route.detailId,
    }).then(async result => {
      if (!active) return;
      setItems(result.items);
      setTotalCount(result.totalCount);
      setSource(result.source);
      setReason(result.reason || "");
      if (route.detailId && result.items[0]) {
        const nextDetail = await loadHomeObligationDetail(result.items[0].id);
        if (active) setDetail(nextDetail);
      }
      if (active) setLoading(false);
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
  const selectedItem = route.detailId ? items[0] : undefined;

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
      <div className="obligation-home-layout">
        <LocalNavigation route={route} navigation={navigation} />
        <main className="obligation-home-main">
          {selectedItem ? (
            <DetailView
              item={selectedItem}
              detail={detail}
              backHref={`/home/${route.view}`}
            />
          ) : (
            <>
              <header className="obligation-home-header">
                <div>
                  <p className="obligation-home-eyebrow">
                    HOME · OBLIGATION CHECKLIST
                  </p>
                  <h1>{meta.title}</h1>
                  <p>{meta.description}</p>
                </div>
                <div className="obligation-home-source">
                  <Database size={14} aria-hidden="true" />
                  데이터 원천{" "}
                  <strong>
                    {source === "supabase" ? "Supabase" : "대체값"}
                  </strong>
                </div>
              </header>

              <section
                className="obligation-home-kpis"
                aria-label="의무 현황 요약"
              >
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
                  <strong>{meta.basis}</strong> 기준으로 분류했습니다. 의무
                  항목을 선택하면 하위 점검사항과 저장된 이행 상태 집계를 확인할
                  수 있습니다.
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
                <form
                  className="obligation-home-search-panel"
                  onSubmit={submitSearch}
                >
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
                  <div
                    className="corrective-register-columns"
                    aria-hidden="true"
                  >
                    <span>개선·시정명령</span>
                    <span>발신기관</span>
                    <span>명령일</span>
                    <span>이행기한</span>
                    <span>이행내역</span>
                    <span>상태</span>
                  </div>
                  <div className="corrective-register-empty">
                    현재 등록된 위반 공문과 이행내역이 없습니다. 실제 수신 공문
                    데이터가 제공되면 이 영역에 연결합니다.
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
                      <col style={{ width: "38%" }} />
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>의무 항목·세부 점검사항</th>
                        <th>법령·조문</th>
                        <th>성격</th>
                        <th>주기</th>
                        <th>증빙</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading &&
                        items.map(item => {
                          const subitems = buildChecklistSubitems(item).slice(
                            0,
                            3
                          );
                          const href = `/home/${route.view}/${encodeURIComponent(item.id)}`;
                          return (
                            <tr
                              key={item.id}
                              tabIndex={0}
                              aria-label={`${item.title} 상세 보기`}
                              onClick={() => navigate(href)}
                              onKeyDown={event => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  navigate(href);
                                }
                              }}
                            >
                              <td className="obligation-title">
                                <div className="obligation-title-row">
                                  <span>
                                    {item.title}
                                    <small>{item.id}</small>
                                  </span>
                                  <ChevronRight size={16} aria-hidden="true" />
                                </div>
                                {subitems.length > 0 && (
                                  <ol className="obligation-home-subitems">
                                    {subitems.map((subitem, index) => (
                                      <li key={subitem}>
                                        <b>{index + 1}.</b>
                                        {subitem}
                                      </li>
                                    ))}
                                  </ol>
                                )}
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
                          );
                        })}
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
                      <strong>조회된 의무가 없습니다.</strong>검색 조건을 변경해
                      주세요.
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
