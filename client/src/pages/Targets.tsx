import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Building2, MapPin, Search, UserRound } from "lucide-react";
import { targets } from "@/lib/demo-data";
import { useDemo } from "@/contexts/DemoContext";

export default function Targets() {
  const [, navigate] = useLocation();
  const { selectedTargetId, setSelectedTargetId } = useDemo();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => targets.filter((item) => `${item.name} ${item.department} ${item.type}`.includes(query)), [query]);
  const selected = targets.find((item) => item.id === selectedTargetId) || targets[0];

  return (
    <div className="page">
      <div className="page-heading"><div><span className="eyebrow">MANAGED TARGETS</span><h1>관리대상 현황</h1><p>담당 시설의 기본정보와 법 의무사항 등록 현황을 조회합니다.</p></div></div>
      <div className="search-panel">
        <div className="filter-label">관리대상</div>
        <label><span>시설구분</span><select defaultValue="전체"><option>전체</option><option>건축물</option><option>상하수도</option><option>교량</option></select></label>
        <label className="search-input"><span>검색조건</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="시설물명 또는 부서명을 입력하세요" /><Search size={17} /></label>
        <button className="outline-btn"><Search size={15} /> 검색</button>
      </div>

      <div className="split-layout">
        <section className="data-panel grow">
          <div className="panel-bar"><strong>총 <b>{filtered.length}</b>개소</strong><span>입력완료 3개소</span></div>
          <div className="data-table target-table">
            <div className="table-head"><span>시설물명</span><span>시설구분</span><span>담당부서</span><span>담당자</span><span>상태</span></div>
            {filtered.map((item) => <button key={item.id} className={`table-row ${selected.id === item.id ? "selected" : ""}`} onClick={() => setSelectedTargetId(item.id)}>
              <span><Building2 size={15} />{item.name}</span><span>{item.type.split(" / ")[1]}</span><span>{item.department}</span><span>{item.manager}</span><span><i className="complete-dot" />입력완료</span>
            </button>)}
          </div>
        </section>

        <aside className="detail-panel">
          <span className="detail-kicker">선택 대상</span><h2>{selected.name}</h2><p className="detail-type">{selected.type}</p>
          <dl><div><dt><MapPin size={14} />주소</dt><dd>{selected.address}</dd></div><div><dt><UserRound size={14} />소관 / 담당</dt><dd>{selected.department} / {selected.manager}</dd></div></dl>
          <div className="attribute-grid">{Object.entries(selected.attributes).map(([key, value]) => <div key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}</div>
          <div className="detail-actions"><button className="secondary-btn" onClick={() => navigate("/laws")}>관계 법령 조회</button><button className="primary-btn" onClick={() => navigate("/obligations")}>법 의무사항 입력</button></div>
        </aside>
      </div>
    </div>
  );
}
