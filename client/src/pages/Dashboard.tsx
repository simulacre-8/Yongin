import { useMemo, useState } from "react";
import { obligations, targets, type ComplianceStatus } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

type StatusCounts = Record<ComplianceStatus, number>;
type Period = "상반기" | "하반기";
type ObligationSnapshot = {
  id: string;
  status: ComplianceStatus;
  period: Period;
};

const statusLabels: ComplianceStatus[] = [
  "이행완료",
  "보완필요",
  "미이행",
  "해당없음",
];

const dutyDomains = [
  { number: 1, label: "안전보건관리체계 구축·이행", prefix: "①" },
  { number: 2, label: "재발방지대책 수립·이행", prefix: "②" },
  { number: 3, label: "개선·시정 명령 이행", prefix: "③" },
  { number: 4, label: "관계 법령상 의무이행", prefix: "④" },
];

function emptyCounts(): StatusCounts {
  return { 이행완료: 0, 보완필요: 0, 미이행: 0, 해당없음: 0 };
}

function countStatuses(items: ObligationSnapshot[]): StatusCounts {
  return items.reduce<StatusCounts>((counts, item) => {
    counts[item.status] += 1;
    return counts;
  }, emptyCounts());
}

function completionRate(counts: StatusCounts) {
  const applicable = counts.이행완료 + counts.보완필요 + counts.미이행;
  return applicable === 0 ? 0 : (counts.이행완료 / applicable) * 100;
}

function gradeFor(rate: number) {
  if (rate >= 80) return "우수" as const;
  if (rate >= 70) return "보통" as const;
  return "미흡" as const;
}

function dueDateFor(value: string, year: number) {
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);
  if (monthMatch) {
    return new Date(
      Number(monthMatch[1]),
      Number(monthMatch[2]),
      0,
      23,
      59,
      59
    );
  }
  if (value === "상반기") return new Date(year, 5, 30, 23, 59, 59);
  if (value === "하반기") return new Date(year, 11, 31, 23, 59, 59);
  return null;
}

function periodFor(value: string): Period {
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);
  if (monthMatch) {
    return Number(monthMatch[2]) <= 6 ? "상반기" : "하반기";
  }
  return value === "상반기" ? "상반기" : "하반기";
}

function targetTypeFor(type: string) {
  if (type.includes("공중이용시설")) return "공중이용시설";
  if (type.includes("원료·제조물")) return "원료·제조물";
  if (type.includes("사업장")) return "사업장";
  return type.split("/")[0].trim();
}

function targetSubtypeFor(type: string) {
  const slashPart = type.split("/")[1]?.trim();
  if (slashPart) return slashPart;
  return type.replace(/^.*·/, "").trim();
}

