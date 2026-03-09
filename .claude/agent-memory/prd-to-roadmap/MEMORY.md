# PRD-to-Roadmap Agent Memory

## 프로젝트: AI-Native 해커톤 평가 시스템

### 핵심 기술 결정
- Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- SQLite + Drizzle ORM (별도 DB 서버 불필요)
- Claude API (claude-sonnet-4-5-20250929) + Anthropic SDK
- Octokit (GitHub REST API), Playwright (스크린샷), Recharts (차트)

### 로드맵 구조 (2026-03-09 기준)
- Phase 1 (Sprint 1-2): 프로젝트 초기화 + 프론트엔드 UI 쉘 (목업 데이터)
- Phase 2 (Sprint 3-4): 백엔드 API + 핵심 기능 연결 = MVP 완성
- Phase 3 (Sprint 5-6): AI 평가 엔진 + 결과 대시보드 실데이터 연결
- Phase 4 (Sprint 7-8): 배포 보너스(Vision) + 행운상 추첨 + 확장 기능

### 주요 설계 원칙
- 프론트엔드 먼저 개발 -> 사용자 피드백 -> 백엔드 연결 순서
- karpathy-guidelines 준수: 단순성 우선, 필요한 것만 구현
- 평가 기준: 4개 대항목(100점) + 배포 보너스(+10점) = 110점 만점
- 병렬 3개 노드 동시 평가, 최대 100개 저장소 지원

### PRD-ROADMAP 매핑
- FR-001~003: Phase 1(UI) + Phase 2(API) + Phase 4(커스터마이징)
- FR-004~005: Phase 1(UI) + Phase 2(API)
- FR-006~007: Phase 1(UI) + Phase 2(API)
- FR-008~010: Phase 3 (AI 평가 엔진)
- FR-011: Phase 3(기본) + Phase 4(배포 보너스)
- FR-012~015: Phase 1(목업UI) + Phase 3(실데이터) + Phase 4(PDF)
- FR-016: Phase 4 (행운상 추첨)
