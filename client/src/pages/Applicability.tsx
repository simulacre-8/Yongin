import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  DatabaseZap,
  GitBranch,
  Settings2,
} from "lucide-react";
import {
  loadApplicabilityDataset,
  loadStoredFacts,
} from "@/lib/applicability-api";
import {
  assessApplicability,
  FALLBACK_DATASET,
  type ApplicabilityDataset,
  type RuleEvaluation,
} from "@/lib/applicability";

function ruleState(rule: RuleEvaluation) {
  return rule.matched ? "조건 충족" : "조건 미충족";
}

export default function Applicability() {
  const [facts] = useState(() => loadStoredFacts());
  const [dataset, setDataset] =
    useState<ApplicabilityDataset>(FALLBACK_DATASET);
  const [dataStatus, setDataStatus] = useState<
    "loading" | "remote" | "fallback"
  >("loading");
  const [selectedObligationId, setSelectedObligationId] =
    useState("OBL-0000575");

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
    if (!dataset.obligations.some(item => item.id === selectedObligationId)) {
      setSelectedObligationId(dataset.obligations[0]?.id ?? "");
    }
  }, [dataset, selectedObligationId]);

  const assessment = useMemo(
    () => assessApplicability(facts, dataset),
    [facts, dataset]
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

  if (!selectedObligation) return null;

  return (
    <div className="page applicability-page">
      <div className="page-heading applicability-heading">
        <div>
          <span className="eyebrow">APPLICABILITY · L1 → L2 → L3</span>
          <h1>적용범위 판정</h1>
          <p>
            설정에 저장된 대상 사실값으로 법령·관리대상·의무 후보를 확인합니다.
          </p>
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

      <div className="applicability-rule-summary" role="note">
        <div>
          <strong>ADOMS 승인규칙</strong>
          <b>{dataset.approvedRuleTotal || 31}개</b>
        </div>
        <span />
        <div>
          <strong>현재 실행규칙</strong>
          <b>{dataset.rules.length}개</b>
        </div>
        <p>용인시 시연과 직접 관련된 승인규칙만 판정 결과에 반영합니다.</p>
        <Link href="/settings">
          <Settings2 size={14} /> 사실값 설정
        </Link>
      </div>

      <div className="applicability-workbench results-only">
        <section className="result-panel">
          <div className="workbench-title">
            <span>
              <GitBranch size={16} /> L1·L2·L3 적용 후보
            </span>
            <em>{dataset.source === "supabase" ? "DB 조회" : "내장 규칙"}</em>
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
              <span>{facts.profile}</span>
            </div>
            <ArrowRight size={17} />
            <div>
              <small>L3 · 의무 후보</small>
              <strong>{assessment.matchedObligationIds.length}</strong>
              <span>추가 확인 {assessment.heldObligationIds.length}건</span>
            </div>
          </div>

          <div className="confidence-band matched-band">
            <header>
              <CheckCircle2 size={16} />
              <strong>조건 충족</strong>
              <b>{assessment.matchedObligationIds.length}건</b>
            </header>
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
              <strong>추가 확인</strong>
              <b>{assessment.heldObligationIds.length}건</b>
            </header>
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
              검수되지 않은 규칙은 데이터베이스에 보존하되 자동 판정 결과에서
              제외합니다.
            </p>
          </div>
        </section>

        <aside className="trace-panel">
          <div className="workbench-title">
            <span>
              <BookOpenCheck size={16} /> 근거·판정 경로
            </span>
            <em className={selectedMatched ? "matched" : "held"}>
              {selectedMatched ? "조건 충족" : "추가 확인"}
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
                <span>{facts.profile}</span>
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
        </aside>
      </div>
    </div>
  );
}
