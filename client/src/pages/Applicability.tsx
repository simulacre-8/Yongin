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
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  loadApplicabilityDataset,
  loadStoredFacts,
  saveApplicabilitySnapshot,
  storeFacts,
} from "@/lib/applicability-api";
import {
  assessApplicability,
  BASELINE_FACTS,
  FALLBACK_DATASET,
  type ApplicabilityDataset,
  type ApplicabilityFacts,
  type RuleEvaluation,
} from "@/lib/applicability";

const presets: Array<{
  label: string;
  description: string;
  facts: ApplicabilityFacts;
}> = [
  {
    label: "용인시청 기본값",
    description: "120명 · 39,872㎡",
    facts: BASELINE_FACTS,
  },
  {
    label: "20~49명 경계",
    description: "30명 · 399㎡",
    facts: {
      ...BASELINE_FACTS,
      workerCount: 30,
      grossArea: 399,
      facilitySafetyAct: false,
    },
  },
  {
    label: "최소 경계 미만",
    description: "19명 · 399㎡",
    facts: {
      ...BASELINE_FACTS,
      workerCount: 19,
      grossArea: 399,
      facilitySafetyAct: false,
    },
  },
];

function ruleState(rule: RuleEvaluation) {
  return rule.matched ? "조건 충족" : "조건 미충족";
}

