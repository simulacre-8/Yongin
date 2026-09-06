import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { laws as fallbackLaws } from "@/lib/demo-data";
import { supabase } from "@/lib/supabase";

type LawScope = "산업" | "시민";
type CitizenTarget = "전체" | "공중이용시설" | "원료 및 제조물";
type FacilityType =
  | "전체"
  | "건축물"
  | "상하수도"
  | "옹벽"
  | "하천"
  | "터널"
  | "교량"
  | "절토사면"
  | "기타";

type LawListItem = {
  id: string;
  name: string;
  lawKind: string;
  scope: LawScope;
  target: string;
  targetType: FacilityType | "식품" | "의약품" | "화학제품" | "-";
  application: string;
  contents: string;
};

type RefLawRow = {
  law_id: string;
  title_ko: string;
  law_kind: string;
  relation_type: string | null;
};

const citizenTargets: CitizenTarget[] = [
  "전체",
  "공중이용시설",
  "원료 및 제조물",
];

const facilityTypes: FacilityType[] = [
  "전체",
  "건축물",
  "상하수도",
  "옹벽",
  "하천",
  "터널",
  "교량",
  "절토사면",
  "기타",
];

const industrialKeywords = [
  "산업안전",
  "근로",
  "고용",
  "건설",
  "중대재해",
  "작업환경",
  "유해·위험",
];

const rawMaterialKeywords = [
  "식품",
  "약사",
  "의약",
  "화학",
  "가스",
  "축산",
  "수입",
];

function includesAny(text: string, keywords: string[]) {
  return keywords.some(keyword => text.includes(keyword));
}

function lawKindLabel(value: string, title: string) {
  if (title.includes("시행규칙")) return "시행규칙";
  if (title.includes("시행령")) return "시행령";
  if (title.includes("고시")) return "고시";

  const labels: Record<string, string> = {
    act: "법률",
    law: "법률",
    decree: "대통령령",
    presidential_decree: "대통령령",
    rule: "부령",
    ministerial_rule: "부령",
    notice: "고시",
  };

  return labels[value.toLowerCase()] ?? value ?? "법률";
}

function citizenFacilityType(title: string): LawListItem["targetType"] {
  if (title.includes("하천")) return "하천";
  if (title.includes("상수도") || title.includes("하수도")) return "상하수도";
  if (title.includes("옹벽")) return "옹벽";
  if (title.includes("터널")) return "터널";
  if (title.includes("교량") || title.includes("도로")) return "교량";
  if (title.includes("절토") || title.includes("사면")) return "절토사면";
  if (
    title.includes("건축") ||
    title.includes("소방") ||
    title.includes("시설물")
  )
    return "건축물";
  if (title.includes("식품")) return "식품";
  if (title.includes("약사") || title.includes("의약")) return "의약품";
  if (title.includes("화학") || title.includes("가스")) return "화학제품";
  return "기타";
}

function toLawListItem(
  row: Pick<RefLawRow, "law_id" | "title_ko" | "law_kind" | "relation_type">
): LawListItem {
  const title = row.title_ko;
  const isIndustrial = includesAny(title, industrialKeywords);
  const isRawMaterial =
    !isIndustrial && includesAny(title, rawMaterialKeywords);

  return {
    id: row.law_id,
    name: title,
    lawKind: lawKindLabel(row.law_kind, title),
    scope: isIndustrial ? "산업" : "시민",
    target: isIndustrial
      ? "사업장"
      : isRawMaterial
        ? "원료·제조물"
        : "공중이용시설·교통수단",
    targetType: isIndustrial ? "-" : citizenFacilityType(title),
    application: row.relation_type || "중처법 의무사항",
    contents: `${title} ${row.relation_type || ""}`,
  };
}

const fallbackLawList: LawListItem[] = fallbackLaws.map(law =>
  toLawListItem({
    law_id: law.id,
    title_ko: law.name,
    law_kind: law.kind,
    relation_type: law.relation,
  })
);

