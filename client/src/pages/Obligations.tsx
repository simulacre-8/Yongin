import { CalendarDays, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { obligations, targets } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

export default function Obligations() {
  const { selectedTargetId, dueDates, updateDueDate } = useDemo();
  const target = targets.find((item) => item.id === selectedTargetId) || targets[0];

  return (
    <div className="page obligation-page">
      <div className="page-heading"><div><span className="eyebrow">LEGAL OBLIGATION MAPPING</span><h1>법 의무사항 · 공중이용시설·교통수단</h1><p>대상 조건과 검수 규칙으로 도출된 의무의 이행 시기를 저장합니다.</p></div><div className="target-chip"><span>대상</span><strong>{target.name}</strong></div></div>
      <div className="rule-result-bar"><div><span>판정 결과</span><strong>적용 법령 6개</strong><strong>도출 의무 {obligations.length}개</strong></div><p>검수된 규칙 10개 중 대상 조건을 충족한 항목만 표시합니다.</p></div>

      <section className="hierarchy-panel">
        <div className="hierarchy-head"><span>법</span><span>시행령·의무영역</span><span>의무사항</span><span>근거 조문</span><span>이행 시기</span></div>
        {obligations.map((item, index) => <div className="hierarchy-row" key={item.id}>
          <span className="law-group">{index === 0 ? "① 안전보건관리체계 구축 및 이행" : index === 7 ? "② 재발방지대책" : index === 8 ? "③ 개선·시정 이행" : index === 9 ? "④ 관계 법령 의무이행" : "↳"}</span>
          <span><b>{item.group}</b></span>
          <span><strong>{item.title}</strong><small>{item.detail}</small></span>
          <span><em>{item.lawName}</em><small>{item.article}</small></span>
          <span className="due-control">{item.scheduleType === "month" ? <><CalendarDays size={15} /><input type="month" value={dueDates[item.id]} onChange={(event) => updateDueDate(item.id, event.target.value)} /></> : <select value={dueDates[item.id]} onChange={(event) => updateDueDate(item.id, event.target.value)}><option>상반기</option><option>하반기</option></select>}</span>
        </div>)}
      </section>
      <div className="page-actions"><button className="secondary-btn" onClick={() => obligations.forEach((item) => updateDueDate(item.id, item.defaultDue))}><RotateCcw size={15} /> 항목 초기화</button><button className="primary-btn" onClick={() => toast.success("법 의무사항의 이행 시기가 저장되었습니다.")}><Save size={15} /> 저장</button></div>
    </div>
  );
}
