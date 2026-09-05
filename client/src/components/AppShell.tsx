import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Database, RefreshCcw } from "lucide-react";
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
    min-height: 96px;
    grid-template-columns: 304px minmax(620px, 1fr) 280px;
    background: #17151a;
    border-bottom: 1px solid #2f2a32;
    box-shadow: 0 10px 28px rgba(30, 24, 31, .14);
  }
  .adoms-shell .brand {
    padding: 0 22px; gap: 12px; background: #fff;
    border-right: 1px solid #eee8ef;
  }
  .adoms-shell .brand-logo { width: 126px; }
  .adoms-shell .brand-divider { height: 42px; background: #ded7df; }
  .adoms-shell .brand-product { color: #1e2124; font-size: 14px; font-weight: 750; line-height: 1.32; }
  .adoms-shell .top-nav { justify-content: center; gap: clamp(10px, 1.2vw, 22px); padding: 0 14px; }
  .adoms-shell .top-nav a,
  .adoms-shell .top-nav .top-nav-label {
    height: 100%; padding: 3px 1px 0; border-bottom: 3px solid transparent;
    display: flex; align-items: center; color: #ddd8df; font-size: 14px; font-weight: 650;
  }
  .adoms-shell .top-nav a:hover,
  .adoms-shell .top-nav a.active { color: #ff6a88; border-bottom-color: #df3355; }
  .adoms-shell .user-tools {
    gap: 5px; padding: 9px 16px; border-left: 1px solid #39333c;
    background: #111014;
  }
  .adoms-shell .connection-pill { padding: 4px 8px; color: #f1c779; background: #33291a; font-size: 12px; }
  .adoms-shell .connection-pill[data-connected="true"] { color: #8fe6d7; background: #173b36; }
  .adoms-shell .user-copy span { color: #aaa3ad; font-size: 12px; }
  .adoms-shell .user-copy strong { font-size: 14px; }
  .adoms-shell .role-select-wrap select {
    border-color: #594c60; border-radius: 8px; background: #2c2730; color: #fff;
    font-size: 12px; padding: 7px 28px 7px 10px;
  }
  .adoms-shell .role-select-wrap svg { top: 8px; color: #d8d1da; }
  .adoms-shell .header-actions button {
    border-color: #554b58; border-radius: 8px; color: #ddd6df; padding: 5px 9px;
    font-size: 12px;
  }
  .adoms-shell .header-actions button:hover { background: #4c2849; border-color: #a93193; color: #fff; }
  .adoms-shell .workspace { --side-width: 280px; max-width: 1920px; background: #f7f7fa; }
  .adoms-shell .side-panel {
    padding: 28px 20px 30px 26px; min-height: calc(100vh - 134px);
    background: linear-gradient(165deg, #f7dff1 0%, #f9edf5 52%, #fbfbdc 120%);
    border-right: 1px solid #eadde8;
  }
  .adoms-shell .side-menu-container {
    min-height: calc(100vh - 194px); padding: 0;
    background: transparent;
  }
  .adoms-shell .side-kicker {
    margin-bottom: 18px; padding: 14px 16px; border-radius: 10px;
    background: linear-gradient(135deg, #a93193, #df3355);
    box-shadow: 0 10px 22px rgba(169, 49, 147, .18);
    color: #fff; font-size: 20px; font-weight: 800; line-height: 1.2;
  }
  .adoms-shell .side-group { margin-bottom: 16px; }
  .adoms-shell .side-group-title {
    padding: 10px 13px; border-radius: 8px; background: #5e3682; color: #fff;
    font-size: 14px; font-weight: 750;
  }
  .adoms-shell .side-group-title svg { width: 15px; height: 15px; transform: rotate(180deg); }
  .adoms-shell .side-items { padding: 8px 3px 3px; gap: 2px; }
  .adoms-shell .side-items .side-item {
    position: relative; display: block; width: 100%; padding: 9px 9px 9px 22px;
    border-radius: 7px; color: #3e3741; font-size: 14px; line-height: 1.35; text-align: left;
  }
  .adoms-shell .side-items a.side-item:hover { color: #a93193; background: rgba(255,255,255,.52); }
  .adoms-shell .side-items .side-item.nested { padding-left: 34px; color: #706a72; font-size: 12px; }
  .adoms-shell .side-items .side-item.selected { color: #9b226f; background: rgba(255,255,255,.72); font-weight: 800; }
  .adoms-shell .side-dot {
    left: 7px; top: 12px; width: 7px; height: 7px; border: 3px solid #df3355;
    background: #fff; box-sizing: content-box;
  }
  .adoms-shell .side-target {
    margin-top: 22px; padding: 14px; border: 1px solid #e1cbe0; border-radius: 10px;
    background: rgba(255,255,255,.72);
  }
  .adoms-shell .side-target label { color: #66606a; font-size: 12px; }
  .adoms-shell .side-target select {
    border-color: #dccfdd; border-radius: 8px; color: #392d3c; font-size: 14px; padding: 9px 10px;
  }
  .adoms-shell .page-stage {
    padding: 32px 36px 52px;
    background:
      radial-gradient(circle at 82% 0%, rgba(247,223,241,.48), transparent 27%),
      #f7f7fa;
  }
  .adoms-shell .main-footer {
    min-height: 38px; padding: 0 40px; border-top: 1px solid #e6e1e7;
    background: #fff; color: #848087; font-size: 12px;
  }
  @media (max-width: 1380px) {
    .adoms-shell .main-header { grid-template-columns: 282px minmax(540px, 1fr) 250px; }
    .adoms-shell .workspace { --side-width: 252px; }
    .adoms-shell .side-panel { padding-left: 20px; }
    .adoms-shell .top-nav { gap: 8px; padding-inline: 8px; }
    .adoms-shell .top-nav a,
    .adoms-shell .top-nav .top-nav-label { font-size: 13px; }
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
  const homeHref = "/applicability";
  const sideMenu = menuFor(location);

  useEffect(() => {
    checkSupabaseConnection().then(setConnection);
  }, []);

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

      <div className="workspace">
        <aside className="side-panel">
          <div className="side-menu-container">
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