const pageStyles = `
  .adoms-laws {
    max-width: 1180px;
    color: #222;
  }
  .adoms-law-search {
    display: grid;
    grid-template-columns: 205px minmax(0, 1fr);
    min-height: 148px;
    margin: 10px 0 38px;
    border: 1px solid #edf0f2;
    border-radius: 16px;
    background: #f1f3f5;
    box-shadow: 0 5px 13px rgba(25, 45, 61, 0.04);
  }
  .adoms-law-search-title {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #252525;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.05em;
  }
  .adoms-law-search-form {
    align-self: center;
    margin: 16px 20px 16px 0;
    padding: 14px 18px 15px;
    border: 1px solid #e8ebed;
    border-radius: 7px;
    background: #fff;
  }
  .adoms-law-filter-row {
    display: grid;
    grid-template-columns: 98px minmax(0, 1fr);
    align-items: center;
    min-height: 34px;
  }
  .adoms-law-filter-row + .adoms-law-filter-row {
    margin-top: 6px;
  }
  .adoms-law-filter-label {
    color: #5b6167;
    font-size: 13px;
    font-weight: 500;
  }
  .adoms-law-radio-list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px 22px;
    min-height: 31px;
  }
  .adoms-law-radio {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #535a60;
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
  }
  .adoms-law-radio input {
    width: 17px;
    height: 17px;
    margin: 0;
    accent-color: #1d6fa3;
    cursor: pointer;
  }
  .adoms-law-radio-small {
    gap: 5px;
    font-size: 9px;
  }
  .adoms-law-radio-small input {
    width: 13px;
    height: 13px;
  }
  .adoms-law-keyword-row {
    align-items: stretch;
    min-height: 41px;
  }
  .adoms-law-keyword-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 129px;
    gap: 38px;
  }
  .adoms-law-keyword-input {
    width: 100%;
    height: 41px;
    border: 1px solid #cfd3d6;
    border-radius: 5px;
    padding: 0 13px;
    outline: none;
    color: #2d3338;
    font-size: 12px;
  }
  .adoms-law-keyword-input::placeholder {
    color: #b4b8bb;
  }
  .adoms-law-keyword-input:focus {
    border-color: #d681c6;
    box-shadow: 0 0 0 2px rgba(17, 136, 193, 0.1);
  }
  .adoms-law-search-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 41px;
    border: 1px solid #c94dae;
    border-radius: 4px;
    color: #4b545a;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
  }
  .adoms-law-search-button:hover {
    border-color: #1d6fa3;
    color: #1d6fa3;
    background: #fcf3f9;
  }
  .adoms-law-list-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 44px;
    padding: 0 0 9px;
    border-bottom: 2px solid #6d7479;
  }
  .adoms-law-list-count {
    color: #262b2f;
    font-size: 17px;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  .adoms-law-list-count b {
    color: #1d6fa3;
    font-weight: 800;
  }
  .adoms-law-new-button {
    min-width: 68px;
    height: 34px;
    border: 1px solid #bfc5c9;
    border-radius: 4px;
    color: #7b8184;
    background: #fff;
    font-size: 13px;
  }
  .adoms-law-table-wrap {
    overflow: hidden;
    border: 1px solid #cfd3d5;
    border-top: 0;
    background: #fff;
  }
  .adoms-law-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .adoms-law-table thead {
    background: #eef0f2;
  }
  .adoms-law-table th {
    height: 62px;
    padding: 10px 12px;
    border-right: 1px solid #cfd3d5;
    border-bottom: 1px solid #cfd3d5;
    color: #202428;
    font-size: 15px;
    font-weight: 700;
    text-align: center;
    letter-spacing: -0.055em;
  }
  .adoms-law-table th:last-child,
  .adoms-law-table td:last-child {
    border-right: 0;
  }
  .adoms-law-table td {
    height: 64px;
    padding: 12px 15px;
    border-right: 1px solid #e1e4e6;
    border-bottom: 1px solid #dadddf;
    color: #3e464c;
    font-size: 14px;
    line-height: 1.35;
    text-align: center;
    word-break: keep-all;
  }
  .adoms-law-table tbody tr:last-child td {
    border-bottom: 0;
  }
  .adoms-law-table td.adoms-law-name-cell {
    color: #2e3539;
    font-weight: 500;
    text-align: left;
  }
  .adoms-law-empty td {
    height: 132px;
    color: #858b8f;
    font-size: 13px;
  }
  .adoms-law-readonly-note {
    margin: 10px 0 0;
    color: #858b8f;
    font-size: 10px;
    text-align: right;
  }
`;

