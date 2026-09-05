# Windows 로컬 작업 경로

용인시 시연 프로젝트의 Windows 기준 로컬 작업 루트는 다음으로 고정한다.

```text
C:\Yongin_test
```

## 폴더 구조

```text
C:\Yongin_test\
├─ client\                 React 프런트엔드와 .env.local
├─ docs\                   인수인계 문서
├─ scripts\                ETL 및 초기화 스크립트
├─ supabase\               마이그레이션과 시드
├─ data\
│  ├─ source\              원본 법령 ZIP 또는 압축 해제본
│  ├─ approved\            사람이 검수한 규칙 허용목록
│  └─ projection\
│     ├─ rdb\              Supabase 적재용 축소 CSV
│     └─ graph\            그래프 DB 전달용 노드·엣지 CSV
├─ exports\                시연용 내보내기 결과
├─ logs\                   로컬 실행·ETL 로그
└─ tmp\                    재생성 가능한 임시 파일
```

## 초기화

PowerShell에서 다음을 실행한다.

```powershell
git clone https://github.com/simulacre-8/Yongin.git C:\Yongin_test
powershell -ExecutionPolicy Bypass -File C:\Yongin_test\scripts\setup-windows.ps1
```

기존 `C:\Yongin_test`가 Git 저장소이면 `main`을 fast-forward pull한다. 폴더가 비어 있으면 저장소를 복제한다. Git 저장소가 아닌 파일이 이미 있으면 안전을 위해 중단한다.

## 축소 ETL 예시

```powershell
cd C:\Yongin_test
python scripts\build_demo_projection.py `
  --source-root C:\Yongin_test\data\source `
  --approved-links C:\Yongin_test\data\approved\approved_links.csv `
  --out C:\Yongin_test\data\projection `
  --law-limit 100
```

## 브라우저 저장 제약

React 브라우저 앱의 `localStorage`는 브라우저 보안 저장소이며 `C:\Yongin_test`에 일반 파일로 기록할 수 없다. 현재 UI 상태는 브라우저에 저장되고, 실제 업무 기록과 증빙은 Supabase Database와 Storage에 저장하도록 전환한다. 사용자가 내려받는 파일의 위치도 브라우저 다운로드 설정에 의해 결정된다.
