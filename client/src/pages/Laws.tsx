import { useEffect, useMemo, useState } from "react";
import { BookMarked, CheckCircle2, Search } from "lucide-react";
import { laws as fallbackLaws, type DemoLaw } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

export default function Laws() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("전체");
  const [laws, setLaws] = useState<DemoLaw[]>(fallbackLaws);
  const [source, setSource] = useState("시연 축소본");
  const [selected, setSelected] = useState<DemoLaw>(fallbackLaws[0]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("ref_law").select("law_id,title_ko,law_kind,relation_type").limit(150).then(({ data, error }) => {
      if (!error && data?.length) {
        const mapped = data.map((row) => ({ id: row.law_id, name: row.title_ko, kind: row.law_kind, relation: row.relation_type, article: "관련 조문", summary: "Supabase 축소 법령 DB에서 조회", confidence: "검수완료" as const }));
        setLaws(mapped); setSelected(mapped[0]); setSource("Supabase ref_law");
      }
    });
  }, []);

  const filtered = useMemo(() => laws.filter((item) => (kind === "전체" || item.kind === kind) && `${item.name} ${item.summary} ${item.article}`.includes(query)), [laws, kind, query]);

  return (
    <div className="page">
      <div className="page-heading"><div><span className="eyebrow">LEGAL REFERENCE DATABASE</span><h1>관계 법령 관리</h1><p>시연 대상과 직접 연결되는 핵심 법령 50~150개를 축소해 제공합니다.</p></div><div className="source-badge"><CheckCircle2 size={14} />{source}</div></div>
      <div className="search-panel">
        <div className="filter-label">법령 목록</div>
        <label><span>대상 구분</span><select defaultValue="전체"><option>전체</option><option>사업장</option><option>공중이용시설</option><option>원료·제조물</option></select></label>
        <label><span>법령구분</span><select value={kind} onChange={(event) => setKind(event.target.value)}><option>전체</option><option>법률</option><option>시행규칙</option></select></label>
        <label className="search-input"><span>법령 및 내용</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="법령명, 조문 또는 내용을 입력하세요" /><Search size={17} /></label>
        <button className="outline-btn"><Search size={15} /> 검색</button>
      </div>

      <div className="split-layout laws-layout">
        <section className="data-panel grow">
          <div className="panel-bar"><strong>총 <b>{filtered.length}</b>건</strong><span>데모 승인 규칙만 자동 판정에 사용</span></div>
          <div className="data-table law-table">
            <div className="table-head"><span>대상 구분</span><span>법령명</span><span>조문</span><span>법령구분</span><span>검수</span></div>
            {filtered.map((law) => <button key={law.id} className={`table-row ${selected.id === law.id ? "selected" : ""}`} onClick={() => setSelected(law)}>
              <span>{law.relation}</span><span className="law-name"><BookMarked size={15} />{law.name}</span><span>{law.article}</span><span>{law.kind}</span><span><i className={law.confidence === "검수완료" ? "reviewed" : "pending"}>{law.confidence}</i></span>
            </button>)}
          </div>
        </section>
        <aside className="detail-panel law-detail">
          <span className="detail-kicker">법령 근거</span><h2>{selected.name}</h2><div className="law-id">{selected.id}</div>
          <div className="law-article"><span>{selected.kind}</span><strong>{selected.article}</strong></div>
          <p className="legal-quote">{selected.summary}</p>
          <div className="trace-box"><span>원천 추적</span><code>law_id → unit_id → rul_id → obl_id</code><p>원천 식별자와 검수 버전을 유지해 그래프 DB로 확장할 수 있습니다.</p></div>
        </aside>
      </div>
    </div>
  );
}
