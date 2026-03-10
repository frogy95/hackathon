# Sprint Planner 에이전트 메모리

## 프로젝트 개요
AI-Native 해커톤 평가 시스템 (Next.js 15 + TypeScript + Tailwind + Drizzle ORM + SQLite).
전체 8 스프린트, 4 Phase 구성.

## 스프린트 진행 현황
- Sprint 1 (Phase 1): 프로젝트 초기화 + 참가자 UI — 완료 (2026-03-09)
- Sprint 2 (Phase 1): 관리자 UI — 완료 (2026-03-10)
- Sprint 3 (Phase 2): API 구현 + 참가자 기능 연결 — 계획 수립 완료 (2026-03-10), 구현 예정

## 문서 저장 경로
- 스프린트 계획: `docs/sprint/sprint{N}.md`
- 첨부 파일: `docs/sprint/sprint{N}/`
- ROADMAP: `docs/ROADMAP.md`

## 핵심 패턴 (sprint1.md 형식 기준)
1. 스프린트 정보 헤더 (기간, 목표, 브랜치, Phase, 상태)
2. 프로젝트 구조 (신규/수정 파일 트리)
3. 태스크별 구현 범위 + 기술 접근 방법 + 완료 기준
4. 전체 Definition of Done
5. 진행 현황 테이블
6. 의존성 및 리스크
7. 기술 고려사항
8. 자동 검증 결과 (sprint-close가 채움)
9. 주요 구현 파일 테이블
10. Playwright MCP 검증 시나리오

## 주의사항
- shadcn/ui 컴포넌트는 인터랙티브 CLI 문제로 수동 생성
- 세션 스토리지는 SSR 환경 불가 → 클라이언트 컴포넌트에서만 사용
- Recharts는 'use client' 지시어 필수
- 목업 데이터는 `src/lib/mock-data.ts`에 집중 관리
- 하드코딩 관리자 비밀번호: `admin1234` → Sprint 3에서 bcrypt + JWT 방식으로 교체 (환경 변수: ADMIN_PASSWORD_HASH, JWT_SECRET)
- Sprint 3 신규 패키지: bcryptjs, jsonwebtoken, @octokit/rest, (옵션) use-debounce

## Phase별 목표
- Phase 1 (Sprint 1-2): 프론트엔드 UI 쉘 — 목업 데이터로 전체 화면 구현
- Phase 2 (Sprint 3-4): 백엔드 API + 핵심 기능 연결 — MVP 완성
- Phase 3 (Sprint 5-6): AI 평가 엔진 + 결과 대시보드 연결
- Phase 4 (Sprint 7-8): 배포 보너스 + 행운상 + 확장 기능
