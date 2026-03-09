# Sprint 2 배포 체크리스트

## 자동 검증 완료 (2026-03-10)

- ✅ `npm run build` — 빌드 성공 (에러 없음)
- ✅ `/admin` HTTP 200 응답 확인
- ✅ `/admin/dashboard` HTTP 200 응답 확인
- ✅ `/admin/session/session-2026-spring` HTTP 200 응답 확인
- ✅ `/admin/session/session-2026-spring/results` HTTP 200 응답 확인
- ✅ `/admin/session/session-2026-spring/results/sub-001` HTTP 200 응답 확인

## 수동 검증 필요 항목

`npm run dev` 실행 후 브라우저에서 직접 확인하세요.

### 관리자 로그인 (/admin)

- ⬜ 비밀번호 폼 표시 확인
- ⬜ 빈 폼 제출 시 유효성 오류 메시지 확인
- ⬜ 잘못된 비밀번호 입력 → "비밀번호가 올바르지 않습니다" 오류 확인
- ⬜ `admin1234` 입력 후 로그인 → `/admin/dashboard` 이동 확인
- ⬜ 미인증 상태에서 `/admin/dashboard` 직접 접속 → 로그인 페이지 리디렉션 확인

### 관리자 대시보드 (/admin/dashboard)

- ⬜ 세션 카드 목록 렌더링 확인
- ⬜ "세션 생성" 버튼 클릭 → 모달 열림 확인
- ⬜ 모달 빈 폼 저장 → 오류 메시지 확인
- ⬜ 세션 카드 클릭 → 세션 상세 페이지 이동 확인
- ⬜ 로그아웃 버튼 → 로그인 페이지 이동 확인

### 세션 상세 (/admin/session/session-2026-spring)

- ⬜ 제출 목록 테이블 10건 렌더링 확인
- ⬜ 상태 탭 필터링 동작 확인
- ⬜ 이름/이메일 검색 동작 확인
- ⬜ 제출 시각 정렬 헤더 클릭 → 오름/내림차순 토글 확인
- ⬜ 제외 토글 → 행 배경 회색 변경 확인
- ⬜ "평가 실행", "결과 공개" 버튼 `disabled` 상태 확인

### 결과 대시보드 (/admin/session/session-2026-spring/results)

- ⬜ 순위표 10건 렌더링 확인
- ⬜ 항목별 정렬 헤더 동작 확인
- ⬜ 배포 보너스 토글 → 총점/순위 변동 확인
- ⬜ 이름 클릭 → 상세 리포트 이동 확인

### 상세 리포트 (/admin/session/session-2026-spring/results/sub-001)

- ⬜ Recharts 레이더 차트 렌더링 확인
- ⬜ 항목별 점수 + 평가 근거 텍스트 표시 확인

### 반응형 레이아웃

- ⬜ 모바일(390px) 뷰포트에서 레이아웃 확인 (브라우저 DevTools → 모바일 뷰)
- ⬜ 각 페이지 브라우저 콘솔 에러 없음 확인 (F12 → Console)

---

# Sprint 1 배포 체크리스트

## 자동 검증 완료

- ✅ `npm run build` — 빌드 성공 (에러 없음)
- ✅ `npx drizzle-kit push` — SQLite DB 생성 성공
- ✅ `npx tsx src/db/seed.ts` — 시드 데이터 삽입 성공 (세션 1, 제출 10, 점수 4)

## 수동 검증 완료 (2026-03-09)

### 개발 서버 시작
```bash
npm run dev
```

### 확인 항목

1. ✅ `localhost:3000` → 랜딩 페이지 렌더링 확인
   - 히어로 섹션, 기능 소개 카드 3개, 현재 세션 카드 표시
   - "제출하기", "내 결과 확인" 버튼 동작 확인

2. ✅ `localhost:3000/submit/session-2026-spring` → 제출 폼 확인
   - 세션명, 설명, 마감일시 표시
   - 마감 카운트다운 타이머 작동 (실시간)
   - 빈 폼 제출 시 유효성 에러 메시지 표시
   - 올바른 데이터 입력 후 제출 → 완료 화면 전환
   - 완료 화면에서 "제출 확인 페이지로 이동" 버튼 동작

3. ✅ `localhost:3000/check/session-2026-spring` → 조회 폼 확인
   - 이름: `김철수`, 이메일: `kimcs@example.com` 입력 → 제출 내역 + 점수 표시
   - 이름: `이영희`, 이메일: `leeyh@example.com` 입력 → 제출 내역 (점수 미공개 메시지)
   - 잘못된 정보 입력 → "제출 내역을 찾을 수 없습니다" 메시지

4. ✅ 모바일(390px) 레이아웃 확인
   - 헤더 네비게이션, 폼 레이아웃 정상 표시

### 마감 시나리오 테스트 (선택)
`src/lib/mock-data.ts`의 `submissionDeadline`을 과거 날짜로 변경하면
제출 폼에서 "제출 마감이 지났습니다" 메시지를 확인할 수 있습니다.
