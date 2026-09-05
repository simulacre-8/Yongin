export type Role = "담당자" | "실·국 점검자" | "경영책임자";
export type ComplianceStatus = "이행완료" | "보완필요" | "미이행" | "해당없음";

export type DemoTarget = {
  id: string;
  name: string;
  department: string;
  type: string;
  address: string;
  manager: string;
  attributes: Record<string, string | number>;
};

export type DemoLaw = {
  id: string;
  name: string;
  kind: string;
  relation: string;
  article: string;
  summary: string;
  confidence: "검수완료" | "검수대기";
};

export type DemoObligation = {
  id: string;
  group: string;
  title: string;
  detail: string;
  lawName: string;
  article: string;
  scheduleType: "month" | "half";
  defaultDue: string;
};

export const targets: DemoTarget[] = [
  {
    id: "target-yongin-cityhall",
    name: "용인시청 청사 (시연)",
    department: "시민안전관",
    type: "공중이용시설·교통수단 / 건축물",
    address: "경기도 용인시 처인구 중부대로 1199",
    manager: "김안전",
    attributes: { 연면적: 39872, 수용인원: 1800, 준공연도: 2005 },
  },
  {
    id: "target-suji-water",
    name: "수지레스피아 (시연)",
    department: "하수시설과",
    type: "공중이용시설·교통수단 / 상하수도",
    address: "경기도 용인시 수지구 포은대로 499",
    manager: "이점검",
    attributes: { 일처리용량: 150000, 상시근로자: 62, 운영방식: "직영" },
  },
  {
    id: "target-jukjeon-bridge",
    name: "죽전교 (시연)",
    department: "도로관리과",
    type: "공중이용시설·교통수단 / 교량",
    address: "경기도 용인시 수지구 죽전동 일원",
    manager: "박시설",
    attributes: { 연장: 284, 차로수: 6, 시설등급: "2종" },
  },
];

export const laws: DemoLaw[] = [
  { id: "LAW-KR-000002", name: "중대재해 처벌 등에 관한 법률", kind: "법률", relation: "기준법", article: "제4조", summary: "사업주와 경영책임자 등의 안전 및 보건 확보의무", confidence: "검수완료" },
  { id: "LAW-KR-000011", name: "시설물의 안전 및 유지관리에 관한 특별법", kind: "법률", relation: "공중이용시설", article: "제6조·제11조", summary: "시설물의 안전 및 유지관리계획과 안전점검", confidence: "검수완료" },
  { id: "LAW-KR-000020", name: "산업안전보건법", kind: "법률", relation: "사업장", article: "제36조", summary: "위험성평가의 실시와 필요한 조치", confidence: "검수완료" },
  { id: "LAW-DEMO-004", name: "산업안전보건기준에 관한 규칙", kind: "시행규칙", relation: "사업장", article: "제35조", summary: "관리감독자의 유해·위험 방지 업무", confidence: "검수완료" },
  { id: "LAW-DEMO-005", name: "건축물관리법", kind: "법률", relation: "건축물", article: "제13조", summary: "건축물 정기점검 및 유지관리", confidence: "검수완료" },
  { id: "LAW-DEMO-006", name: "도로법", kind: "법률", relation: "도로·교량", article: "제50조", summary: "도로 구조와 시설의 안전점검", confidence: "검수완료" },
  { id: "LAW-DEMO-007", name: "하수도법", kind: "법률", relation: "상하수도", article: "제19조", summary: "공공하수도의 운영·관리와 기술진단", confidence: "검수완료" },
  { id: "LAW-DEMO-008", name: "화학물질관리법", kind: "법률", relation: "원료·제조물", article: "제13조", summary: "유해화학물질 취급기준과 사고예방", confidence: "검수대기" },
  { id: "LAW-DEMO-009", name: "소방시설 설치 및 관리에 관한 법률", kind: "법률", relation: "건축물", article: "제12조", summary: "특정소방대상물의 소방시설 관리", confidence: "검수완료" },
  { id: "LAW-DEMO-010", name: "재난 및 안전관리 기본법", kind: "법률", relation: "공통", article: "제25조의2", summary: "재난관리책임기관의 안전관리체계", confidence: "검수완료" },
];

