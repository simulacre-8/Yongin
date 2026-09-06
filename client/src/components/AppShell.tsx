import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Role } from "@/lib/demo-data";
import type { HomeNavigationData } from "@/lib/home-obligation-api";
import { resetMyWork } from "@/lib/my-work-api";
import { useDemo } from "@/contexts/DemoContext";

type LnbItem = {
  label: string;
  href?: string;
  selected?: boolean;
  nested?: boolean;
  count?: number;
};

type LnbGroup = {
  title: string;
  items: LnbItem[];
};

const gnbItems = [
  { href: "/home", label: "홈" },
  { href: "/targets", label: "관리대상" },
  { href: "/obligations", label: "의무 체크리스트" },
  { href: "/evidence", label: "의무이행" },
  { href: "/dashboard", label: "내 업무" },
  { href: "/settings", label: "설정" },
];

function routeKey(location: string) {
  if (location === "/" || location === "/home" || location.startsWith("/home/"))
    return "home";
  if (location === "/applicability" || location === "/settings/applicability")
    return "applicability";
  if (location === "/dashboard") return "dashboard";
  if (location === "/targets") return "targets";
  if (location === "/laws") return "laws";
  if (location === "/obligations") return "obligations";
  if (location === "/evidence") return "evidence";
  if (location === "/inspection") return "inspection";
  if (location === "/summary") return "summary";
  if (location === "/settings") return "settings";
  return "applicability";
}

