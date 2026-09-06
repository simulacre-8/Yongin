import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Building2,
  CheckCircle2,
  Database,
  Save,
  ShieldCheck,
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
  FALLBACK_DATASET,
  type ApplicabilityDataset,
  type ApplicabilityFacts,
} from "@/lib/applicability";

function formatRecordedAt(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Settings() {
  const [facts, setFacts] = useState<ApplicabilityFacts>(() =>
    loadStoredFacts()
  );
  const [dataset, setDataset] =
    useState<ApplicabilityDataset>(FALLBACK_DATASET);
  const [dataStatus, setDataStatus] = useState<
    "loading" | "remote" | "fallback"
  >("loading");
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

  const assessment = useMemo(
    () => assessApplicability(facts, dataset),
    [dataset, facts]
  );

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

  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SETTINGS · TARGET PROFILE</span>
          <h1>설정</h1>
          <p>적용범위 판정에 사용할 대상 프로필 사실값을 관리합니다.</p>
        </div>
        <div
          className={`settings-data-state ${dataStatus === "remote" ? "connected" : ""}`}
        >
          <Database size={15} />
          {dataStatus === "loading"
            ? "Supabase 확인 중"
            : dataStatus === "remote"
              ? "Supabase 승인규칙 연결"
              : "내장 승인규칙 사용"}
        </div>
      </div>

      <div className="settings-layout">
        <section className="settings-card settings-profile-card">
          <header>
            <div>
              <span className="settings-step">01</span>
              <div>
                <h2>대상 프로필 사실값</h2>
                <p>
                  변경값은 브라우저에 즉시 보존되고 저장 시 DB 판정기록에
                  남습니다.
                </p>
              </div>
            </div>
          </header>

          <div className="settings-form-grid">
            <label>
              <span>시설·업무 프로필</span>
              <select
                value={facts.profile}
                onChange={event =>
                  setFacts(current => ({
                    ...current,
                    profile: event.target
                      .value as ApplicabilityFacts["profile"],
                  }))
                }
              >
                <option>청사·사무시설</option>
                <option>상하수도</option>
                <option>도로·교량</option>
              </select>
            </label>

            <label>
              <span>
                <Users size={14} /> 상시근로자 수
              </span>
              <div className="settings-unit-input">
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
                <Building2 size={14} /> 시설 연면적
              </span>
              <div className="settings-unit-input">
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

            <label className="settings-switch-field">
              <span>시설물안전법 대상 여부</span>
              <button
                type="button"
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
          </div>

          <div className="settings-actions">
            <button
              className="primary-btn"
              type="button"
              disabled={saveStatus === "saving"}
              onClick={handleSave}
            >
              {saveStatus === "saved" ? (
                <CheckCircle2 size={15} />
              ) : (
                <Save size={15} />
              )}
              {saveStatus === "saving" ? "저장 중" : "사실값 저장"}
            </button>
            <Link
              href="/settings/applicability"
              className="secondary-link-button"
            >
              적용범위 판정 보기
            </Link>
          </div>

          {saveStatus !== "idle" && saveStatus !== "saving" ? (
            <p className={`settings-save-result ${saveStatus}`}>
              {saveStatus === "saved"
                ? `Supabase 판정기록 저장 완료 · ${formatRecordedAt(recordedAt)}`
                : saveStatus === "local"
                  ? "브라우저에 저장했습니다. Supabase 연결 후 판정기록을 저장할 수 있습니다."
                  : "원격 저장에 실패해 브라우저에만 보존했습니다."}
            </p>
          ) : null}
        </section>

        <aside className="settings-card settings-summary-card">
          <ShieldCheck size={22} />
          <span>현재 사실값 적용 결과</span>
          <strong>{assessment.matchedObligationIds.length}건 후보</strong>
          <dl>
            <div>
              <dt>승인규칙</dt>
              <dd>{dataset.approvedRuleTotal || 31}개</dd>
            </div>
            <div>
              <dt>현재 실행규칙</dt>
              <dd>{dataset.rules.length}개</dd>
            </div>
            <div>
              <dt>추가 확인</dt>
              <dd>{assessment.heldObligationIds.length}건</dd>
            </div>
          </dl>
          <p>
            판정 화면은 이 설정값을 읽어 적용 후보와 근거 경로만 표시합니다.
          </p>
        </aside>
      </div>
    </div>
  );
}
