# ADOMS 용인특례시 시연 인수인계·사용법

**기준일:** 2026-09-07  
**정본 저장소:** [simulacre-8/Yongin][1]  
**최종 시연 사이트:** [sapa-yongin.netlify.app][2]

## 1. 결론

현재 시연 프로젝트의 자료 인수 창구는 **GitHub 저장소 하나**로 통일한다. 정민하 전무가 GitHub와 Supabase 접근권한을 보유하고 있으므로, 소스·SQL·시드·테스트·운영문서·Word 양식은 GitHub에서 내려받고, 실데이터와 첨부파일은 기존 Supabase 프로젝트에서 이어서 사용하면 된다.

> 단순 자료 전달은 GitHub의 **Code → Download ZIP**으로 끝난다. 다만 ZIP에는 Git 커밋 이력이 없으므로, 이후 수정까지 이어갈 담당자는 `git clone`을 권장한다.

## 2. 가장 간단한 이용 방법

시연자는 별도 설치 없이 아래 사이트에 접속한다.

- [https://sapa-yongin.netlify.app][2]

대표 시연 흐름은 다음과 같다.

| 순서 | 메뉴            | 확인 내용                                                  |
| ---: | --------------- | ---------------------------------------------------------- |
|    1 | 홈              | 중처법 카테고리·중대재해 유형별 의무 조회                  |
|    2 | 설정            | 대상 프로필 사실값과 공식 조직도 확인                      |
|    3 | 적용범위        | 조건 충족·추가 확인·원천 검수 필요와 판정 근거 확인        |
|    4 | 관리대상        | 시설·공중교통수단·도급/용역 대상과 적용 의무 확인          |
|    5 | 의무 체크리스트 | 시설명·주소·소속 검색과 대상별 의무 확인                   |
|    6 | 의무이행        | 업무구분·기록구분·이행기간·문서요약·증빙 저장 및 로그 확인 |
|    7 | 내 업무         | 자동/수동 배정, 수락, 위임, 상태, 완료, 확인, CSV 확인     |

## 3. GitHub에서 전체 자료 받기

### 방법 A. ZIP 다운로드

1. [GitHub 저장소][1]에 접속한다.
2. **Code** 버튼을 누른다.
3. **Download ZIP**을 선택한다.
4. 압축을 해제한다.

직접 다운로드 주소는 다음과 같다.

- [Yongin main 브랜치 ZIP][3]

ZIP 안에는 다음 자료가 포함된다.

| 경로                            | 내용                                               |
| ------------------------------- | -------------------------------------------------- |
| `client/`                       | React/Vite 화면 소스                               |
| `supabase/migrations/`          | DB 스키마 변경 SQL                                 |
| `supabase/seed*.sql`            | 법령·시설·조직·시연 데이터 시드                    |
| `scripts/`                      | 데이터 생성·검증·스모크 테스트                     |
| `docs/`                         | 운영·검증·데이터·화면·법령 근거 문서               |
| `docs/compliance-action-forms/` | 계획·계약·정밀안전진단·안전점검·기타 Word 양식 1~5 |
| `docs/deliverables/`            | 클라이언트용 V1 상세 업무명세 HTML                 |
| `netlify.toml`                  | Netlify 빌드·배포 설정                             |
| `README.md`                     | 전체 구조·DB 적용 순서·검증 명령                   |

### 방법 B. 수정 작업까지 이어갈 때

```bash
git clone https://github.com/simulacre-8/Yongin.git
cd Yongin
```

이미 복제한 저장소를 최신 상태로 맞출 때는 다음 명령을 사용한다.

```bash
git checkout main
git pull origin main
```

## 4. 로컬 실행

필요 조건은 **Node.js 22**와 **pnpm**이다.

```bash
corepack enable
pnpm install --frozen-lockfile
```

`client/.env.local` 파일을 만들고 현재 Supabase 프로젝트의 공개 연결값만 입력한다.

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

실행한다.

```bash
pnpm dev
```

브라우저에서 터미널에 표시된 로컬 주소로 접속한다.

**서비스 역할 키, 데이터베이스 비밀번호, GitHub 토큰은 `.env.local`, 소스 또는 브라우저에 넣지 않는다.**

## 5. 기존 배포를 이어서 사용하는 방법

현재 운영 경로는 다음과 같다.

| 서비스   | 역할                  | 인수 방법                       |
| -------- | --------------------- | ------------------------------- |
| GitHub   | 소스·SQL·문서 정본    | 저장소 접근권한으로 인수        |
| Supabase | 실데이터·첨부 Storage | 기존 프로젝트 접근권한으로 인수 |
| Netlify  | 최종 사이트 자동배포  | 기존 사이트 접근권한으로 인수   |

GitHub `main` 브랜치에 변경사항을 push하면 연결된 Netlify 사이트가 자동으로 다시 배포된다. Netlify에는 다음 두 공개 환경변수만 유지한다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

현재 Supabase 프로젝트를 계속 쓸 때는 SQL을 다시 실행할 필요가 없다. 새 Supabase 프로젝트로 복제할 때만 `README.md`와 `docs/SUPABASE_RUNBOOK.md`의 **마이그레이션 → 시드 순서**를 따른다.

## 6. Git ZIP에 포함되지 않는 항목

Git ZIP에는 보안을 위해 다음 항목이 들어 있지 않다.

- Supabase 서비스 역할 키와 데이터베이스 비밀번호
- GitHub·Netlify 접근 토큰
- Supabase Storage에 실제 업로드된 파일 객체
- Git 커밋 이력

현재 인수에서는 정민하 전무가 Supabase와 GitHub에 접근할 수 있으므로 문제가 없다. 즉, **소스와 문서는 GitHub ZIP에서 받고, 현재 DB와 첨부파일은 기존 Supabase 프로젝트에서 계속 사용한다.**

## 7. 시연 중 주의사항

| 항목        | 주의사항                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| 역할 선택   | 경영책임자·실/국 점검자·담당자는 공유 시연 역할이며 실제 사용자 인증이 아니다.                                   |
| 초기화      | 헤더 초기화는 내 업무 시연 런타임과 내 업무 첨부를 초기화한다. 법령·시설·조직도와 기존 의무이행 증빙은 유지한다. |
| 증빙        | 허용 형식은 HWP, TXT, PNG, JPG/JPEG, DOC/DOCX, PDF이며 파일당 최대 10MB다.                                       |
| CSV         | 관리대상·의무·의무이행·내 업무 화면에서 현재 선택 또는 검색 결과를 내려받는다.                                   |
| 데이터 표현 | 적용범위와 자동배정은 시연 규칙 결과이며 최종 법률판단이나 실제 인사 권한을 의미하지 않는다.                     |

초기화는 확인창의 범위를 읽은 뒤 실행한다. 리허설 중 입력한 내 업무 값을 보존해야 한다면 초기화를 누르지 않는다.

## 8. 인수 확인 체크리스트

| 확인항목 | 완료 기준                                                      |
| -------- | -------------------------------------------------------------- |
| GitHub   | 저장소 접속과 ZIP 다운로드 또는 clone 성공                     |
| 사이트   | 최종 Netlify URL 접속 성공                                     |
| 데이터   | 일반 브라우저에서 Supabase 의무·시설·조직 데이터 조회          |
| 저장     | 의무이행 또는 내 업무 저장 후 새로고침 재조회                  |
| 첨부     | 허용 파일 업로드·로그 다운로드 성공                            |
| 배포     | `main` 변경 시 Netlify 자동배포 확인                           |
| 문서     | `README.md`, 본 문서, `docs/SUPABASE_RUNBOOK.md`, V1 HTML 확인 |

위 항목이 확인되면 소스·DB·배포·문서 인수는 완료된 것으로 본다.

## References

[1]: https://github.com/simulacre-8/Yongin "Yongin GitHub repository"
[2]: https://sapa-yongin.netlify.app "ADOMS Yongin sales demo"
[3]: https://github.com/simulacre-8/Yongin/archive/refs/heads/main.zip "Yongin main branch ZIP"
[4]: https://github.com/simulacre-8/Yongin/blob/main/README.md "Yongin project README"
[5]: https://github.com/simulacre-8/Yongin/blob/main/docs/SUPABASE_RUNBOOK.md "Yongin Supabase runbook"
