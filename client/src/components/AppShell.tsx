import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
} from "lucide-react";
import { targets, type Role } from "@/lib/demo-data";
import { checkSupabaseConnection } from "@/lib/supabase";
import { useDemo } from "@/contexts/DemoContext";

type LnbItem = {
  label: string;
  href?: string;
  selected?: boolean;
  nested?: boolean;
};

type LnbGroup = {
  title: string;
  items: LnbItem[];
};

const gnbItems = [
  { href: "/applicability", label: "적용범위 판정" },
  { href: "/dashboard", label: "이행현황" },
  { href: "/targets", label: "관리대상 현황" },
  { href: "/obligations", label: "법 의무사항" },
  { href: "/evidence", label: "의무이행(실적증빙)" },
  { href: "/inspection", label: "이행점검 및 조치" },
  { label: "통계 및 사례" },
];

const roleMeta: Record<Role, { org: string; name: string }> = {
  담당자: { org: "시민안전관", name: "김안전" },
  "실·국 점검자": { org: "안전정책과", name: "이점검" },
  경영책임자: { org: "용인시장(경영책임자)", name: "용인시장" },
};

function routeKey(location: string) {
  if (location === "/" || location === "/applicability") return "applicability";
  if (location === "/dashboard") return "dashboard";
  if (location === "/targets") return "targets";
  if (location === "/laws") return "laws";
  if (location === "/obligations") return "obligations";
  if (location === "/evidence") return "evidence";
  if (location === "/inspection") return "inspection";
  if (location === "/summary") return "summary";
  return "applicability";
}

function menuFor(location: string): { title: string; groups: LnbGroup[] } {
  switch (routeKey(location)) {
    case "dashboard":
      return {
        title: "이행현황",
        groups: [
          {
            title: "이행현황",
            items: [
              { label: "전체 이행현황", href: "/dashboard", selected: true },
            ],
          },
        ],
      };
    case "targets":
      return {
        title: "관리대상 현황",
        groups: [
          {
            title: "기본정보",
            items: [
              { label: "사업장", href: "/targets", selected: true },
              { label: "공중이용시설" },
              { label: "원료·제조물" },
            ],
          },
          {
            title: "사업",
            items: [{ label: "도급·용역·위탁 현황" }],
          },
        ],
      };
    case "laws":
      return {
        title: "법 의무사항",
        groups: [
          {
            title: "관계법령 관리",
            items: [
              { label: "관계 법령 관리", href: "/laws", selected: true },
              { label: "공중이용시설·교통수단", nested: true },
              { label: "원료·제조물", nested: true },
            ],
          },
        ],
      };
    case "obligations":
      return {
        title: "법 의무사항",
        groups: [
          {
            title: "법 의무사항",
            items: [
              { label: "사업장" },
              {
                label: "공중이용시설·교통수단",
                href: "/obligations",
                selected: true,
              },
              { label: "원료·제조물" },
            ],
          },
        ],
      };
    case "evidence":
      return {
        title: "의무사항(실적증빙)",
        groups: [
          {
            title: "1차 트랙",
            items: [
              { label: "사업장" },
              {
                label: "공중이용시설·교통수단",
                href: "/evidence",
                selected: true,
              },
              { label: "원료·제조물" },
            ],
          },
          {
            title: "2차 의무 단계",
            items: [
              { label: "① 안전보건관리체계 구축 및 이행" },
              { label: "② 재해발생시 재발방지 대책 수립 및 이행" },
              { label: "③ 개선·시정 등을 명한 사항 이행" },
              {
                label: "④ 관계 법령상 의무이행",
                href: "/evidence",
                selected: true,
              },
            ],
          },
        ],
      };
    case "inspection":
    case "summary": {
      const isSummary = routeKey(location) === "summary";
      return {
        title: "이행점검",
        groups: [
          {
            title: "이행점검",
            items: [
              {
                label: "이행점검(사업장)",
                href: "/summary",
                selected: isSummary,
              },
              {
                label: "이행점검(공중이용시설)",
                href: "/inspection",
                selected: !isSummary,
              },
              { label: "이행점검(원료·제조물)" },
            ],
          },
        ],
      };
    }
    default:
      return {
        title: "적용범위 판정",
        groups: [
          {
            title: "현재 적용범위 판정",
            items: [
              {
                label: "대상 정보 및 적용 법령",
                href: "/applicability",
                selected: true,
              },
            ],
          },
        ],
      };
  }
}

