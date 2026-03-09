# sprint-close 에이전트 메모리

## 프로젝트 기본 정보

- 저장소: `C:\Users\frogy95\Documents\sources\hackathon`
- 메인 브랜치: `main` (master가 아님 — PR 생성 시 `--base main` 사용)
- 언어: 한국어 커밋 메시지, 한국어 문서

## 스프린트 문서 구조

- 스프린트 계획/완료 문서: `docs/sprint/sprint{N}.md`
- 스프린트 첨부 파일: `docs/sprint/sprint{N}/`
- 코드 리뷰 보고서: `docs/sprint/sprint{N}/code-review-report.md`
- 배포 체크리스트: `docs/deploy.md`
- ROADMAP: `docs/ROADMAP.md`

## 주의 사항

- `next-env.d.ts`는 빌드 환경에 따라 자동 변경됨 — 커밋에 포함해도 무방
- Windows 환경에서 LF/CRLF 경고가 많이 나오나 무시해도 됨
- `code-reviewer` 서브에이전트는 `superpowers:code-reviewer`가 아니라 직접 코드를 읽고 리뷰 수행
- Playwright MCP 도구(`browser_navigate` 등)는 이 환경에서 로드되지 않음 — 대신 curl로 HTTP 상태/콘텐츠 검증 후 수동 검증 항목으로 분류
- git status의 Main branch 표시가 `master`로 나와도 실제 원격 메인 브랜치는 `main`임 — 항상 `git branch -a`로 확인 후 PR 생성