function menuFor(
  location: string,
  homeNavigation: HomeNavigationData | null
): { title: string; groups: LnbGroup[] } {
  const homeSegments = location.split("?")[0].split("/").filter(Boolean);
  const homeView = homeSegments[1] || "all";
  const homeDetailId = homeSegments[2] || "";
  const categoryCounts = homeNavigation?.categories || {
    safetySystem: 24,
    recurrence: 3,
    correctiveOrder: 3,
    relatedLaw: 3658,
  };
  const accidentCounts = homeNavigation?.accidentTypes || {
    industrial: 14,
    citizen: 22,
    citizenFacility: 13,
    citizenProduct: 9,
  };

  switch (routeKey(location)) {
    case "home":
      return {
        title: "홈",
        groups: [
          {
            title: "중처법 카테고리별",
            items: [
              {
                label: "전체",
                href: "/home/all",
                selected: homeView === "all",
                count: homeNavigation?.total || 3688,
              },
              {
                label: "안전보건관리체계",
                href: "/home/safety-system",
                selected: homeView === "safety-system",
                count: categoryCounts.safetySystem,
              },
              {
                label: "재발방지 대책",
                href: "/home/recurrence",
                selected: homeView === "recurrence",
                count: categoryCounts.recurrence,
              },
              {
                label: "개선·시정명령 이행",
                href: "/home/corrective-order",
                selected: homeView === "corrective-order",
                count: categoryCounts.correctiveOrder,
              },
              {
                label: "관계법령 관리조치",
                href: "/home/related-law",
                selected: homeView === "related-law",
                count: categoryCounts.relatedLaw,
              },
            ],
          },
          {
            title: "중대재해 유형별",
            items: [
              {
                label: "중대산업재해",
                href: "/home/industrial",
                selected: homeView === "industrial" && !homeDetailId,
                count: accidentCounts.industrial,
              },
              {
                label: "중대시민재해",
                count: accidentCounts.citizen,
              },
              {
                label: "공중이용시설·공중교통수단",
                href: "/home/citizen-facility",
                selected: homeView === "citizen-facility",
                nested: true,
                count: accidentCounts.citizenFacility,
              },
              {
                label: "원료·제조물",
                href: "/home/citizen-product",
                selected: homeView === "citizen-product",
                nested: true,
                count: accidentCounts.citizenProduct,
              },
            ],
          },
        ],
      };
    case "dashboard":
      return {
        title: "내 업무",
        groups: [
          {
            title: "배정·이행",
            items: [
              { label: "나의 할 일", href: "/dashboard", selected: true },
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
            items: [{ label: "관리대상", href: "/targets", selected: true }],
          },
        ],
      };
    case "laws":
      return {
        title: "의무 체크리스트",
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
        title: "의무 체크리스트",
        groups: [
          {
            title: "의무 체크리스트",
            items: [
              { label: "사업장" },
              {
                label: "공중이용시설·공중교통수단",
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
        title: "진단·설정",
        groups: [
          {
            title: "진단·설정",
            items: [
              { label: "기관 기본정보" },
              { label: "조직도·담당자 등록" },
              {
                label: "적용 법령 자동 추천",
                href: "/settings/applicability",
                selected: true,
              },
              { label: "법령 예외 처리 및 사유이력" },
            ],
          },
        ],
      };
  }
}

const shellStyles = `
  .adoms-shell .main-header {
    min-height: 72px;
    grid-template-columns: 296px minmax(560px, 1fr) auto;
    background: #172b4d;
    border-bottom: 1px solid #10213c;
    box-shadow: 0 10px 28px rgba(23, 43, 77, .16);
  }
  .adoms-shell .brand {
    padding: 0 22px; gap: 12px; background: #fff;
    border-right: 1px solid #dce3ea;
  }
  .adoms-shell .brand-logo { width: 118px; }
  .adoms-shell .brand-divider { height: 34px; background: #d9e0e8; }
  .adoms-shell .brand-product { color: #1e2124; font-size: 14px; font-weight: 750; line-height: 1.32; }
  .adoms-shell .top-nav { justify-content: flex-end; gap: clamp(12px, 1.3vw, 24px); padding: 0 16px; }
  .adoms-shell .top-nav a,
  .adoms-shell .top-nav .top-nav-label {
    height: 72px; padding: 3px 1px 0; border-bottom: 3px solid transparent;
    display: flex; align-items: center; color: #d9e4ef; font-size: 14px; font-weight: 650;
  }
  .adoms-shell .top-nav a:hover,
  .adoms-shell .top-nav a.active { color: #8dc6ed; border-bottom-color: #5aa7d6; }
  .adoms-shell .user-tools {
    flex-direction: row; align-items: center; gap: 7px; padding: 0 16px; border-left: 1px solid #2b456c;
    background: #10213c;
  }
  .adoms-shell .user-copy span { color: #aaa3ad; font-size: 12px; }
  .adoms-shell .user-copy strong { font-size: 14px; }
  .adoms-shell .role-select-wrap select {
    border-color: #4d6686; border-radius: 8px; background: #142a49; color: #fff;
    font-size: 11px; padding: 6px 26px 6px 9px;
  }
  .adoms-shell .role-select-wrap svg { top: 7px; color: #d8d1da; }
  .adoms-shell .header-actions button {
    border-color: #4d6686; border-radius: 8px; color: #d9e4ef; padding: 5px 9px;
    font-size: 11px; white-space: nowrap;
  }
  .adoms-shell .header-actions button:hover { background: #1d4f78; border-color: #5aa7d6; color: #fff; }
  .adoms-shell .workspace { display: block; max-width: none; background: #f5f6f8; }
  .adoms-shell .side-panel {
    padding: 28px 20px 30px 26px; min-height: calc(100vh - 134px);
    background: linear-gradient(165deg, #e7f1f8 0%, #eef4f8 52%, #fbfbdc 120%);
    border-right: 1px solid #eadde8;
  }
  .adoms-shell .side-menu-container {
    min-height: calc(100vh - 194px); padding: 0;
    background: transparent;
  }
  .adoms-shell .side-kicker {
    margin-bottom: 18px; padding: 14px 16px; border-radius: 10px;
    background: linear-gradient(135deg, #1d6fa3, #2f66b0);
    box-shadow: 0 10px 22px rgba(29, 111, 163, .18);
    color: #fff; font-size: 20px; font-weight: 800; line-height: 1.2;
  }
  .adoms-shell .side-group { margin-bottom: 16px; }
  .adoms-shell .side-group-title {
    padding: 10px 13px; border-radius: 8px; background: #172b4d; color: #fff;
    font-size: 14px; font-weight: 750;
  }
  .adoms-shell .side-group-title svg { width: 15px; height: 15px; transform: rotate(180deg); }
  .adoms-shell .side-items { padding: 8px 3px 3px; gap: 2px; }
  .adoms-shell .side-items .side-item {
    position: relative; display: block; width: 100%; padding: 9px 9px 9px 22px;
    border-radius: 7px; color: #3e3741; font-size: 14px; line-height: 1.35; text-align: left;
  }
  .adoms-shell .side-items a.side-item:hover { color: #1d6fa3; background: rgba(255,255,255,.52); }
  .adoms-shell .side-items .side-item.nested { padding-left: 34px; color: #706a72; font-size: 12px; }
  .adoms-shell .side-items .side-item.selected { color: #155985; background: rgba(255,255,255,.72); font-weight: 800; }
  .adoms-shell .side-item-count { margin-left: auto; color: #807681; font-size: 11px; font-weight: 800; }
  .adoms-shell .side-items .side-item.selected .side-item-count { color: #155985; }
  .adoms-shell .side-dot {
    left: 7px; top: 12px; width: 7px; height: 7px; border: 3px solid #2f66b0;
    background: #fff; box-sizing: content-box;
  }
  .adoms-shell .home-side-menu .side-kicker { margin-bottom: 14px; }
  .adoms-shell .home-side-menu .side-group { margin-bottom: 22px; }
  .adoms-shell .home-side-menu .side-group-title {
    padding: 6px 5px 8px; border-radius: 0; border-bottom: 1px solid rgba(91,69,91,.14);
    background: transparent; color: #716872; font-size: 12px; font-weight: 800;
  }
  .adoms-shell .home-side-menu .side-group-title svg { display: none; }
  .adoms-shell .home-side-menu .side-items { gap: 1px; padding: 6px 0 0; }
  .adoms-shell .home-side-menu .side-items .side-item {
    display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 8px;
    min-height: 34px; padding: 7px 9px 7px 18px; font-size: 12px;
  }
  .adoms-shell .home-side-menu .side-items .side-item.nested {
    min-height: 29px; padding: 5px 8px 5px 31px; color: #736c74; font-size: 10px;
  }
  .adoms-shell .home-side-menu .side-items .side-item.nested::before {
    content: "-"; position: absolute; left: 20px; color: #b69caf;
  }
  .adoms-shell .home-side-menu .side-items .side-item.selected {
    border: 1px solid #e1d3df; background: rgba(255,255,255,.88);
  }
  .adoms-shell .home-side-menu .side-dot { top: 9px; }
  .adoms-shell .side-target {
    margin-top: 22px; padding: 14px; border: 1px solid #e1cbe0; border-radius: 10px;
    background: rgba(255,255,255,.72);
  }
  .adoms-shell .side-target label { color: #66606a; font-size: 12px; }
  .adoms-shell .side-target select {
    border-color: #dccfdd; border-radius: 8px; color: #392d3c; font-size: 14px; padding: 9px 10px;
  }
  .adoms-shell .page-stage {
    width: 100%; padding: 28px 32px 52px;
    background: #f5f6f8;
  }
  .adoms-shell .diagnosis-subnav {
    display: flex; align-items: center; gap: 8px; width: 100%; max-width: 1720px;
    margin: 0 auto 18px; padding: 10px; border: 1px solid #dce3ea; border-radius: 10px;
    background: #fff; box-shadow: 0 5px 16px rgba(23,43,77,.04);
  }
  .adoms-shell .diagnosis-subnav span,
  .adoms-shell .diagnosis-subnav a {
    display: inline-flex; align-items: center; min-height: 34px; padding: 0 13px;
    border: 1px solid transparent; border-radius: 8px; color: #6c7789;
    font-size: 12px; font-weight: 700;
  }
  .adoms-shell .diagnosis-subnav a.active {
    border-color: #b9d3e6; background: #e7f1f8; color: #155985;
  }
  .adoms-shell .diagnosis-subnav span { color: #9aa3ae; background: #f5f6f8; }
  .adoms-shell .diagnosis-subnav em { margin-left: 6px; color: #8a94a3; font-size: 9px; font-style: normal; }
  .adoms-shell .main-footer {
    min-height: 38px; padding: 0 40px; border-top: 1px solid #e6e1e7;
    background: #fff; color: #848087; font-size: 12px;
  }
  @media (max-width: 1380px) {
    .adoms-shell .main-header { grid-template-columns: 270px minmax(500px, 1fr) auto; }
    .adoms-shell .workspace { --side-width: 252px; }
    .adoms-shell .side-panel { padding-left: 20px; }
    .adoms-shell .top-nav { gap: 8px; padding-inline: 8px; }
    .adoms-shell .top-nav a,
    .adoms-shell .top-nav .top-nav-label { font-size: 13px; }
  }
`;

export default function AppShell({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { role, setRole, resetDemo } = useDemo();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const homeHref = "/home";

  const handleReset = async () => {
    setResetting(true);
    try {
      const result = await resetMyWork(role);
      resetDemo();
      setResetOpen(false);
      navigate(homeHref);
      toast.success(
        `내 업무 시연 런타임 DB가 초기화되었습니다. ${result.deletedWorkItems.toLocaleString()}건 삭제 후 ${result.seededWorkItems.toLocaleString()}건을 다시 구성했습니다.`
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "내 업무 시연 런타임 DB 초기화에 실패했습니다."
      );
    } finally {
      setResetting(false);
    }
  };

  const activeHref =
    location === "/" || location === "/home" || location.startsWith("/home/")
      ? "/home"
      : location === "/applicability" || location.startsWith("/settings")
        ? "/settings"
        : location === "/laws" || location === "/obligations"
          ? "/obligations"
          : location;

  return (
    <div className="app-frame adoms-shell">
      <style>{shellStyles}</style>
      <header className="main-header">
        <Link href={homeHref} className="brand" aria-label="홈으로 이동">
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
          <div className="header-actions">
            <button onClick={() => setResetOpen(true)}>
              <RefreshCcw size={12} /> 초기화
            </button>
          </div>
        </div>
      </header>

      <div className="workspace">
        <main className="page-stage">{children}</main>
      </div>

      <footer className="main-footer">
        <span>용인시청 : (우 17019) 경기도 용인시 처인구 중부대로 1199</span>
        <span>Copyright © YONGIN SPECIAL CITY. ALL RIGHTS RESERVED.</span>
      </footer>

      <AlertDialog
        open={resetOpen}
        onOpenChange={open => {
          if (!resetting) setResetOpen(open);
        }}
      >
        <AlertDialogContent className="demo-reset-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              시연 운영값을 초기화하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>내 업무 시연 런타임 DB와 내 업무 첨부파일만</strong>{" "}
              삭제한 뒤 기준 업무를 다시 구성합니다. 법령·시설·조직도·기존
              실적증빙 환경은 유지됩니다. 내 업무 첨부 삭제와 DB 재구성은 하나의
              트랜잭션이 아닌 순차 작업입니다. 중간 실패 메시지가 나오면
              초기화를 다시 실행해야 합니다. 초기화 기록은 감사용으로 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetting}
              onClick={event => {
                event.preventDefault();
                void handleReset();
              }}
            >
              {resetting ? "초기화 중" : "초기화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
