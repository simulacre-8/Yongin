import { useState } from "react";
import { ChevronDown, Download, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { obligations, targets, type ComplianceStatus } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

export default function Inspection() {
  const { statuses, updateStatus, evidence, inspectionNotes, saveInspectionNote } = useDemo();
  const [activeId, setActiveId] = useState("OBL-02");
  const obligation = obligations.find((item) => item.id === activeId) || obligations[0];

  return (
    <div className="page inspection-page">
      <div className="page-heading"><div><span className="eyebrow">INSPECTION & CORRECTIVE ACTION</span><h1>이행점검(공중이용시설)</h1><p>의무 항목별 실적과 증빙을 확인하고 상태와 점검내용을 판정합니다.</p></div><button className="secondary-btn" onClick={() => toast.success("현재 점검 결과를 저장했습니다.")}><Save size={15} /> 점검 저장</button></div>
      <div className="inspection-list">
        {obligations.map((item, index) => <section key={item.id} className={`inspection-section ${activeId === item.id ? "open" : ""}`}>
          <button className="inspection-title" onClick={() => setActiveId(item.id)}><span>{index + 1}. {item.title}</span><small>{item.article}</small><ChevronDown size={18} /></button>
          {activeId === item.id && <div className="inspection-body">
            <div className="inspection-head"><span>상태</span><span>점검내용</span><span>사업장</span><span>부서</span><span>의무이행 일자</span><span>증빙자료</span></div>
            {targets.map((target) => {
              const key = `${target.id}:${item.id}`;
              const record = evidence[item.id];
              return <div className="inspection-row" key={target.id}>
                <span><select value={statuses[target.id][item.id]} onChange={(event) => updateStatus(target.id, item.id, event.target.value as ComplianceStatus)}><option>이행완료</option><option>보완필요</option><option>미이행</option><option>해당없음</option></select></span>
                <span><textarea value={inspectionNotes[key] || ""} onChange={(event) => saveInspectionNote(key, event.target.value)} placeholder="점검 결과 또는 보완 지시를 입력하세요" /></span>
                <span className="readonly">{target.name.replace(" (시연)", "")}</span><span className="readonly">{target.department}</span><span className="readonly">{record?.actionDate || "-"}</span>
                <span className="readonly evidence-readonly"><em>{record?.fileName || "등록 파일 없음"}</em><button disabled={!record?.fileName}><Download size={14} /></button><button disabled={!record?.fileName}><Eye size={14} />뷰어</button></span>
              </div>;
            })}
          </div>}
        </section>)}
      </div>
      <div className="inspection-note">점검자는 <strong>상태</strong>와 <strong>점검내용</strong>만 수정할 수 있습니다. 사업장·부서·이행일자·증빙자료는 담당자가 등록한 값을 읽기 전용으로 표시합니다.</div>
    </div>
  );
}