const dashboardStyles = `
  .adoms-dashboard {
    --adoms-green-dark: #84256f;
    --adoms-green: #a93193;
    --adoms-green-soft: #f1f1f3;
    --adoms-line: #a8ada7;
    --adoms-red: #a93193;
    --adoms-text: #161b17;
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
    color: var(--adoms-text);
    font-family: "Noto Sans KR", "Malgun Gothic", sans-serif;
    animation: adoms-dashboard-in 180ms ease-out;
  }
  @keyframes adoms-dashboard-in {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .adoms-dashboard *, .adoms-dashboard *::before, .adoms-dashboard *::after {
    box-sizing: border-box;
  }
  .adoms-layout {
    display: grid;
    grid-template-columns: minmax(220px, 0.8fr) minmax(570px, 2.25fr) minmax(272px, 0.92fr);
    gap: 24px;
    align-items: stretch;
  }
  .adoms-target-panel, .adoms-due-card, .adoms-rate-panel,
  .adoms-notification-panel, .adoms-duty-panel {
    border: 1px solid #b4b8b2;
    background: #fff;
    box-shadow: none;
  }
  .adoms-target-panel {
    display: flex;
    min-height: 660px;
    flex-direction: column;
    padding: 22px 26px 18px;
    border-radius: 18px;
    background: var(--adoms-green-soft);
  }
  .adoms-target-heading, .adoms-card-heading, .adoms-panel-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .adoms-target-heading {
    padding-bottom: 17px;
    border-bottom: 1px solid #d2d2d7;
  }
  .adoms-target-heading h2, .adoms-card-heading h2, .adoms-panel-heading h2 {
    margin: 0;
    color: #131713;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.055em;
  }
  .adoms-target-total, .adoms-due-total {
    margin: 0;
    color: #202620;
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }
  .adoms-target-total b, .adoms-due-total b {
    color: var(--adoms-green-dark);
    font-size: inherit;
    line-height: inherit;
  }
  .adoms-target-list {
    display: grid;
    gap: 22px;
    margin: 24px 0 0;
    padding: 0;
    list-style: none;
    overflow: auto;
  }
  .adoms-target-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    font-size: 14px;
    font-weight: 750;
    letter-spacing: -0.045em;
  }
  .adoms-target-item > strong {
    font-size: 17px;
  }
  .adoms-target-sublist {
    grid-column: 1 / -1;
    display: grid;
    gap: 9px;
    margin: 4px 0 0 16px;
    padding: 0;
    color: #66666c;
    list-style: none;
    font-size: 12px;
    font-weight: 500;
  }
  .adoms-target-sublist li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }
  .adoms-target-sublist li::before {
    content: "-";
    position: absolute;
    margin-left: -12px;
  }
  .adoms-target-sublist strong { color: #66666c; font-size: 14px; }
  .adoms-target-name {
    display: block;
    margin-top: auto;
    padding-top: 18px;
    border-top: 1px solid #d2d2d7;
    color: #5a5a60;
    font-size: 13px;
    font-weight: 700;
  }
  .adoms-center-column, .adoms-right-column {
    display: grid;
    min-width: 0;
    gap: 24px;
  }
  .adoms-center-column { grid-template-rows: minmax(220px, auto) minmax(410px, 1fr); }
  .adoms-right-column { grid-template-rows: minmax(250px, 0.8fr) minmax(320px, 1fr); }
  .adoms-deadline-row {
    display: grid;
    grid-template-columns: minmax(300px, 1.12fr) minmax(175px, 0.62fr);
    gap: 24px;
    min-height: 220px;
  }
  .adoms-due-card {
    padding: 20px 29px;
    border-radius: 18px;
    background: var(--adoms-green-soft);
  }
  .adoms-card-heading { margin-bottom: 15px; }
  .adoms-card-heading h2 { font-size: 16px; font-weight: 800; }
  .adoms-due-list {
    display: grid;
    gap: 8px;
    margin: 0;
  }
  .adoms-due-list div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    font-weight: 650;
  }
  .adoms-due-list dt, .adoms-due-list dd { margin: 0; }
  .adoms-due-list dd { color: var(--adoms-green-dark); font-size: 14px; font-weight: 800; }
  .adoms-due-list div:last-child {
    margin-top: 2px;
    padding: 7px 12px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.7);
  }
  .adoms-overdue-card {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: space-between;
    padding: 34px 28px 23px;
    border: 2px solid var(--adoms-red);
    border-radius: 18px;
    background: #fff;
  }
  .adoms-overdue-card h2 {
    margin: 0;
    color: #151515;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.055em;
  }
  .adoms-overdue-count {
    align-self: flex-end;
    margin: 0;
    color: var(--adoms-red);
    font-size: 16px;
    font-weight: 850;
    letter-spacing: -0.05em;
    line-height: 1;
  }
  .adoms-overdue-count small { color: inherit; font-size: inherit; font-weight: 700; }
  .adoms-rate-panel {
    display: flex;
    flex-direction: column;
    min-height: 410px;
    padding: 21px 22px 18px;
    border-radius: 18px;
  }
  .adoms-rate-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 18px;
    padding-bottom: 13px;
    border-bottom: 1px solid #090909;
  }
  .adoms-rate-grid {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(220px, 0.78fr) minmax(375px, 1.22fr);
    gap: 24px;
    min-height: 0;
  }
  .adoms-rate-visual {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }
  .adoms-rate-title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 9px;
    margin: 0;
  }
  .adoms-rate-title h2 { margin: 0; font-size: 16px; letter-spacing: -0.055em; }
  .adoms-rate-title strong { color: var(--adoms-green-dark); font-size: 16px; line-height: 1; }
  .adoms-grade-row { display: grid; grid-template-columns: repeat(3, 1fr); }
  .adoms-grade {
    padding: 7px 3px;
    border: 1px solid #aeb2ae;
    color: #252925;
    font-size: 13px;
    font-weight: 750;
    text-align: center;
  }
  .adoms-grade-good { background: #f2f2f4; }
  .adoms-grade-normal { background: #fff1c9; }
  .adoms-grade-poor { background: #fce3d7; }
  .adoms-grade-active {
    position: relative;
    z-index: 1;
    border: 1px solid #5b5e59;
    box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.22);
  }
  .adoms-half-bars {
    display: flex;
    flex: 1;
    align-items: end;
    justify-content: center;
    gap: 24px;
    min-height: 235px;
    margin: 17px 18px 0;
    padding: 10px 0 0;
    border-bottom: 1px solid #a4aaa3;
  }
  .adoms-half-bar-group {
    display: grid;
    grid-template-rows: minmax(154px, 1fr) auto;
    width: min(42%, 125px);
    gap: 9px;
    text-align: center;
  }
  .adoms-half-bar-area {
    display: flex;
    align-items: end;
    min-height: 154px;
  }
  .adoms-half-bar {
    display: flex;
    width: 100%;
    min-height: 12px;
    align-items: center;
    justify-content: center;
    padding: 8px 4px;
    color: #fff;
    font-size: clamp(13px, 1.4vw, 19px);
    font-weight: 850;
    line-height: 1;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.14);
  }
  .adoms-half-bar-good { background: #a93193; }
  .adoms-half-bar-normal { background: #ffc000; }
  .adoms-half-bar-poor { background: #ed7d31; }
  .adoms-half-bar-label { color: #6e716e; font-size: 13px; font-weight: 750; }
  .adoms-summary-area { min-width: 0; }
  .adoms-filters {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 15px;
    margin: 0;
  }
  .adoms-filter {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #171917;
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
  }
  .adoms-filter select {
    min-width: 93px;
    height: 31px;
    padding: 2px 25px 2px 8px;
    border: 1px solid #8d938e;
    border-radius: 5px;
    color: #656a66;
    background: #fff;
    font-family: inherit;
    font-size: 12px;
  }
  .adoms-filter:last-child select { min-width: 132px; }
  .adoms-summary-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    color: #202320;
    font-size: 12px;
    text-align: center;
  }
  .adoms-summary-table th, .adoms-summary-table td {
    height: 35px;
    border: 1px solid #a6aaa6;
    padding: 3px 5px;
  }
  .adoms-summary-table thead th { background: #e9eaec; font-size: 12px; font-weight: 850; }
  .adoms-summary-table tbody th { font-weight: 600; }
  .adoms-summary-table .adoms-rate-row th, .adoms-summary-table .adoms-rate-row td,
  .adoms-summary-table .adoms-total-row th, .adoms-summary-table .adoms-total-row td {
    font-size: 14px;
    font-weight: 850;
  }
  .adoms-rate-cell-good { background: #f3f3f5; }
  .adoms-rate-cell-normal { background: #fff2c6; }
  .adoms-rate-cell-poor { background: #fbe4d5; }
  .adoms-total-row { border-bottom: 2px solid #777d77; }
  .adoms-notification-panel, .adoms-duty-panel {
    padding: 19px 21px;
    border-radius: 18px;
  }
  .adoms-panel-heading {
    margin-bottom: 16px;
    padding-bottom: 11px;
    border-bottom: 1px solid #090909;
  }
  .adoms-panel-heading h2 { color: var(--adoms-green-dark); font-size: 16px; }
  .adoms-notification-count {
    display: grid;
    width: 25px;
    height: 25px;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: var(--adoms-green);
    font-size: 13px;
    font-weight: 850;
  }
  .adoms-notification-list {
    display: grid;
    gap: 11px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .adoms-notification-item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 9px;
    align-items: start;
    padding: 10px 0;
    border-bottom: 1px solid #d8ddd6;
  }
  .adoms-notification-item:last-child { border-bottom: 0; }
  .adoms-notification-status {
    display: inline-block;
    min-width: 40px;
    padding: 4px 5px;
    border-radius: 3px;
    color: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
    text-align: center;
  }
  .adoms-notification-supplement { background: #d99e10; }
  .adoms-notification-missing { background: #d94a3f; }
  .adoms-notification-copy { min-width: 0; }
  .adoms-notification-copy strong {
    display: block;
    overflow: hidden;
    color: #252925;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.04em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .adoms-notification-copy span { display: block; margin-top: 4px; color: #737a73; font-size: 10px; }
  .adoms-no-notification { margin: 38px 0; color: #747b74; font-size: 12px; text-align: center; }
  .adoms-duty-panel { display: flex; min-height: 0; flex-direction: column; }
  .adoms-duty-panel .adoms-panel-heading { margin-bottom: 14px; }
  .adoms-duty-panel .adoms-panel-heading h2 { font-size: 15px; }
  .adoms-duty-panel .adoms-panel-heading small { color: #6f756f; font-size: 10px; font-weight: 650; }
  .adoms-duty-grid {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .adoms-duty-item {
    display: block;
    min-height: 82px;
    padding: 12px;
    border: 1px solid #d2c8d4;
    border-radius: 8px;
    background: #f3eff4;
  }
  .adoms-duty-copy { min-width: 0; }
  .adoms-duty-copy strong { display: block; color: #353b35; font-size: 11px; font-weight: 750; letter-spacing: -0.055em; line-height: 1.35; }
  .adoms-duty-copy p { margin: 8px 0 0; color: #5e665e; font-size: 11px; }
  .adoms-duty-copy b { color: var(--adoms-green-dark); font-size: inherit; }
  @media (max-width: 1220px) {
    .adoms-layout { grid-template-columns: minmax(210px, 0.75fr) minmax(560px, 2fr); }
    .adoms-right-column { grid-column: 1 / -1; grid-template-columns: minmax(280px, 0.75fr) minmax(520px, 1.25fr); grid-template-rows: minmax(220px, 1fr); }
    .adoms-target-panel { min-height: 0; }
  }
  @media (max-width: 860px) {
    .adoms-layout, .adoms-right-column { grid-template-columns: 1fr; }
    .adoms-center-column, .adoms-right-column { grid-column: auto; grid-template-rows: auto; }
    .adoms-deadline-row, .adoms-rate-grid { grid-template-columns: 1fr; }
    .adoms-target-panel { min-height: 390px; }
    .adoms-rate-panel { min-height: 0; }
    .adoms-rate-visual { min-height: 360px; }
  }
  @media (max-width: 540px) {
    .adoms-dashboard { min-width: 0; }
    .adoms-target-panel, .adoms-due-card, .adoms-rate-panel, .adoms-notification-panel, .adoms-duty-panel { border-width: 1px; }
    .adoms-target-panel, .adoms-due-card, .adoms-rate-panel, .adoms-notification-panel, .adoms-duty-panel { padding-left: 15px; padding-right: 15px; }
    .adoms-deadline-row { gap: 12px; }
    .adoms-overdue-card { min-height: 145px; padding: 22px; }
    .adoms-filters { justify-content: flex-start; gap: 9px; flex-wrap: wrap; }
    .adoms-filter { font-size: 16px; }
    .adoms-summary-table { font-size: 12px; }
    .adoms-summary-table th, .adoms-summary-table td { height: 32px; padding: 2px; }
    .adoms-summary-table .adoms-rate-row th, .adoms-summary-table .adoms-rate-row td, .adoms-summary-table .adoms-total-row th, .adoms-summary-table .adoms-total-row td { font-size: 13px; }
    .adoms-duty-grid { grid-template-columns: 1fr; }
  }
`;

