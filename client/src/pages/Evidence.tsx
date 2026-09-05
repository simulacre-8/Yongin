import { useState } from "react";
import { Download, FileUp, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { obligations, targets, type ComplianceStatus } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

export default function Evidence() {
  const { selectedTargetId, statuses, updateStatus, evidence, saveEvidence } = useDemo();
  const target = targets.find((item) => item.id === selectedTargetId) || targets[0];
  const [drafts, setDrafts] = useState<Record<string, { date: string; note: string; fileName: string }>>({});
  const visible = obligations.filter((item) => ["OBL-02", "OBL-03", "OBL-05", "OBL-06", "OBL-09", "OBL-10"].includes(item.id));

  const draftFor = (id: string) => drafts[id] || { date: evidence[id]?.actionDate || "2026-09-05", note: evidence[id]?.note || "", fileName: evidence[id]?.fileName || "" };
  const patchDraft = (id: string, patch: Partial<{ date: string; note: string; fileName: string }>) => setDrafts((current) => ({ ...current, [id]: { ...draftFor(id), ...patch } }));
  const saveRow = (id: string) => {
    const draft = draftFor(id);
    saveEvidence(id, { actionDate: draft.date, note: draft.note, fileName: draft.fileName || "선택된 파일 없음", uploadedAt: new Date().toISOString() });
    toast.success("의무이행 실적과 증빙 메타데이터를 저장했습니다.");
  };

  return (
    <div className="page evidence-page">
      <div className="page-heading"><div><span className="eyebrow">COMPLIANCE EVIDENCE</span><h1>관계 법령 의무이행 조치</h1><p>{target.name} · 해당연도 2026년</p></div><div className="target-chip"><span>소관부서</span><strong>{target.department}</strong></div></div>
      <div className="evidence-guide"><FileUp size={18} /><div><strong>증빙자료 등록 안내</strong><p>법령 근거는 읽기 전용이며 조치일자, 상태, 증빙자료와 비고만 입력합니다. 파일은 개당 10MB 이하입니다.</p></div></div>
      <section className="evidence-table">
        <div className="evidence-head"><span>구분·조항</span><span>법령내용</span><span>상태</span><span>조치 일자</span><span>증빙자료 <small>※개당 10MB 이하</small></span><span>비고</span><span /></div>
        {visible.map((item) => {
          const draft = draftFor(item.id);
          return <div className="evidence-row" key={item.id}>
            <span className="stack-cell"><b>{item.lawName}</b><em>{item.article}</em></span>
            <span><strong>{item.title}</strong><small>{item.detail}</small></span>
            <span><select value={statuses[selectedTargetId][item.id]} onChange={(event) => updateStatus(selectedTargetId, item.id, event.target.value as ComplianceStatus)}><option>이행완료</option><option>보완필요</option><option>미이행</option><option>해당없음</option></select></span>
            <span><input type="date" value={draft.date} onChange={(event) => patchDraft(item.id, { date: event.target.value })} /></span>
            <span className="file-cell"><label><input type="file" onChange={(event) => patchDraft(item.id, { fileName: event.target.files?.[0]?.name || "" })} /><span>{draft.fileName || "선택된 파일 없음"}</span><b>파일선택</b></label><button disabled={!draft.fileName}><Download size={14} /></button><button onClick={() => patchDraft(item.id, { fileName: "" })}><Trash2 size={14} /></button><button><Plus size={14} /></button></span>
            <span><input value={draft.note} onChange={(event) => patchDraft(item.id, { note: event.target.value })} placeholder="비고" /></span>
            <span><button className="row-save" onClick={() => saveRow(item.id)}><Save size={14} />저장</button></span>
          </div>;
        })}
      </section>
      <div className="evidence-example"><strong>증빙자료 예시(필수항목)</strong><p>관계 법령에 따른 의무이행 조치 계획서, 안전점검 결과서, 개선 완료 사진 및 내부 결재 문서 등</p></div>
    </div>
  );
}
