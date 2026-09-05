import { Link } from "wouter";
import { ArrowRight, Bell, CalendarClock, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { initialStatuses, obligations, statusClass, statusSymbol, targets, type ComplianceStatus } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

function rateOf(values: ComplianceStatus[]) {
  const denominator = values.filter((value) => value !== "해당없음").length;
  const done = values.filter((value) => value === "이행완료").length;
  return denominator ? Math.floor((done / denominator) * 1000) / 10 : 0;
}

export default function Dashboard() {
  const { statuses, role } = useDemo();
  const all = Object.values(statuses).flatMap((item) => Object.values(item)) as ComplianceStatus[];
  const counts = all.reduce<Record<ComplianceStatus, number>>((acc, value) => ({ ...acc, [value]: acc[value] + 1 }), { 이행완료: 0, 보완필요: 0, 미이행: 0, 해당없음: 0 });
  const totalRate = rateOf(all);

  return (
    <div className="page dashboard-page">
      <div className="page-heading compact">
        <div><span className="eyebrow">MAIN DASHBOARD</span><h1>{role} 이행현황</h1><p>용인시 중대재해 관리대상과 의무이행 상태를 한눈에 확인합니다.</p></div>
        <div className="as-of"><Clock3 size={15} /><span>2026.09.05 21:00 기준</span></div>
      </div>

      <section className="dashboard-top-grid">
        <article className="dashboard-card target-card">
          <div className="card-title"><span>담당 중대재해 대상</span><strong>총 {targets.length}개소</strong></div>
          <div className="target-groups">
            <div><span>사업장</span><b>1</b></div>
            <div><span>공중이용시설</span><b>3</b></div>
            <ul><li>건축물 <strong>1개소</strong></li><li>상하수도 <strong>1개소</strong></li><li>교량 <strong>1개소</strong></li></ul>
          </div>
          <Link href="/targets" className="card-link">관리대상 확인 <ArrowRight size={14} /></Link>
        </article>

        <article className="dashboard-card due-card">
          <div className="card-title"><span>시기도래</span><strong>총 9건</strong></div>
          <div className="due-lines"><div><span>1개월 이내</span><b>5건</b></div><div><span>1주일 이내</span><b>3건</b></div><div className="today"><span>오늘 마감</span><b>1건</b></div></div>
          <CalendarClock className="card-watermark" />
        </article>

        <article className="dashboard-card overdue-card">
          <CircleAlert size={22} /><span>기한 초과</span><strong>{counts.미이행}</strong><em>건</em>
          <p>즉시 확인이 필요한 미이행 항목</p>
        </article>

        <article className="dashboard-card alert-card">
          <div className="card-title"><span><Bell size={15} /> 알림</span><b>2</b></div>
          <div className="alert-item"><i>보완</i><div><strong>안전예산 산출근거 보완 요청</strong><span>시민안전관 · 방금 전</span></div></div>
          <div className="alert-item"><i>마감</i><div><strong>정기안전점검 이행 시기 도래</strong><span>죽전교 · 2026.09.05</span></div></div>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-card rate-card">
          <div className="rate-summary">
            <div><span>전체 이행률</span><strong>{totalRate.toFixed(1)}%</strong><em className={totalRate >= 80 ? "good" : totalRate >= 70 ? "normal" : "poor"}>{totalRate >= 80 ? "우수" : totalRate >= 70 ? "보통" : "미흡"}</em></div>
            <div className="rate-ring" style={{ "--rate": `${totalRate * 3.6}deg` } as React.CSSProperties}><span>{totalRate.toFixed(0)}<small>%</small></span></div>
          </div>
          <div className="rate-table">
            <div className="rate-table-head"><span>의무이행</span><b>전체</b><b>상반기</b><b>하반기</b></div>
            {(["이행완료", "보완필요", "미이행", "해당없음"] as ComplianceStatus[]).map((status) => <div key={status}><span><i className={statusClass[status]}>{statusSymbol[status]}</i>{status}</span><b>{counts[status]}</b><b>{Math.floor(counts[status] / 2)}</b><b>{counts[status] - Math.floor(counts[status] / 2)}</b></div>)}
          </div>
        </article>

        <article className="dashboard-card obligation-card">
          <div className="card-title"><span>안전·보건 확보의무</span><small>잔여 / 전체</small></div>
          <div className="obligation-quadrants">
            {["안전보건관리체계 구축·이행", "재발방지대책 수립·이행", "개선·시정 명령 이행", "관계 법령상 의무이행"].map((label, index) => {
              const groupItems = index === 0 ? obligations.slice(0, 7) : obligations.slice(7 + index - 1, 8 + index - 1);
              const remaining = groupItems.filter((item) => statuses["target-yongin-cityhall"][item.id] !== "이행완료").length;
              return <Link href="/obligations" key={label}><span>{index + 1}</span><div><strong>{label}</strong><p><b>{remaining}건</b> / {groupItems.length}건</p></div><ArrowRight size={14} /></Link>;
            })}
          </div>
          <div className="dashboard-footnote"><CheckCircle2 size={14} /> 저장된 점검 결과를 기준으로 자동 집계합니다.</div>
        </article>
      </section>
    </div>
  );
}
