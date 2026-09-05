import { Download, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { obligations, statusClass, statusSymbol, targets, type ComplianceStatus } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

function rateFor(values: ComplianceStatus[]) {
  const valid = values.filter((value) => value !== "해당없음");
  return valid.length ? Math.floor((valid.filter((value) => value === "이행완료").length / valid.length) * 1000) / 10 : 0;
}

export default function Summary() {
  const { statuses } = useDemo();
  return (
    <div className="page summary-page">
      <div className="page-heading"><div><span className="eyebrow">INSPECTION SUMMARY</span><h1>의무이행 점검 총괄표</h1><p>선택된 관리대상별 10개 점검사항의 상태와 이행률을 자동 집계합니다.</p></div><div className="summary-actions"><button className="secondary-btn" onClick={() => toast.info("전자결재는 본 시연 범위에서 제외되었습니다.")}><FileCheck2 size={15} /> 결재하기</button><button className="secondary-btn" onClick={() => toast.info("엑셀 다운로드는 다음 단계에서 연결합니다.")}><Download size={15} /> 엑셀 다운로드</button></div></div>
      <section className="matrix-wrap">
        <div className="matrix-grid matrix-head" style={{ gridTemplateColumns: `minmax(340px, 2.2fr) repeat(${targets.length}, minmax(135px, .8fr)) repeat(5, minmax(92px, .55fr))` }}>
          <span>점검사항</span>{targets.map((target) => <span key={target.id}>{target.name.replace(" (시연)", "")}</span>)}<span>전체항목</span><span>이행완료<br />(O)</span><span>보완필요<br />(△)</span><span>미이행<br />(X)</span><span>해당없음<br />(-)</span>
        </div>
        {obligations.map((item, index) => {
          const rowStatuses = targets.map((target) => statuses[target.id][item.id]);
          const count = (status: ComplianceStatus) => rowStatuses.filter((value) => value === status).length;
          return <div className="matrix-grid matrix-row" key={item.id} style={{ gridTemplateColumns: `minmax(340px, 2.2fr) repeat(${targets.length}, minmax(135px, .8fr)) repeat(5, minmax(92px, .55fr))` }}>
            <span><b>{index + 1}.</b>{item.title}<small>{item.article}</small></span>
            {rowStatuses.map((status, targetIndex) => <span key={targets[targetIndex].id} className={statusClass[status]} title={status}>{statusSymbol[status]}</span>)}
            <span>{targets.length}</span><span>{count("이행완료") || "-"}</span><span>{count("보완필요") || "-"}</span><span>{count("미이행") || "-"}</span><span>{count("해당없음") || "-"}</span>
          </div>;
        })}
        <div className="matrix-grid matrix-rate" style={{ gridTemplateColumns: `minmax(340px, 2.2fr) repeat(${targets.length}, minmax(135px, .8fr)) repeat(5, minmax(92px, .55fr))` }}>
          <span>이 행 률</span>{targets.map((target) => <span key={target.id}>{rateFor(Object.values(statuses[target.id])).toFixed(1)}%</span>)}<span /><span /><span /><span /><span />
        </div>
      </section>
      <div className="matrix-legend"><span><i className="status-done">O</i>이행완료</span><span><i className="status-supplement">△</i>보완필요</span><span><i className="status-missing">X</i>미이행</span><span><i className="status-na">-</i>해당없음</span><p>해당없음(-)은 이행률 분모에서 제외됩니다.</p></div>
    </div>
  );
}
