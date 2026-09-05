import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  CircleHelp,
  DatabaseZap,
  GitBranch,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useDemo } from "@/contexts/DemoContext";
import { obligations } from "@/lib/demo-data";
import {
  assessApplicability,
  BASELINE_FACTS,
  DEMO_RULES,
  DEMO_SNAPSHOT,
  type ApplicabilityFacts,
  type RuleEvaluation,
} from "@/lib/applicability";

type Preset = { label: string; description: string; facts: ApplicabilityFacts };

const presets: Preset[] = [
  {
    label: "시청 기준",
    description: "120명 · 39,872㎡ · 대상시설",
    facts: BASELINE_FACTS,
  },
  {
    label: "경계값 비교",
    description: "4명 · 4,800㎡ · 대상 아님",
    facts: {
      profile: "청사·사무시설",
      targetTrack: "public_facility",
      workerCount: 4,
      grossArea: 4800,
      facilitySafetyAct: false,
    },
  },
  {
    label: "수지레스피아",
    description: "62명 · 6,200㎡ · 대상시설",
    facts: {
      profile: "상하수도",
      targetTrack: "public_facility",
      workerCount: 62,
      grossArea: 6200,
      facilitySafetyAct: true,
    },
  },
];

const targetPresets: Record<string, ApplicabilityFacts> = {
  "target-yongin-cityhall": presets[0].facts,
  "target-suji-water": presets[2].facts,
  "target-jukjeon-bridge": {
    profile: "도로·교량",
    targetTrack: "public_facility",
    workerCount: 4,
    grossArea: 3200,
    facilitySafetyAct: true,
  },
};

function ruleState(rule: RuleEvaluation) {
  return rule.matched ? "조건 충족 후보" : "검토 보류";
}

