# AI-Native 해커톤 평가 시스템

해커톤 참가자가 산출물을 제출하고, 관리자가 AI 자동 평가를 실행하여 일관된 평가 결과를 제공하는 웹 애플리케이션.

## 주요 기능

- **참가자 제출**: GitHub 저장소 URL + 배포 URL 제출, GitHub public repo 실시간 검증
- **이메일 인증**: `@ubcare.co.kr` 도메인 제한, 조회 비밀번호(4자리) 기반 결과 조회
- **AI 자동 평가**: Claude API(haiku/sonnet 선택)로 직군별 루브릭 적용, 코드·문서 기반 채점
- **결과 대시보드**: 직군별 점수 비교, 레이더 차트, 평가 근거 마크다운 표시
- **행운상 추첨**: 슬롯머신 애니메이션, 전체화면 지원, 추첨 이력 관리
- **이메일 알림**: 평가 완료 시 Gmail SMTP로 결과 안내 메일 발송
- **수정·재평가**: 최대 3회 제출 수정 + 재평가 요청 가능

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.1.6 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| DB | Drizzle ORM + Turso (libsql) |
| AI | Anthropic Claude API (haiku / sonnet) |
| 이메일 | nodemailer + Gmail SMTP |
| 배포 | Vercel |

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```bash
# DB (Turso)
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-auth-token

# 관리자 인증
ADMIN_PASSWORD_HASH=<bcrypt 해시>
JWT_SECRET=<32자 이상 랜덤 문자열>

# AI 평가
ANTHROPIC_API_KEY=sk-ant-...

# GitHub 데이터 수집
GITHUB_TOKEN=ghp_...

# 이메일 (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=해커톤 평가 시스템 <your-gmail@gmail.com>

# 앱 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`ADMIN_PASSWORD_HASH` 생성:

```bash
node -e "const b=require('bcryptjs');console.log(b.hashSync('your-password',10))"
```

### 3. DB 초기화

```bash
npx drizzle-kit push        # 스키마 적용
npx tsx src/db/seed.ts      # 시드 데이터 삽입
```

### 4. 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 접속.

- 참가자 제출: `/submit/session-2026-spring`
- 참가자 결과 조회: `/check/session-2026-spring`
- 관리자: `/admin` (비밀번호 입력)

## 프로젝트 구조

```
src/
  app/                    # Next.js App Router
    page.tsx              # 랜딩 페이지
    submit/[sessionId]/   # 참가자 제출 폼
    check/[sessionId]/    # 참가자 결과 조회
    admin/                # 관리자 영역 (인증 가드)
      dashboard/          # 세션 목록
      session/[id]/       # 세션 상세 + 행운상 추첨
        results/          # 결과 대시보드 + 개별 리포트
    api/                  # API Routes
  components/             # UI 컴포넌트
  lib/                    # 비즈니스 로직 (AI 평가, GitHub 수집, 이메일)
  db/                     # Drizzle 스키마 + 시드
  types/                  # 공통 타입
docs/
  PRD.md                  # 제품 요구사항 문서
  ROADMAP.md              # 프로젝트 로드맵
  sprint/                 # 스프린트 계획 및 검증 보고서
  deploy.md               # 배포 체크리스트
```

## 배포 (Vercel + Turso)

```bash
# Turso DB 생성
turso db create hackathon-eval
turso db show hackathon-eval --url
turso db tokens create hackathon-eval

# 스키마 + 시드 적용
npx drizzle-kit push
npx tsx src/db/seed.ts
```

Vercel 대시보드에서 환경변수를 설정하고 GitHub 저장소를 import하여 배포합니다. 자세한 내용은 `docs/deploy.md` 참조.

## 에이전트 & 스킬 워크플로우

이 프로젝트는 Claude Code 에이전트와 스킬을 활용한 스프린트 기반 개발로 구축되었습니다.

```
docs/PRD.md
    │
    ▼ prd-to-roadmap 에이전트
docs/ROADMAP.md
    │
    ▼ sprint-planner 에이전트
docs/sprint/sprint{N}.md
    │
    ▼ 구현 (writing-plans 스킬 → 코드 작성)
    │
    ▼ sprint-close 에이전트
    ├─ ROADMAP.md 상태 업데이트
    ├─ sprint{N} → main PR 생성
    ├─ code-reviewer subagent 코드 리뷰
    └─ docs/sprint/sprint{N}/playwright-report.md 저장
```

`.claude/` 디렉토리를 다른 프로젝트에 복사하면 동일한 워크플로우를 재사용할 수 있습니다.

## 데모 계정

| 구분 | 값 |
|------|-----|
| 관리자 비밀번호 (시드 기본값) | `admin1234` |
| 시드 세션 ID | `session-2026-spring` |
| 평가 완료 참가자 | 이메일: `kimcs@example.com` / 조회비밀번호: `1234` |
| 일반 참가자 | 이메일: `leeyh@example.com` / 조회비밀번호: `2222` |