export default function Dashboard() {
  const { statuses, dueDates } = useDemo();
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedTargetType, setSelectedTargetType] = useState("공중이용시설");

  const cityHall =
    targets.find(target => target.id === "target-yongin-cityhall") ??
    targets[0];
  const cityHallStatuses = statuses[cityHall.id] ?? {};

  const dashboardData = useMemo(() => {
    const referenceYear = Number(selectedYear);
    const snapshots: ObligationSnapshot[] = obligations.map(obligation => ({
      id: obligation.id,
      status: cityHallStatuses[obligation.id] ?? "해당없음",
      period: periodFor(dueDates[obligation.id] ?? obligation.defaultDue),
    }));
    const allCounts = countStatuses(snapshots);
    const firstHalf = snapshots.filter(item => item.period === "상반기");
    const secondHalf = snapshots.filter(item => item.period === "하반기");
    const firstHalfCounts = countStatuses(firstHalf);
    const secondHalfCounts = countStatuses(secondHalf);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSevenDays = new Date(today);
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const inOneMonth = new Date(today);
    inOneMonth.setMonth(inOneMonth.getMonth() + 1);

    const outstandingDue = obligations.flatMap(obligation => {
      const status = cityHallStatuses[obligation.id] ?? "해당없음";
      const dueValue = dueDates[obligation.id] ?? obligation.defaultDue;
      const dueAt = dueDateFor(dueValue, referenceYear);
      if (status === "이행완료" || status === "해당없음" || !dueAt) return [];
      return [{ id: obligation.id, dueAt }];
    });
    const upcoming = outstandingDue.filter(item => item.dueAt >= today);
    const overdue = outstandingDue.filter(item => item.dueAt < today);

    const pendingNotices = obligations
      .filter(obligation => {
        const status = cityHallStatuses[obligation.id] ?? "해당없음";
        return status === "보완필요" || status === "미이행";
      })
      .map(obligation => ({
        id: obligation.id,
        title: obligation.title,
        status: cityHallStatuses[obligation.id] as "보완필요" | "미이행",
        due: dueDates[obligation.id] ?? obligation.defaultDue,
      }));

    const dutyBalances = dutyDomains.map(domain => {
      const items = obligations.filter(obligation =>
        obligation.group.startsWith(domain.prefix)
      );
      const applicableItems = items.filter(
        obligation =>
          (cityHallStatuses[obligation.id] ?? "해당없음") !== "해당없음"
      );
      const remaining = applicableItems.filter(
        obligation =>
          (cityHallStatuses[obligation.id] ?? "해당없음") !== "이행완료"
      ).length;
      return { ...domain, remaining, total: applicableItems.length };
    });

    return {
      allCounts,
      firstHalfCounts,
      secondHalfCounts,
      totalRate: completionRate(allCounts),
      firstHalfRate: completionRate(firstHalfCounts),
      secondHalfRate: completionRate(secondHalfCounts),
      due: {
        total: outstandingDue.length,
        oneMonth: upcoming.filter(item => item.dueAt <= inOneMonth).length,
        oneWeek: upcoming.filter(item => item.dueAt <= inSevenDays).length,
        today: upcoming.filter(item => item.dueAt.getTime() === today.getTime())
          .length,
        overdue: overdue.length,
      },
      notices: pendingNotices,
      dutyBalances,
    };
  }, [cityHallStatuses, dueDates, selectedYear]);

  const targetGroups = useMemo(() => {
    return [cityHall].reduce<
      Array<{ type: string; items: Array<{ label: string; count: number }> }>
    >((groups, target) => {
      const type = targetTypeFor(target.type);
      const subtype = targetSubtypeFor(target.type);
      const group = groups.find(item => item.type === type);
      const item = { label: subtype, count: 1 };
      if (group) group.items.push(item);
      else groups.push({ type, items: [item] });
      return groups;
    }, []);
  }, [cityHall]);

  const totalGrade = gradeFor(dashboardData.totalRate);
  const firstHalfGrade = gradeFor(dashboardData.firstHalfRate);
  const secondHalfGrade = gradeFor(dashboardData.secondHalfRate);
  const countRows = [
    { label: "이행완료", status: "이행완료" as const },
    { label: "보완필요", status: "보완필요" as const },
    { label: "미이행", status: "미이행" as const },
    { label: "해당없음", status: "해당없음" as const },
  ];

  return (
    <main className="adoms-dashboard" aria-label="중대재해 이행현황 대시보드">
      <style>{dashboardStyles}</style>
      <div className="adoms-layout">
        <aside
          className="adoms-target-panel"
          aria-labelledby="adoms-target-title"
        >
          <div className="adoms-target-heading">
            <h2 id="adoms-target-title">담당 중대재해 대상</h2>
            <p className="adoms-target-total">
              총 <b>{cityHall ? 1 : 0}</b>개소
            </p>
          </div>
          <ul className="adoms-target-list">
            {targetGroups.map(group => (
              <li className="adoms-target-item" key={group.type}>
                <span>{group.type}</span>
                <strong>{group.items.length}개소</strong>
                <ul className="adoms-target-sublist">
                  {group.items.map((item, index) => (
                    <li key={`${item.label}-${index}`}>
                      <span>{item.label}</span>
                      <strong>{item.count}개소</strong>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <span className="adoms-target-name">{cityHall.name}</span>
        </aside>

        <section className="adoms-center-column" aria-label="이행현황 집계">
          <div className="adoms-deadline-row">
            <section
              className="adoms-due-card"
              aria-labelledby="adoms-due-title"
            >
              <div className="adoms-card-heading">
                <h2 id="adoms-due-title">시기도래</h2>
                <p className="adoms-due-total">
                  총 <b>{dashboardData.due.total}</b>건
                </p>
              </div>
              <dl className="adoms-due-list">
                <div>
                  <dt>1개월 이내</dt>
                  <dd>{dashboardData.due.oneMonth}건</dd>
                </div>
                <div>
                  <dt>1주일 이내</dt>
                  <dd>{dashboardData.due.oneWeek}건</dd>
                </div>
                <div>
                  <dt>오늘 마감</dt>
                  <dd>{dashboardData.due.today}건</dd>
                </div>
              </dl>
            </section>

            <section
              className="adoms-overdue-card"
              aria-labelledby="adoms-overdue-title"
            >
              <h2 id="adoms-overdue-title">기한 초과</h2>
              <p className="adoms-overdue-count">
                {dashboardData.due.overdue}
                <small> 건</small>
              </p>
            </section>
          </div>

          <section
            className="adoms-rate-panel"
            aria-labelledby="adoms-rate-title"
          >
            <div className="adoms-rate-header">
              <div className="adoms-rate-title">
                <h2 id="adoms-rate-title">전체 이행률</h2>
                <strong>{dashboardData.totalRate.toFixed(2)}%</strong>
              </div>
              <div className="adoms-filters">
                <label className="adoms-filter">
                  <span>년도</span>
                  <select
                    value={selectedYear}
                    onChange={event => setSelectedYear(event.target.value)}
                    aria-label="년도 선택"
                  >
                    <option value="2026">2026</option>
                  </select>
                </label>
                <label className="adoms-filter">
                  <span>대상</span>
                  <select
                    value={selectedTargetType}
                    onChange={event =>
                      setSelectedTargetType(event.target.value)
                    }
                    aria-label="대상 선택"
                  >
                    <option value="공중이용시설">공중이용시설</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="adoms-rate-grid">
              <div className="adoms-rate-visual">
                <div
                  className="adoms-grade-row"
                  aria-label={`이행률 등급 ${totalGrade}`}
                >
                  <span
                    className={`adoms-grade adoms-grade-good ${totalGrade === "우수" ? "adoms-grade-active" : ""}`}
                  >
                    우수
                  </span>
                  <span
                    className={`adoms-grade adoms-grade-normal ${totalGrade === "보통" ? "adoms-grade-active" : ""}`}
                  >
                    보통
                  </span>
                  <span
                    className={`adoms-grade adoms-grade-poor ${totalGrade === "미흡" ? "adoms-grade-active" : ""}`}
                  >
                    미흡
                  </span>
                </div>
                <div
                  className="adoms-half-bars"
                  aria-label="상반기와 하반기 이행률"
                >
                  {[
                    {
                      label: "상반기",
                      rate: dashboardData.firstHalfRate,
                      grade: firstHalfGrade,
                    },
                    {
                      label: "하반기",
                      rate: dashboardData.secondHalfRate,
                      grade: secondHalfGrade,
                    },
                  ].map(item => (
                    <div className="adoms-half-bar-group" key={item.label}>
                      <div className="adoms-half-bar-area">
                        <div
                          className={`adoms-half-bar adoms-half-bar-${item.grade === "우수" ? "good" : item.grade === "보통" ? "normal" : "poor"}`}
                          style={{ height: `${Math.max(item.rate, 6)}%` }}
                        >
                          {item.rate.toFixed(2)}%
                        </div>
                      </div>
                      <span className="adoms-half-bar-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="adoms-summary-area">
                <table className="adoms-summary-table">
                  <thead>
                    <tr>
                      <th scope="col">의무이행</th>
                      <th scope="col">전체</th>
                      <th scope="col">상반기</th>
                      <th scope="col">하반기</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="adoms-rate-row">
                      <th scope="row">이행률</th>
                      <td
                        className={`adoms-rate-cell-${totalGrade === "우수" ? "good" : totalGrade === "보통" ? "normal" : "poor"}`}
                      >
                        {dashboardData.totalRate.toFixed(2)}%
                      </td>
                      <td
                        className={`adoms-rate-cell-${firstHalfGrade === "우수" ? "good" : firstHalfGrade === "보통" ? "normal" : "poor"}`}
                      >
                        {dashboardData.firstHalfRate.toFixed(2)}%
                      </td>
                      <td
                        className={`adoms-rate-cell-${secondHalfGrade === "우수" ? "good" : secondHalfGrade === "보통" ? "normal" : "poor"}`}
                      >
                        {dashboardData.secondHalfRate.toFixed(2)}%
                      </td>
                    </tr>
                    {countRows.map(row => (
                      <tr key={row.status}>
                        <th scope="row">{row.label}</th>
                        <td>{dashboardData.allCounts[row.status]}</td>
                        <td>{dashboardData.firstHalfCounts[row.status]}</td>
                        <td>{dashboardData.secondHalfCounts[row.status]}</td>
                      </tr>
                    ))}
                    <tr className="adoms-total-row">
                      <th scope="row">합 계</th>
                      <td>{obligations.length}</td>
                      <td>
                        {dashboardData.firstHalfCounts.이행완료 +
                          dashboardData.firstHalfCounts.보완필요 +
                          dashboardData.firstHalfCounts.미이행 +
                          dashboardData.firstHalfCounts.해당없음}
                      </td>
                      <td>
                        {dashboardData.secondHalfCounts.이행완료 +
                          dashboardData.secondHalfCounts.보완필요 +
                          dashboardData.secondHalfCounts.미이행 +
                          dashboardData.secondHalfCounts.해당없음}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>

        <aside className="adoms-right-column">
          <section
            className="adoms-notification-panel"
            aria-labelledby="adoms-notification-title"
          >
            <div className="adoms-panel-heading">
              <h2 id="adoms-notification-title">알림</h2>
              <span className="adoms-notification-count">
                {dashboardData.notices.length}
              </span>
            </div>
            {dashboardData.notices.length ? (
              <ul className="adoms-notification-list">
                {dashboardData.notices.map(notice => (
                  <li className="adoms-notification-item" key={notice.id}>
                    <i
                      className={`adoms-notification-status adoms-notification-${notice.status === "보완필요" ? "supplement" : "missing"}`}
                    >
                      {notice.status === "보완필요" ? "보완" : "미이행"}
                    </i>
                    <div className="adoms-notification-copy">
                      <strong>{notice.title}</strong>
                      <span>
                        {cityHall.name} · {notice.due}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adoms-no-notification">알림이 없습니다.</p>
            )}
          </section>

          <section
            className="adoms-duty-panel"
            aria-labelledby="adoms-duty-title"
          >
            <div className="adoms-panel-heading">
              <h2 id="adoms-duty-title">
                안전·보건 확보의무 <small>(잔여 / 전체)</small>
              </h2>
            </div>
            <div className="adoms-duty-grid">
              {dashboardData.dutyBalances.map(duty => (
                <article className="adoms-duty-item" key={duty.number}>
                  <div className="adoms-duty-copy">
                    <strong>{duty.label}</strong>
                    <p>
                      <b>{duty.remaining}건</b> / {duty.total}건
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