export default function Laws() {
  const [laws, setLaws] = useState<LawListItem[]>(fallbackLawList);
  const [scope, setScope] = useState<LawScope>("산업");
  const [citizenTarget, setCitizenTarget] = useState<CitizenTarget>("전체");
  const [facilityType, setFacilityType] = useState<FacilityType>("전체");
  const [keyword, setKeyword] = useState("");
  const [searchCriteria, setSearchCriteria] = useState({
    scope: "산업" as LawScope,
    citizenTarget: "전체" as CitizenTarget,
    facilityType: "전체" as FacilityType,
    keyword: "",
  });

  useEffect(() => {
    if (!supabase) return;

    let subscribed = true;
    supabase
      .from("ref_law")
      .select("law_id,title_ko,law_kind,relation_type")
      .limit(150)
      .then(({ data, error }) => {
        if (!subscribed || error || !data?.length) return;
        setLaws(data.map(row => toLawListItem(row as RefLawRow)));
      });

    return () => {
      subscribed = false;
    };
  }, []);

  const filteredLaws = useMemo(() => {
    const normalizedKeyword = searchCriteria.keyword.trim().toLocaleLowerCase();

    return laws.filter(law => {
      if (law.scope !== searchCriteria.scope) return false;
      if (searchCriteria.scope === "시민") {
        if (
          searchCriteria.citizenTarget === "공중이용시설" &&
          law.target !== "공중이용시설·교통수단"
        ) {
          return false;
        }
        if (
          searchCriteria.citizenTarget === "원료 및 제조물" &&
          law.target !== "원료·제조물"
        ) {
          return false;
        }
        if (
          searchCriteria.citizenTarget !== "원료 및 제조물" &&
          searchCriteria.facilityType !== "전체" &&
          law.targetType !== searchCriteria.facilityType
        ) {
          return false;
        }
      }
      return (
        !normalizedKeyword ||
        law.contents.toLocaleLowerCase().includes(normalizedKeyword)
      );
    });
  }, [laws, searchCriteria]);

  const isCitizen = scope === "시민";
  const showFacilityTypes = isCitizen && citizenTarget !== "원료 및 제조물";
  const appliedIsCitizen = searchCriteria.scope === "시민";

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchCriteria({ scope, citizenTarget, facilityType, keyword });
  }

  function handleScopeChange(nextScope: LawScope) {
    setScope(nextScope);
    if (nextScope === "산업") {
      setCitizenTarget("전체");
      setFacilityType("전체");
    }
  }

  return (
    <div className="adoms-laws">
      <style>{pageStyles}</style>

      <section className="adoms-law-search" aria-label="법령 목록 검색">
        <div className="adoms-law-search-title">법령 목록</div>
        <form className="adoms-law-search-form" onSubmit={handleSearch}>
          <div className="adoms-law-filter-row">
            <span className="adoms-law-filter-label">조회 구분</span>
            <div
              className="adoms-law-radio-list"
              role="radiogroup"
              aria-label="조회 구분"
            >
              <label className="adoms-law-radio">
                <input
                  type="radio"
                  name="law-scope"
                  checked={scope === "산업"}
                  onChange={() => handleScopeChange("산업")}
                />
                중대산업재해
              </label>
              <label className="adoms-law-radio">
                <input
                  type="radio"
                  name="law-scope"
                  checked={scope === "시민"}
                  onChange={() => handleScopeChange("시민")}
                />
                중대시민재해
              </label>
            </div>
          </div>

          <div className="adoms-law-filter-row">
            <span className="adoms-law-filter-label">대상 구분</span>
            {isCitizen ? (
              <div
                className="adoms-law-radio-list"
                role="radiogroup"
                aria-label="대상 구분"
              >
                {citizenTargets.map(target => (
                  <label className="adoms-law-radio" key={target}>
                    <input
                      type="radio"
                      name="citizen-target"
                      checked={citizenTarget === target}
                      onChange={() => {
                        setCitizenTarget(target);
                        if (target === "원료 및 제조물")
                          setFacilityType("전체");
                      }}
                    />
                    {target}
                  </label>
                ))}
              </div>
            ) : (
              <div
                className="adoms-law-radio-list"
                role="radiogroup"
                aria-label="대상 구분"
              >
                <label className="adoms-law-radio">
                  <input
                    type="radio"
                    name="industrial-target"
                    checked
                    readOnly
                  />
                  사업장
                </label>
              </div>
            )}
          </div>

          {showFacilityTypes && (
            <div className="adoms-law-filter-row">
              <span className="adoms-law-filter-label" aria-hidden="true" />
              <div
                className="adoms-law-radio-list"
                role="radiogroup"
                aria-label="시설유형"
              >
                {facilityTypes.map(type => (
                  <label
                    className="adoms-law-radio adoms-law-radio-small"
                    key={type}
                  >
                    <input
                      type="radio"
                      name="facility-type"
                      checked={facilityType === type}
                      onChange={() => setFacilityType(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="adoms-law-filter-row adoms-law-keyword-row">
            <label
              className="adoms-law-filter-label"
              htmlFor="adoms-law-keyword"
            >
              법령 및 내용
            </label>
            <div className="adoms-law-keyword-controls">
              <input
                id="adoms-law-keyword"
                className="adoms-law-keyword-input"
                value={keyword}
                onChange={event => setKeyword(event.target.value)}
                placeholder="법령 및 내용을 입력하세요"
              />
              <button className="adoms-law-search-button" type="submit">
                <Search size={18} strokeWidth={1.9} />
                검색
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="adoms-law-list" aria-label="관계 법령 목록">
        <div className="adoms-law-list-top">
          <strong className="adoms-law-list-count">
            총 <b>{filteredLaws.length}</b>건
          </strong>
          <button
            className="adoms-law-new-button"
            type="button"
            disabled
            aria-disabled="true"
          >
            신규
          </button>
        </div>

        <div className="adoms-law-table-wrap">
          <table className="adoms-law-table">
            <colgroup>
              <col style={{ width: appliedIsCitizen ? "22%" : "18%" }} />
              <col style={{ width: appliedIsCitizen ? "28%" : "24%" }} />
              <col style={{ width: appliedIsCitizen ? "36%" : "46%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">대상 구분</th>
                <th scope="col">
                  {appliedIsCitizen ? "대상 유형" : "적용 구분"}
                </th>
                <th scope="col">법령명</th>
                <th scope="col">법령구분</th>
              </tr>
            </thead>
            <tbody>
              {filteredLaws.length ? (
                filteredLaws.map(law => (
                  <tr key={law.id}>
                    <td>{law.target}</td>
                    <td>
                      {appliedIsCitizen ? law.targetType : law.application}
                    </td>
                    <td className="adoms-law-name-cell">{law.name}</td>
                    <td>{law.lawKind}</td>
                  </tr>
                ))
              ) : (
                <tr className="adoms-law-empty">
                  <td colSpan={4}>조회된 법령이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="adoms-law-readonly-note">
          관계 법령 기준정보는 읽기 전용입니다.
        </p>
      </section>
    </div>
  );
}
