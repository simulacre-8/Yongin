import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  DatabaseZap,
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
          <span className="eyebrow">진단·설정</span>
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
              <CheckCircle2 size={16} /> 승인규칙 판정 결과
            </span>
            <em>{dataset.source === "supabase" ? "DB 조회" : "내장 규칙"}</em>
          </div>
          <div className="applicability-decision-grid">
            <article className="decision-card matched-card">
              <header>
                <span>
                  <CheckCircle2 size={17} />
                  <strong>조건 충족</strong>
                </span>
                <b>{assessment.matchedObligationIds.length}건</b>
              </header>
              <p>저장된 사실값으로 적용 조건이 충족된 의무입니다.</p>
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
            </article>

            <article className="decision-card conditional-card">
              <header>
                <span>
                  <CircleHelp size={17} />
                  <strong>추가 확인</strong>
                </span>
                <b>{assessment.heldObligationIds.length}건</b>
              </header>
              <p>적용 여부를 확정하려면 대상 사실값을 추가 확인해야 합니다.</p>
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
            </article>

            <article className="decision-card source-review-card">
              <header>
                <span>
                  <AlertTriangle size={17} />
                  <strong>원천 검수 필요</strong>
                </span>
                <b>별도 큐</b>
              </header>
              <p>
                승인되지 않은 규칙은 데이터베이스에 보존하되 자동 판정 결과에서
                제외합니다.
              </p>
              <div className="source-review-note">
                <strong>현재 자동 판정</strong>
                <span>{dataset.rules.length}개 승인규칙만 실행</span>
                <small>
                  검수 대기 규칙은 승인 후 같은 판정 화면에 포함됩니다.
                </small>
              </div>
            </article>
          </div>
        </section>

        <section className="trace-panel">
          <div className="workbench-title">
            <span>
              <BookOpenCheck size={16} /> 근거·판정 경로
            </span>
            <em className={selectedMatched ? "matched" : "held"}>
              {selectedMatched ? "조건 충족" : "추가 확인"}
            </em>
          </div>
          <div className="trace-content-grid">
            <div className="trace-overview">
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
            </div>

            <ol className="trace-route-list">
              <li>
                <strong>적용 법령</strong>
                <span>{selectedObligation.lawName}</span>
              </li>
              <li>
                <strong>대상 사실</strong>
                <span>
                  {facts.profile} · 상시근로자 {facts.workerCount}명 · 연면적{" "}
                  {facts.grossArea.toLocaleString()}㎡
                </span>
              </li>
              <li>
                <strong>판정 규칙</strong>
                <span>
                  {selectedRules
                    .map(rule => `${rule.id} ${ruleState(rule)}`)
                    .join(" / ") || "연결 규칙 확인 필요"}
                </span>
              </li>
            </ol>
          </div>

          <div className="trace-evidence-grid">
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
          </div>
        </section>
      </div>
    </div>
  );
}