export const obligations: DemoObligation[] = [
  { id: "OBL-01", group: "① 안전보건관리체계 구축 및 이행", title: "필요한 안전인력 확보", detail: "안전관리 업무를 수행할 인력의 확보 및 배치", lawName: "중대재해 처벌 등에 관한 법률", article: "시행령 제4조 제2호", scheduleType: "month", defaultDue: "2026-09" },
  { id: "OBL-02", group: "① 안전보건관리체계 구축 및 이행", title: "필요한 예산 편성·집행", detail: "안전점검, 보수·보강 및 안전조치 예산 관리", lawName: "중대재해 처벌 등에 관한 법률", article: "시행령 제4조 제4호", scheduleType: "half", defaultDue: "하반기" },
  { id: "OBL-03", group: "① 안전보건관리체계 구축 및 이행", title: "정기안전점검", detail: "시설물안전법상 정기안전점검 실시", lawName: "시설물의 안전 및 유지관리에 관한 특별법", article: "제11조", scheduleType: "month", defaultDue: "2026-10" },
  { id: "OBL-04", group: "① 안전보건관리체계 구축 및 이행", title: "정밀안전점검", detail: "시설 상태에 따른 정밀안전점검 실시", lawName: "시설물의 안전 및 유지관리에 관한 특별법", article: "제12조", scheduleType: "month", defaultDue: "2026-11" },
  { id: "OBL-05", group: "① 안전보건관리체계 구축 및 이행", title: "시설물 안전 및 유지관리계획", detail: "연간 안전 및 유지관리계획 수립", lawName: "시설물의 안전 및 유지관리에 관한 특별법", article: "제6조", scheduleType: "month", defaultDue: "2026-09" },
  { id: "OBL-06", group: "① 안전보건관리체계 구축 및 이행", title: "유해·위험요인의 확인·점검", detail: "유해·위험요인을 정기적으로 확인하고 개선", lawName: "산업안전보건법", article: "제36조", scheduleType: "half", defaultDue: "하반기" },
  { id: "OBL-07", group: "① 안전보건관리체계 구축 및 이행", title: "비상대피훈련", detail: "중대시민재해 대응 비상대피훈련 실시", lawName: "재난 및 안전관리 기본법", article: "제35조", scheduleType: "month", defaultDue: "2026-10" },
  { id: "OBL-08", group: "② 재해발생 시 재발방지대책", title: "재발방지대책 수립·이행", detail: "재해 발생 시 원인분석 및 재발방지 조치", lawName: "중대재해 처벌 등에 관한 법률", article: "제4조 제1항 제2호", scheduleType: "half", defaultDue: "하반기" },
  { id: "OBL-09", group: "③ 개선·시정 등을 명한 사항 이행", title: "개선·시정 조치 이행", detail: "행정기관의 개선·시정 명령에 따른 조치", lawName: "중대재해 처벌 등에 관한 법률", article: "제4조 제1항 제3호", scheduleType: "half", defaultDue: "하반기" },
  { id: "OBL-10", group: "④ 관계 법령상 의무이행", title: "관계 법령상 의무이행", detail: "대상 시설에 적용되는 관계 법령의 조치와 증빙", lawName: "시설물의 안전 및 유지관리에 관한 특별법", article: "제6조·제11조", scheduleType: "month", defaultDue: "2026-09" },
];

export const statusSymbol: Record<ComplianceStatus, string> = {
  이행완료: "O",
  보완필요: "△",
  미이행: "X",
  해당없음: "-",
};

export const statusClass: Record<ComplianceStatus, string> = {
  이행완료: "status-done",
  보완필요: "status-supplement",
  미이행: "status-missing",
  해당없음: "status-na",
};

export const initialStatuses: Record<string, Record<string, ComplianceStatus>> = {
  "target-yongin-cityhall": {
    "OBL-01": "이행완료", "OBL-02": "보완필요", "OBL-03": "이행완료", "OBL-04": "이행완료", "OBL-05": "이행완료",
    "OBL-06": "이행완료", "OBL-07": "이행완료", "OBL-08": "이행완료", "OBL-09": "미이행", "OBL-10": "이행완료",
  },
  "target-suji-water": {
    "OBL-01": "이행완료", "OBL-02": "이행완료", "OBL-03": "미이행", "OBL-04": "이행완료", "OBL-05": "이행완료",
    "OBL-06": "해당없음", "OBL-07": "이행완료", "OBL-08": "이행완료", "OBL-09": "해당없음", "OBL-10": "이행완료",
  },
  "target-jukjeon-bridge": {
    "OBL-01": "이행완료", "OBL-02": "이행완료", "OBL-03": "해당없음", "OBL-04": "이행완료", "OBL-05": "이행완료",
    "OBL-06": "이행완료", "OBL-07": "미이행", "OBL-08": "보완필요", "OBL-09": "이행완료", "OBL-10": "이행완료",
  },
};
