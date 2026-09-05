import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  initialStatuses,
  obligations,
  type ComplianceStatus,
  type Role,
} from "@/lib/demo-data";

type EvidenceRecord = {
  fileName: string;
  actionDate: string;
  note: string;
  uploadedAt: string;
};

type DemoContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  selectedTargetId: string;
  setSelectedTargetId: (id: string) => void;
  statuses: Record<string, Record<string, ComplianceStatus>>;
  updateStatus: (targetId: string, obligationId: string, status: ComplianceStatus) => void;
  dueDates: Record<string, string>;
  updateDueDate: (obligationId: string, value: string) => void;
  evidence: Record<string, EvidenceRecord>;
  saveEvidence: (obligationId: string, record: EvidenceRecord) => void;
  inspectionNotes: Record<string, string>;
  saveInspectionNote: (key: string, note: string) => void;
  resetDemo: () => void;
};

const STORAGE_KEY = "yongin-safety-demo-v1";

const defaultDueDates = Object.fromEntries(obligations.map((item) => [item.id, item.defaultDue]));

function loadPersisted() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function persist(next: object) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const saved = typeof window === "undefined" ? null : loadPersisted();
  const [role, setRoleState] = useState<Role>(saved?.role || "경영책임자");
  const [selectedTargetId, setSelectedTargetIdState] = useState(saved?.selectedTargetId || "target-yongin-cityhall");
  const [statuses, setStatuses] = useState(saved?.statuses || initialStatuses);
  const [dueDates, setDueDates] = useState<Record<string, string>>(saved?.dueDates || defaultDueDates);
  const [evidence, setEvidence] = useState<Record<string, EvidenceRecord>>(saved?.evidence || {});
  const [inspectionNotes, setInspectionNotes] = useState<Record<string, string>>(saved?.inspectionNotes || {
    "target-yongin-cityhall:OBL-02": "집행계획서의 세부 산출근거 보완 필요",
    "target-yongin-cityhall:OBL-09": "개선 조치 결과와 증빙자료 등록 필요",
  });

  const snapshot = (override: Record<string, unknown> = {}) => ({
    role,
    selectedTargetId,
    statuses,
    dueDates,
    evidence,
    inspectionNotes,
    ...override,
  });

  const setRole = (next: Role) => {
    setRoleState(next);
    persist(snapshot({ role: next }));
  };
  const setSelectedTargetId = (next: string) => {
    setSelectedTargetIdState(next);
    persist(snapshot({ selectedTargetId: next }));
  };
  const updateStatus = (targetId: string, obligationId: string, status: ComplianceStatus) => {
    const next = { ...statuses, [targetId]: { ...statuses[targetId], [obligationId]: status } };
    setStatuses(next);
    persist(snapshot({ statuses: next }));
  };
  const updateDueDate = (obligationId: string, value: string) => {
    const next = { ...dueDates, [obligationId]: value };
    setDueDates(next);
    persist(snapshot({ dueDates: next }));
  };
  const saveEvidence = (obligationId: string, record: EvidenceRecord) => {
    const next = { ...evidence, [obligationId]: record };
    setEvidence(next);
    persist(snapshot({ evidence: next }));
  };
  const saveInspectionNote = (key: string, note: string) => {
    const next = { ...inspectionNotes, [key]: note };
    setInspectionNotes(next);
    persist(snapshot({ inspectionNotes: next }));
  };
  const resetDemo = () => {
    setRoleState("경영책임자");
    setSelectedTargetIdState("target-yongin-cityhall");
    setStatuses(initialStatuses);
    setDueDates(defaultDueDates);
    setEvidence({});
    setInspectionNotes({
      "target-yongin-cityhall:OBL-02": "집행계획서의 세부 산출근거 보완 필요",
      "target-yongin-cityhall:OBL-09": "개선 조치 결과와 증빙자료 등록 필요",
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ role, setRole, selectedTargetId, setSelectedTargetId, statuses, updateStatus, dueDates, updateDueDate, evidence, saveEvidence, inspectionNotes, saveInspectionNote, resetDemo }),
    [role, selectedTargetId, statuses, dueDates, evidence, inspectionNotes],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("useDemo must be used inside DemoProvider");
  return context;
}
