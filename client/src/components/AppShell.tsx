import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  BookOpenText,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Database,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { targets, type Role } from "@/lib/demo-data";
import { checkSupabaseConnection } from "@/lib/supabase";
import { useDemo } from "@/contexts/DemoContext";

const navItems = [
  { href: "/", label: "이행현황", icon: LayoutDashboard },
  { href: "/targets", label: "관리대상 현황", icon: Building2 },
  { href: "/laws", label: "관계 법령", icon: BookOpenText },
  { href: "/obligations", label: "법 의무사항", icon: FileCheck2 },
  { href: "/evidence", label: "의무이행(실적증빙)", icon: ClipboardCheck },
  { href: "/inspection", label: "이행점검 및 조치", icon: ShieldCheck },
  { href: "/summary", label: "점검 총괄표", icon: BarChart3 },
];

const roleMeta: Record<Role, { org: string; name: string }> = {
  담당자: { org: "시민안전관", name: "김안전" },
  "실·국 점검자": { org: "안전정책과", name: "이점검" },
  경영책임자: { org: "용인시장(경영책임자)", name: "용인시장" },
};

const sideGroups = [
  { title: "중대산업재해", items: ["사업장", "도급·용역·위탁"] },
  { title: "중대시민재해", items: ["공중이용시설·교통수단", "원료·제조물"] },
  { title: "시연 플로우", items: ["법령 적용 판정", "증빙 등록", "점검 및 보완"] },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { role, setRole, selectedTargetId, setSelectedTargetId, resetDemo } = useDemo();
  const [connection, setConnection] = useState({ connected: false, reason: "연결 확인 중" });

  useEffect(() => {
    checkSupabaseConnection().then(setConnection);
  }, []);

  const activeHref = navItems.find((item) => item.href === location)?.href || "/";

  return (
    <div className="app-frame">
      <div className="goal-strip">
        <div><strong>경영목표</strong><span>시민과 함께 만드는 안전도시 용인</span></div>
        <div className="goal-policy"><strong>경영방침</strong><span className="pause-mark">Ⅱ</span><span>1. 현장 중심의 안전문화 정착</span></div>
      </div>

      <header className="main-header">
        <Link href="/" className="brand" aria-label="대시보드로 이동">
          <img className="brand-logo" src="https://www.yongin.go.kr/resources/site/www_2026/images/common/heard_logo.png?v=20260818" alt="용인특례시" />
          <span className="brand-divider" />
          <span className="brand-product">안전보건체계<br />통합관리시스템</span>
        </Link>

        <nav className="top-nav" aria-label="주 메뉴">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={activeHref === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="user-tools">
          <div className="connection-pill" data-connected={connection.connected}>
            <Database size={13} /> {connection.reason}
          </div>
          <div className="user-row">
            <div className="user-copy"><span>{roleMeta[role].org}</span><strong>{roleMeta[role].name}</strong></div>
            <div className="role-select-wrap">
              <select value={role} onChange={(event) => setRole(event.target.value as Role)} aria-label="시연 역할 전환">
                <option>경영책임자</option><option>실·국 점검자</option><option>담당자</option>
              </select>
              <ChevronDown size={13} />
            </div>
          </div>
          <div className="header-actions">
            <button onClick={() => { resetDemo(); navigate("/"); }}><RefreshCcw size={12} /> 시연 초기화</button>
            <button disabled><LogOut size={12} /> 로그아웃</button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <aside className="side-panel">
          <div className="side-kicker">법 의무사항</div>
          {sideGroups.map((group, groupIndex) => (
            <section className="side-group" key={group.title}>
              <div className="side-group-title"><span>{group.title}</span><ChevronDown size={16} /></div>
              <div className="side-items">
                {group.items.map((label, index) => {
                  const selected = (groupIndex === 1 && index === 0) || (groupIndex === 2 && location !== "/");
                  return <button key={label} className={selected ? "selected" : ""} disabled={!selected}>{selected && <span className="side-dot" />}{label}</button>;
                })}
              </div>
            </section>
          ))}
          <div className="side-target">
            <label htmlFor="target-select">현재 대상</label>
            <select id="target-select" value={selectedTargetId} onChange={(event) => setSelectedTargetId(event.target.value)}>
              {targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
            </select>
          </div>
        </aside>

        <main className="page-stage">{children}</main>
      </div>

      <footer className="main-footer">
        <span>용인시청 : (우 17019) 경기도 용인시 처인구 중부대로 1199</span>
        <span>Copyright © YONGIN SPECIAL CITY. ALL RIGHTS RESERVED.</span>
      </footer>
    </div>
  );
}
