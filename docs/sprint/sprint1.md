# Sprint 1: 프로젝트 초기화 + 참가자 UI

## 스프린트 정보

- **기간**: 2026-03-09 ~ 2026-03-09 (1일, 집중 구현)
- **목표**: 프로젝트 기반 구조 구축 + 참가자용 UI (목업 데이터)
- **브랜치**: `sprint1`
- **Phase**: Phase 1 - 프론트엔드 UI 쉘
- **상태**: ✅ 완료 (2026-03-09)

## 프로젝트 구조 (확정)

```
src/
  app/
    layout.tsx
    page.tsx
    submit/[sessionId]/page.tsx
    check/[sessionId]/page.tsx
    admin/
      layout.tsx
      page.tsx
      dashboard/page.tsx
      session/[sessionId]/page.tsx
      session/[sessionId]/lucky-draw/page.tsx
    api/
  components/
    ui/              # shadcn/ui
    layouts/         # header, footer, admin-nav
    submit/
    check/
    admin/
  lib/
    mock-data.ts
    utils.ts
    validations.ts
  db/
    schema.ts
    index.ts
    seed.ts
    migrations/
  types/
    index.ts
```

## 작업 목록

### T1-1. 프로젝트 초기화 (복잡도: S)
- ✅ Next.js 15 App Router + TypeScript + src/ 디렉토리 구조
- ✅ Tailwind CSS + shadcn/ui 설정
- ✅ ESLint, Prettier 설정
- ✅ 환경 변수 템플릿 (.env.example) 생성
- ✅ 검증: `npm run build` 성공

### T1-2. DB 스키마 설계 및 마이그레이션 (복잡도: M)
- ✅ Drizzle ORM + better-sqlite3 설정
- ✅ EvaluationSession, Submission, Score 스키마 정의
- ✅ 마이그레이션 생성/적용 (`npx drizzle-kit push`)
- ✅ 시드 데이터 10건 (`npx tsx src/db/seed.ts` — 세션 1, 제출 10, 점수 4)
- ✅ 검증: `npx drizzle-kit push` 성공, 시드 데이터 삽입 확인

### T1-3. 공통 레이아웃 및 네비게이션 (복잡도: S)
- ✅ 루트 레이아웃 (헤더, 푸터)
- ✅ 참가자용 / 관리자용 레이아웃 분리
- ✅ 반응형 네비게이션
- ✅ 검증: 빌드 성공으로 구조 검증

### T1-4. 참가자 제출 폼 UI (복잡도: M)
- ✅ `/submit/[sessionId]` 페이지
- ✅ react-hook-form + zod 폼 검증
- ✅ 마감 카운트다운 타이머
- ✅ 제출 완료 확인 화면
- ✅ 목업 데이터로 동작

### T1-5. 참가자 제출 확인/결과 조회 UI (복잡도: S)
- ✅ `/check/[sessionId]` 페이지
- ✅ 이름 + 사번 입력 → 제출 내역 표시
- ✅ 마감 전: 수정 버튼 표시
- ✅ 결과 공개 후: 항목별 점수 + 평가 근거 표시 (목업)
- ✅ 검증: 조회/결과 화면 렌더링

## 완료 기준 (Definition of Done)

- ✅ 모든 페이지가 목업 데이터로 렌더링됨 (참가자 페이지)
- ✅ 반응형 레이아웃 구조 구현 (수동 확인 필요)
- ✅ 폼 유효성 검증 동작 (zod + react-hook-form)
- ✅ `npm run build` 에러 없이 성공
- ✅ DB 스키마 정의 + 시드 데이터 검증 완료

## 진행 현황

| 태스크 | 상태 | 완료일 |
|--------|------|--------|
| T1-1. 프로젝트 초기화 | ✅ 완료 | 2026-03-09 |
| T1-2. DB 스키마 | ✅ 완료 | 2026-03-09 |
| T1-3. 공통 레이아웃 | ✅ 완료 | 2026-03-09 |
| T1-4. 참가자 제출 폼 | ✅ 완료 | 2026-03-09 |
| T1-5. 참가자 확인/결과 | ✅ 완료 | 2026-03-09 |

## 자동 검증 결과

- ✅ `npm run build` — 빌드 성공 (에러 없음)
- ✅ `npx drizzle-kit push` — SQLite DB 생성 성공
- ✅ `npx tsx src/db/seed.ts` — 시드 데이터 삽입 성공

## 검증 결과

- [배포 체크리스트 및 수동 검증 항목](../deploy.md)
- [코드 리뷰 보고서](sprint1/code-review-report.md)

## 주요 구현 파일

| 파일 | 설명 |
|------|------|
| `src/app/page.tsx` | 랜딩 페이지 |
| `src/app/submit/[sessionId]/page.tsx` | 참가자 제출 폼 |
| `src/app/check/[sessionId]/page.tsx` | 참가자 조회/결과 |
| `src/components/layouts/` | 헤더, 푸터 공통 레이아웃 |
| `src/lib/mock-data.ts` | 목업 데이터 (Phase 2에서 API로 교체) |
| `src/lib/validations.ts` | zod 검증 스키마 |
| `src/db/schema.ts` | Drizzle ORM 스키마 |
| `src/db/seed.ts` | 시드 데이터 스크립트 |
| `src/types/index.ts` | 공통 타입 정의 |