export default function Applicability() {
  const { selectedTargetId } = useDemo();
  const [facts, setFacts] = useState<ApplicabilityFacts>(
    targetPresets[selectedTargetId] ?? BASELINE_FACTS
  );
  const [selectedObligationId, setSelectedObligationId] = useState("OBL-03");

  useEffect(() => {
    setFacts(targetPresets[selectedTargetId] ?? BASELINE_FACTS);
  }, [selectedTargetId]);

  const assessment = useMemo(() => assessApplicability(facts), [facts]);
  const baseline = useMemo(() => assessApplicability(BASELINE_FACTS), []);
  const selectedObligation =
    obligations.find(item => item.id === selectedObligationId) ??
    obligations[0];
  const selectedRules = assessment.ruleResults.filter(rule =>
    rule.obligationIds.includes(selectedObligation.id)
  );
  const selectedMatched = assessment.matchedObligationIds.includes(
    selectedObligation.id
  );
  const added = assessment.matchedObligationIds.filter(
    id => !baseline.matchedObligationIds.includes(id)
  ).length;
  const removed = baseline.matchedObligationIds.filter(
    id => !assessment.matchedObligationIds.includes(id)
  ).length;

  const setNumericFact = (key: "workerCount" | "grossArea", value: string) => {
    setFacts(current => ({
      ...current,
      [key]: Math.max(0, Number(value) || 0),
    }));
  };

  return (
    <div className="page applicability-page">
      <div className="page-heading applicability-heading">
        <div>
          <span className="eyebrow">APPLICABILITY · L1 → L2 → L3</span>
          <h1>법 적용범위 1차 판정</h1>
          <p>
            대상 프로필과 규모 값을 바꾸면 검수된 시연 규칙이 법령·대상·의무
            후보를 즉시 다시 계산합니다.
          </p>
        </div>
        <div className="source-stack">
          <span className="source-badge">
            <DatabaseZap size={14} /> 내장 검수규칙 · ADOMS API 연결 대기
          </span>
          <span className="source-version">
            {DEMO_SNAPSHOT.decision} · 기준일 {DEMO_SNAPSHOT.asOf}
          </span>
        </div>
      </div>

      <div className="legal-demo-notice" role="note">
        <ShieldAlert size={20} />
        <div>
          <strong>
            규칙 기반 적용 가능성 후보이며 최종 법적 판단이 아닙니다.
          </strong>
          <span>
            축소 시연셋의 검수 규칙 {DEMO_SNAPSHOT.reviewedRules}/
            {DEMO_SNAPSHOT.reviewedRules}개만 실행합니다. 미검수·미구조화 원천은
            자동 적용 목록에 포함하지 않습니다.
          </span>
        </div>
        <b>검수된 시연 범위</b>
      </div>

      <div className="applicability-presets" aria-label="판정 비교 프리셋">
        {presets.map(preset => {
          const active =
            preset.facts.workerCount === facts.workerCount &&
            preset.facts.grossArea === facts.grossArea &&
            preset.facts.facilitySafetyAct === facts.facilitySafetyAct;
          return (
            <button
              key={preset.label}
              className={active ? "active" : ""}
              onClick={() => setFacts({ ...preset.facts })}
            >
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          );
        })}
        <button
          className="reset-preset"
          onClick={() => setFacts({ ...BASELINE_FACTS })}
        >
          <RotateCcw size={14} /> 기준값 복원
        </button>
      </div>

      <div className="applicability-workbench">
        <section className="fact-panel">
          <div className="workbench-title">
            <span>
              <SlidersHorizontal size={16} /> 1. 대상 프로필·사실값
            </span>
            <em>입력 즉시 재판정</em>
          </div>
          <div className="demo-assumption">
            <AlertTriangle size={13} /> 아래 값은 영업 시연용 가정값입니다.
          </div>
          <label>
            <span>시설·업무 프로필</span>
            <select
              value={facts.profile}
              onChange={event =>
                setFacts(current => ({
                  ...current,
                  profile: event.target.value as ApplicabilityFacts["profile"],
                }))
              }
            >
              <option>청사·사무시설</option>
              <option>상하수도</option>
              <option>도로·교량</option>
            </select>
            <small>
              출처: 시연 시나리오 선택 · 실제 대상 해당 여부는 담당자 확인
            </small>
          </label>
          <label>
            <span>
              <Users size={13} /> 상시근로자 수
            </span>
            <div className="unit-input">
              <input
                type="number"
                min="0"
                value={facts.workerCount}
                onChange={event =>
                  setNumericFact("workerCount", event.target.value)
                }
              />
              <b>명</b>
            </div>
            <small>RUL-DEMO-03의 5명 경계값에 사용</small>
          </label>
          <label>
            <span>
              <Building2 size={13} /> 시설 연면적
            </span>
            <div className="unit-input">
              <input
                type="number"
                min="0"
                value={facts.grossArea}
                onChange={event =>
                  setNumericFact("grossArea", event.target.value)
                }
              />
              <b>㎡</b>
            </div>
            <small>RUL-DEMO-04의 5,000㎡ 경계값에 사용</small>
          </label>
          <label className="boolean-fact">
            <span>시설물안전법 대상 여부</span>
            <button
              role="switch"
              aria-checked={facts.facilitySafetyAct}
              className={facts.facilitySafetyAct ? "on" : ""}
              onClick={() =>
                setFacts(current => ({
                  ...current,
                  facilitySafetyAct: !current.facilitySafetyAct,
                }))
              }
            >
              <i /> {facts.facilitySafetyAct ? "예" : "아니오"}
            </button>
            <small>출처: 시연 가정 · 운영 시 시설대장/검수 API로 교체</small>
          </label>
          <div className="fact-source-note">
            <b>판정 입력 스냅숏</b>
            <code>
              {JSON.stringify({
                worker_count: facts.workerCount,
                gross_area: facts.grossArea,
                facility_safety_act: facts.facilitySafetyAct,
              })}
            </code>
          </div>
        </section>

        <section className="result-panel">
          <div className="workbench-title">
            <span>
              <GitBranch size={16} /> 2. L1·L2·L3 적용 후보
            </span>
            <em>
              시청 기준 대비 +{added} / -{removed}
            </em>
          </div>
          <div className="layer-flow">
            <div>
              <small>L1 · 법령 후보</small>
              <strong>{assessment.lawCandidates.length}</strong>
              <span>{assessment.lawCandidates.join(" · ") || "판정 보류"}</span>
            </div>
            <ArrowRight size={17} />
            <div>
              <small>L2 · 대상 후보</small>
              <strong>{assessment.ruleResults[0].matched ? 1 : 0}</strong>
              <span>공중이용시설·교통수단</span>
            </div>
            <ArrowRight size={17} />
            <div>
              <small>L3 · 의무 후보</small>
              <strong>{assessment.matchedObligationIds.length}</strong>
              <span>검토 보류 {assessment.heldObligationIds.length}건</span>
            </div>
          </div>

          <div className="confidence-band matched-band">
            <header>
              <CheckCircle2 size={16} />
              <strong>규칙상 조건 충족 후보</strong>
              <b>{assessment.matchedObligationIds.length}건</b>
            </header>
            <p>
              검수된 시연 조건과 입력값이 일치한 후보입니다. ‘법적 적용 확정’을
              의미하지 않습니다.
            </p>
            <div className="candidate-list">
              {assessment.matchedObligationIds.map(id => {
                const item = obligations.find(
                  obligation => obligation.id === id
                )!;
                return (
                  <button
                    key={id}
                    className={selectedObligation.id === id ? "selected" : ""}
                    onClick={() => setSelectedObligationId(id)}
                  >
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.lawName} · {item.article}
                      </small>
                    </span>
                    <em>검수규칙 일치</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="confidence-band conditional-band">
            <header>
              <CircleHelp size={16} />
              <strong>프로필 연관·조건 확인 필요</strong>
              <b>{assessment.heldObligationIds.length}건</b>
            </header>
            <p>
              시연 범위에는 포함되지만 현재 입력이 임계값을 충족하지 않습니다.
              비적용 확정이 아니라 사람 검토 보류입니다.
            </p>
            <div className="candidate-list">
              {assessment.heldObligationIds.length ? (
                assessment.heldObligationIds.map(id => {
                  const item = obligations.find(
                    obligation => obligation.id === id
                  )!;
                  return (
                    <button
                      key={id}
                      className={selectedObligation.id === id ? "selected" : ""}
                      onClick={() => setSelectedObligationId(id)}
                    >
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.lawName} · {item.article}
                        </small>
                      </span>
                      <em>사실값 확인</em>
                    </button>
                  );
                })
              ) : (
                <div className="band-empty">
                  현재 입력에서 보류된 시연 의무가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="confidence-band review-band">
            <header>
              <AlertTriangle size={16} />
              <strong>원천 검수 필요</strong>
              <b>별도 큐</b>
            </header>
            <p>
              축소 시연셋 밖의 수범주체 미판정·조건 미구조화·시행일 미확인
              항목은 자동 결과에서 제외했습니다. ADOMS API 연결 후 검수 큐로만
              수신합니다.
            </p>
          </div>
        </section>

        <aside className="trace-panel">
          <div className="workbench-title">
            <span>
              <BookOpenCheck size={16} /> 3. 근거·판정 경로
            </span>
            <em className={selectedMatched ? "matched" : "held"}>
              {selectedMatched ? "조건 충족 후보" : "검토 보류"}
            </em>
          </div>
          <span className="trace-kicker">{selectedObligation.group}</span>
          <h2>{selectedObligation.title}</h2>
          <p className="trace-detail">{selectedObligation.detail}</p>
          <div className="trace-law">
            <b>{selectedObligation.lawName}</b>
            <span>{selectedObligation.article}</span>
          </div>

          <ol className="trace-timeline">
            <li>
              <i>L1</i>
              <div>
                <strong>법령 후보 탐색</strong>
                <span>
                  {selectedRules.map(rule => rule.lawName).join(" · ")}
                </span>
              </div>
            </li>
            <li>
              <i>L2</i>
              <div>
                <strong>대상 유형 확인</strong>
                <span>공중이용시설·교통수단 · 프로필 {facts.profile}</span>
              </div>
            </li>
            <li>
              <i>L3</i>
              <div>
                <strong>검수 규칙 평가</strong>
                <span>
                  {selectedRules
                    .map(rule => `${rule.id} ${ruleState(rule)}`)
                    .join(" / ")}
                </span>
              </div>
            </li>
          </ol>

          {selectedRules.map(rule => (
            <article
              className={`rule-evidence ${rule.matched ? "matched" : "held"}`}
              key={rule.id}
            >
              <header>
                <code>{rule.id}</code>
                <b>{ruleState(rule)}</b>
              </header>
              <dl>
                <div>
                  <dt>조건</dt>
                  <dd>{rule.conditionLabel}</dd>
                </div>
                <div>
                  <dt>입력값</dt>
                  <dd>{rule.actual}</dd>
                </div>
                <div>
                  <dt>근거 ID</dt>
                  <dd>
                    <code>{rule.unitId}</code>
                  </dd>
                </div>
              </dl>
              <blockquote>{rule.sourceQuote}</blockquote>
              <p>{rule.explanation}</p>
            </article>
          ))}
          <div className="trace-disclaimer">
            참고 조건과 이행기준은 판정식에 사용하지 않습니다. 실제 공개 전에는
            ADOMS 원문 anchor·인용문·시행일 API 응답으로 교체합니다.
          </div>
        </aside>
      </div>
    </div>
  );
}