const shellStyles = `
  .adoms-shell .main-header {
    min-height: 88px;
    grid-template-columns: 300px minmax(590px, 1fr) 286px;
    background: #090909;
    border-bottom: 8px solid #df3355;
    box-shadow: none;
  }
  .adoms-shell .brand { padding: 0 18px; gap: 10px; background: #fff; }
  .adoms-shell .brand-logo { width: 119px; }
  .adoms-shell .brand-divider { height: 40px; background: #d5d5d5; }
  .adoms-shell .brand-product { color: #111; font-size: 14px; line-height: 1.25; }
  .adoms-shell .top-nav { justify-content: center; gap: clamp(10px, 1.2vw, 22px); padding: 0 10px; }
  .adoms-shell .top-nav a,
  .adoms-shell .top-nav .top-nav-label {
    height: 100%; padding-top: 1px; border-bottom: 0;
    display: flex; align-items: center; color: #f3f3f3; font-size: 12px; font-weight: 700;
  }
  .adoms-shell .top-nav a:hover,
  .adoms-shell .top-nav a.active { color: #f05a84; border-bottom-color: transparent; }
  .adoms-shell .user-tools {
    gap: 4px; padding: 8px 14px; border-left: 1px solid #333;
    background: #111;
  }
  .adoms-shell .connection-pill { padding: 2px 6px; color: #c9d7bd; background: #263122; font-size: 9px; }
  .adoms-shell .connection-pill[data-connected="true"] { color: #d7f1d0; background: #244131; }
  .adoms-shell .user-copy span { color: #d5d5d5; font-size: 10px; }
  .adoms-shell .user-copy strong { font-size: 12px; }
  .adoms-shell .role-select-wrap select {
    border-color: #666; border-radius: 2px; background: #fafafa; color: #222;
    font-size: 10px; padding: 5px 23px 5px 6px;
  }
  .adoms-shell .role-select-wrap svg { top: 6px; color: #333; }
  .adoms-shell .header-actions button {
    border-color: #777; border-radius: 2px; color: #f2f2f2; padding: 4px 7px;
    font-size: 10px;
  }
  .adoms-shell .header-actions button:hover { background: #a93193; border-color: #df6fc3; }
  .adoms-shell .workspace { --side-width: 288px; max-width: none; background: #fff; }
  .adoms-shell .side-panel {
    padding: 50px 22px 28px 40px; min-height: calc(100vh - 126px);
    background: linear-gradient(110deg, #f1f1f3, #f7f7f8); border-right: 0;
  }
  .adoms-shell .side-kicker {
    margin-bottom: 15px; padding: 9px 12px; border-radius: 3px; background: #a93193;
    box-shadow: none; color: #fff; font-size: 18px; line-height: 1.2;
  }
  .adoms-shell .side-group { margin-bottom: 16px; }
  .adoms-shell .side-group-title {
    padding: 9px 12px; border-radius: 3px; background: #a93193; color: #fff;
    font-size: 14px; font-weight: 800;
  }
  .adoms-shell .side-group-title svg { width: 15px; height: 15px; transform: rotate(180deg); }
  .adoms-shell .side-items { padding: 7px 3px 2px; gap: 1px; }
  .adoms-shell .side-items .side-item {
    position: relative; display: block; width: 100%; padding: 7px 8px 7px 22px;
    color: #34343a; font-size: 13px; line-height: 1.34; text-align: left;
  }
  .adoms-shell .side-items a.side-item:hover { color: #a93193; text-decoration: underline; text-underline-offset: 3px; }
  .adoms-shell .side-items .side-item.nested { padding-left: 34px; color: #66666c; font-size: 12px; }
  .adoms-shell .side-items .side-item.selected { color: #a93193; font-weight: 850; }
  .adoms-shell .side-dot {
    left: 4px; top: 10px; width: 7px; height: 7px; border: 3px solid #df3355;
    background: #fff; box-sizing: content-box;
  }
  .adoms-shell .side-target {
    margin-top: 22px; padding: 10px; border: 1px solid #d7d7dc; border-radius: 3px;
    background: rgba(255,255,255,.56);
  }
  .adoms-shell .side-target label { color: #5c5c62; font-size: 10px; }
  .adoms-shell .side-target select {
    border-color: #ceced4; border-radius: 2px; color: #34343a; font-size: 11px; padding: 7px;
  }
  .adoms-shell .side-toggle {
    top: 18px; left: calc(var(--side-width) - 17px); width: 34px; height: 34px;
    border-color: #fff; border-radius: 50%; background: #a93193;
    box-shadow: 0 3px 8px rgba(0,0,0,.25);
  }
  .adoms-shell .side-toggle:hover { background: #86256f; }
  .adoms-shell .side-collapsed .side-toggle { left: 14px; }
  .adoms-shell .page-stage { padding: 30px 38px 48px; background: #f5f5f7; }
  .adoms-shell .main-footer {
    min-height: 31px; padding: 0 38px; border-top: 1px solid #e3e3e3;
    background: #fff; color: #929292; font-size: 9px;
  }
  @media (max-width: 1380px) {
    .adoms-shell .main-header { grid-template-columns: 278px minmax(520px, 1fr) 250px; }
    .adoms-shell .workspace { --side-width: 260px; }
    .adoms-shell .side-panel { padding-left: 28px; }
    .adoms-shell .top-nav { gap: 8px; }
    .adoms-shell .top-nav a { font-size: 10px; }
  }
`;