function formatRecordedAt(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export default function Applicability() {
  const [facts, setFacts] = useState<ApplicabilityFacts>(() =>
    loadStoredFacts()
  );
  const [dataset, setDataset] =
    useState<ApplicabilityDataset>(FALLBACK_DATASET);
  const [dataStatus, setDataStatus] = useState<
    "loading" | "remote" | "fallback"
  >("loading");
  const [selectedObligationId, setSelectedObligationId] =
    useState("OBL-0000575");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "local" | "error"
  >("idle");
  const [recordedAt, setRecordedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadApplicabilityDataset()
      .then(nextDataset => {
        if (!active) return;
        setDataset(nextDataset);
        setDataStatus(
          nextDataset.source === "supabase" ? "remote" : "fallback"
        );
      })
      .catch(() => {
        if (!active) return;
        setDataset(FALLBACK_DATASET);
        setDataStatus("fallback");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    storeFacts(facts);
    setSaveStatus(current => (current === "saving" ? current : "idle"));
  }, [facts]);

  useEffect(() => {
    if (!dataset.obligations.some(item => item.id === selectedObligationId)) {
      setSelectedObligationId(dataset.obligations[0]?.id ?? "");
    }
  }, [dataset, selectedObligationId]);

  const assessment = useMemo(
    () => assessApplicability(facts, dataset),
    [facts, dataset]
  );
  const baseline = useMemo(
    () => assessApplicability(BASELINE_FACTS, dataset),
    [dataset]
  );
  const selectedObligation =
    dataset.obligations.find(item => item.id === selectedObligationId) ??
    dataset.obligations[0];
  const selectedRules = selectedObligation
    ? assessment.ruleResults.filter(rule =>
        rule.obligationIds.includes(selectedObligation.id)
      )
    : [];
  const selectedMatched = selectedObligation
    ? assessment.matchedObligationIds.includes(selectedObligation.id)
    : false;
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

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const result = await saveApplicabilitySnapshot(
        facts,
        assessment.ruleResults
      );
      setRecordedAt(result.recordedAt);
      setSaveStatus(result.remote ? "saved" : "local");
    } catch {
      storeFacts(facts);
      setRecordedAt(new Date().toISOString());
      setSaveStatus("error");
    }
  };

  if (!selectedObligation) return null;

  return (
    <div className="page applicability-page">
      <div className="page-heading applicability-heading">
        <div>
          <span className="eyebrow">APPLICABILITY · L1 → L2 → L3</span>
          <h1>용인시청 법 적용범위 1차 판정</h1>
        </div>
        <div className="source-stack">
          <span className="source-badge">
            <DatabaseZap size={14} />
            {dataStatus === "loading"
              ? "ADOMS 데이터 조회 중"
              : dataset.sourceLabel}
          </span>
          <span className="source-version">
            {dataset.sourceVersion} · 사실 기준일 {facts.factsEffectiveAt}
          </span>
        </div>
      </div>

      <div className="legal-demo-notice" role="note">
        <ShieldAlert size={20} />
        <div>
          <strong>규칙 기반 적용 후보이며 최종 법적 판단이 아닙니다.</strong>
          <span>
            ADOMS 승인 규칙 {dataset.approvedRuleTotal || 31}개 중 용인시청
            시연과 직접 관련된 {dataset.rules.length}개만 실행합니다. 미검수
            규칙은 자동 판정에서 제외합니다.
          </span>
        </div>
        <b>{dataset.source === "supabase" ? "실제 DB 조회" : "안전 폴백"}</b>
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
            </select>
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
          </label>
          <label>
            <span>사실 발생·효력 기준일</span>
            <input
              type="date"
              value={facts.factsEffectiveAt}
              onChange={event =>
                setFacts(current => ({
                  ...current,
                  factsEffectiveAt: event.target.value,
                }))
              }
            />
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
          </label>
          <div className="fact-source-note">
            <b>판정 입력 스냅숏</b>
            <code>
              {JSON.stringify({
                worker_count: facts.workerCount,
                gross_area: facts.grossArea,
                facts_effective_at: facts.factsEffectiveAt,
              })}
            </code>
          </div>
          <button
            className="primary-btn applicability-save"
            disabled={saveStatus === "saving"}
            onClick={handleSave}
          >
            {saveStatus === "saved" ? (
              <CheckCircle2 size={15} />
            ) : (
              <Save size={15} />
            )}
            {saveStatus === "saving" ? "저장 중" : "현재 판정기록 저장"}
          </button>
          {saveStatus !== "idle" && saveStatus !== "saving" ? (
            <p className={`save-result ${saveStatus}`}>
              {saveStatus === "saved"
                ? `Supabase 저장 완료 · 기록시각 ${formatRecordedAt(recordedAt)}`
                : saveStatus === "local"
                  ? "브라우저에 저장했습니다."
                  : "원격 저장은 실패했지만 브라우저에는 보존했습니다."}
            </p>
          ) : null}
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
              <strong>{facts.targetTrack === "public_facility" ? 1 : 0}</strong>
              <span>공중이용시설·청사</span>
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
            <p>검수된 ADOMS 조건과 입력값이 일치한 후보입니다.</p>
            <div className="candidate-list">
              {assessment.obligationResults
                .filter(item => item.matched)
                .map(item => (
                  <button
                    key={item.id}
                    className={
                      selectedObligation.id === item.id ? "selected" : ""
                    }
                    onClick={() => setSelectedObligationId(item.id)}
                  >
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.lawName} · {item.article}
                      </small>
                    </span>
                    <em>
                      {item.logic === "all"
                        ? "모든 조건 충족"
                        : "조건 중 하나 충족"}
                    </em>
                  </button>
                ))}
            </div>
          </div>

          <div className="confidence-band conditional-band">
            <header>
              <CircleHelp size={16} />
              <strong>조건 확인 필요</strong>
              <b>{assessment.heldObligationIds.length}건</b>
            </header>
            <p>
              비적용 확정이 아니라 입력값 또는 수범주체의 추가 검토가
              필요합니다.
            </p>
            <div className="candidate-list">
              {assessment.obligationResults
                .filter(item => !item.matched)
                .map(item => (
                  <button
                    key={item.id}
                    className={
                      selectedObligation.id === item.id ? "selected" : ""
                    }
                    onClick={() => setSelectedObligationId(item.id)}
                  >
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.lawName} · {item.article}
                      </small>
                    </span>
                    <em>사실값 확인</em>
                  </button>
                ))}
            </div>
          </div>

          <div className="confidence-band review-band">
            <header>
              <AlertTriangle size={16} />
              <strong>원천 검수 필요</strong>
              <b>별도 큐</b>
            </header>
            <p>
              `demo_approved=false` 규칙과 기계 판정 의무는 데이터베이스에
              보존하되 자동 적용 결과에서는 제외합니다.
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
          {selectedObligation.securingLabel ? (
            <div className="trace-box">
              <span>중대재해처벌법 확보의무 연결</span>
              <p>{selectedObligation.securingLabel}</p>
            </div>
          ) : null}

          <ol className="trace-timeline">
            <li>
              <i>L1</i>
              <div>
                <strong>법령 후보 탐색</strong>
                <span>{selectedObligation.lawName}</span>
              </div>
            </li>
            <li>
              <i>L2</i>
              <div>
                <strong>대상 유형 확인</strong>
                <span>공중이용시설·청사 · 프로필 {facts.profile}</span>
              </div>
            </li>
            <li>
              <i>L3</i>
              <div>
                <strong>승인 규칙 평가</strong>
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
            원문·규칙·의무 ID는 Supabase에 투영된 ADOMS 데이터에서 조회합니다.
            효력일과 수범주체는 최종 공개 전에 담당자 검수를 거칩니다.
          </div>
        </aside>
      </div>
    </div>
  );
}