export default function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { role, setRole, selectedTargetId, setSelectedTargetId, resetDemo } =
    useDemo();
  const [connection, setConnection] = useState({
    connected: false,
    reason: "연결 확인 중",
  });
  const [sideCollapsed, setSideCollapsed] = useState(location === "/dashboard");
  const homeHref = "/applicability";
  const sideMenu = menuFor(location);

  useEffect(() => {
    checkSupabaseConnection().then(setConnection);
  }, []);

  useEffect(() => {
    if (location === "/dashboard") setSideCollapsed(true);
  }, [location]);

  const activeHref =
    location === "/" || location === "/applicability"
      ? "/applicability"
      : location === "/laws" || location === "/obligations"
        ? "/obligations"
        : location;

  return (
    <div className="app-frame adoms-shell">
      <style>{shellStyles}</style>
      <header className="main-header">
        <Link
          href={homeHref}
          className="brand"
          aria-label="적용범위 판정으로 이동"
        >
          <img
            className="brand-logo"
            src="https://www.yongin.go.kr/resources/site/www_2026/images/common/heard_logo.png?v=20260818"
            alt="용인특례시"
          />
          <span className="brand-divider" />
          <span className="brand-product">
            안전보건체계
            <br />
            통합관리시스템
          </span>
        </Link>

        <nav className="top-nav" aria-label="주 메뉴">
          {gnbItems.map(item =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={activeHref === item.href ? "active" : ""}
                onClick={() => setSideCollapsed(true)}
              >
                {item.label}
              </Link>
            ) : (
              <span className="top-nav-label" key={item.label}>
                {item.label}
              </span>
            )
          )}
        </nav>

        <div className="user-tools">
          <div
            className="connection-pill"
            data-connected={connection.connected}
          >
            <Database size={12} /> {connection.reason}
          </div>
          <div className="user-row">
            <div className="user-copy">
              <span>{roleMeta[role].org}</span>
              <strong>{roleMeta[role].name}</strong>
            </div>
            <div className="role-select-wrap">
              <select
                value={role}
                onChange={event => setRole(event.target.value as Role)}
                aria-label="시연 역할 전환"
              >
                <option>경영책임자</option>
                <option>실·국 점검자</option>
                <option>담당자</option>
              </select>
              <ChevronDown size={13} />
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={() => {
                resetDemo();
                navigate(homeHref);
              }}
            >
              <RefreshCcw size={12} /> 시연 초기화
            </button>
          </div>
        </div>
      </header>

      <div className={`workspace ${sideCollapsed ? "side-collapsed" : ""}`}>
        <button
          className="side-toggle"
          onClick={() => setSideCollapsed(current => !current)}
          aria-expanded={!sideCollapsed}
          aria-label={sideCollapsed ? "왼쪽 메뉴 열기" : "왼쪽 메뉴 접기"}
          title={sideCollapsed ? "왼쪽 메뉴 열기" : "왼쪽 메뉴 접기"}
        >
          {sideCollapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <PanelLeftClose size={17} />
          )}
        </button>
        <aside className="side-panel" aria-hidden={sideCollapsed}>
          <div className="side-kicker">{sideMenu.title}</div>
          {sideMenu.groups.map(group => (
            <section className="side-group" key={group.title}>
              <div className="side-group-title">
                <span>{group.title}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </div>
              <div className="side-items">
                {group.items.map(item => {
                  const className = `side-item${item.selected ? " selected" : ""}${item.nested ? " nested" : ""}`;
                  const contents = (
                    <>
                      {item.selected && <span className="side-dot" />}
                      {item.label}
                    </>
                  );
                  return item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={className}
                      onClick={() => setSideCollapsed(true)}
                    >
                      {contents}
                    </Link>
                  ) : (
                    <span className={className} key={item.label}>
                      {contents}
                    </span>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="side-target">
            <label htmlFor="target-select">현재 관리대상</label>
            <select
              id="target-select"
              value={selectedTargetId}
              onChange={event => setSelectedTargetId(event.target.value)}
            >
              {targets.map(target => (
                <option key={target.id} value={target.id}>
                  {target.name}
                </option>
              ))}
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
