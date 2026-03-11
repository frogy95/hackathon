import type { JobRole } from "@/types";

// 서브 평가 항목 정의
export interface SubItemDef {
  key: string;
  name: string;
  maxScore: number;
  description: string;
}

// 평가 기준 정의
export interface CriterionDef {
  key: string;
  name: string;
  maxScore: number;
  description: string;
  subItems: SubItemDef[];
}

// 직군별 평가 기준 가중치 상수
export const ROLE_CRITERIA: Record<JobRole, CriterionDef[]> = {
  "PM/기획": [
    {
      key: "documentation",
      name: "AI-Native 문서화 체계",
      maxScore: 40,
      description: "PRD, README, AI 컨텍스트 파일, 개발 진행 기록의 완성도",
      subItems: [
        { key: "project_definition", name: "프로젝트 정의", maxScore: 16, description: "PRD/README에 문제 정의, 목표, 기능 명세가 명확히 기술되어 있는가" },
        { key: "ai_context", name: "AI 컨텍스트", maxScore: 12, description: "CLAUDE.md 또는 동등한 AI 컨텍스트 파일이 존재하고 충실히 작성되었는가" },
        { key: "progress_log", name: "개발 진행 기록", maxScore: 12, description: "개발 과정이 커밋 이력 또는 문서로 추적 가능한가" },
      ],
    },
    {
      key: "implementation",
      name: "기술 구현력",
      maxScore: 10,
      description: "코드 구조, 품질, 기술 스택 적합성",
      subItems: [
        { key: "code_quality", name: "코드 품질", maxScore: 5, description: "코드 가독성, 일관성이 적절한가" },
        { key: "tech_stack", name: "기술 스택", maxScore: 5, description: "기술 스택 선택이 문제에 적합한가" },
      ],
    },
    {
      key: "ux",
      name: "완성도 및 UX",
      maxScore: 20,
      description: "핵심 기능 동작 여부, 사용자 경험",
      subItems: [
        { key: "completeness", name: "완성도", maxScore: 12, description: "핵심 기능이 동작하는 완성된 형태인가" },
        { key: "user_experience", name: "사용자 경험", maxScore: 8, description: "사용자 흐름이 자연스럽고 UI가 직관적인가" },
      ],
    },
    {
      key: "idea",
      name: "아이디어 및 활용 가치",
      maxScore: 20,
      description: "문제의 실재성, 차별성, 사업 가치",
      subItems: [
        { key: "problem_definition", name: "문제 정의", maxScore: 10, description: "해결하려는 문제가 실제적이고 가치 있는가" },
        { key: "differentiation", name: "차별화", maxScore: 10, description: "기존 솔루션과의 차별점이 명확한가" },
      ],
    },
    {
      key: "verification_plan",
      name: "검증 계획",
      maxScore: 10,
      description: "사용자 검증, 가설 검증, 지표 설계",
      subItems: [
        { key: "hypothesis", name: "가설 설정", maxScore: 5, description: "검증 가설이 명확하게 설정되어 있는가" },
        { key: "metrics", name: "성공 지표", maxScore: 5, description: "성공 지표와 측정 방법이 정의되어 있는가" },
      ],
    },
  ],
  "개발": [
    {
      key: "documentation",
      name: "AI-Native 문서화 체계",
      maxScore: 30,
      description: "PRD, README, AI 컨텍스트 파일, 개발 진행 기록의 완성도",
      subItems: [
        { key: "project_definition", name: "프로젝트 정의", maxScore: 12, description: "PRD/README에 문제 정의, 목표, 기능 명세가 명확히 기술되어 있는가" },
        { key: "ai_context", name: "AI 컨텍스트", maxScore: 9, description: "CLAUDE.md 또는 동등한 AI 컨텍스트 파일이 존재하고 충실히 작성되었는가" },
        { key: "progress_log", name: "개발 진행 기록", maxScore: 9, description: "개발 과정이 커밋 이력 또는 문서로 추적 가능한가" },
      ],
    },
    {
      key: "implementation",
      name: "기술 구현력",
      maxScore: 30,
      description: "아키텍처, 코드 품질, 기술 스택 적합성",
      subItems: [
        { key: "architecture", name: "아키텍처", maxScore: 12, description: "코드 구조가 명확하고, 관심사 분리가 잘 되어 있는가" },
        { key: "code_quality", name: "코드 품질", maxScore: 10, description: "코드 가독성, 일관성, 에러 처리가 적절한가" },
        { key: "tech_stack", name: "기술 스택", maxScore: 8, description: "기술 스택 선택이 문제에 적합하고, 의존성이 합리적인가" },
      ],
    },
    {
      key: "ux",
      name: "완성도 및 UX",
      maxScore: 15,
      description: "핵심 기능 동작 여부, 사용자 경험, 반응형",
      subItems: [
        { key: "completeness", name: "완성도", maxScore: 8, description: "핵심 기능이 동작하는 완성된 형태인가" },
        { key: "user_experience", name: "사용자 경험", maxScore: 5, description: "사용자 흐름이 자연스럽고 UI가 직관적인가" },
        { key: "responsive", name: "반응형/호환성", maxScore: 2, description: "반응형 디자인 또는 다양한 환경에서 동작하는가" },
      ],
    },
    {
      key: "idea",
      name: "아이디어 및 활용 가치",
      maxScore: 10,
      description: "문제의 실재성, 차별성",
      subItems: [
        { key: "problem_definition", name: "문제 정의", maxScore: 4, description: "해결하려는 문제가 실제적이고 가치 있는가" },
        { key: "differentiation", name: "차별화", maxScore: 6, description: "기존 솔루션과의 차별점이 명확한가" },
      ],
    },
    {
      key: "verification_plan",
      name: "검증 계획",
      maxScore: 15,
      description: "테스트 전략, 코드 품질 검증, CI/CD",
      subItems: [
        { key: "test_coverage", name: "테스트 전략", maxScore: 8, description: "단위/통합 테스트가 존재하고 커버리지가 적절한가" },
        { key: "ci_cd", name: "CI/CD 및 자동화", maxScore: 7, description: "자동화된 빌드/배포/검증 파이프라인이 구축되어 있는가" },
      ],
    },
  ],
  "디자인": [
    {
      key: "documentation",
      name: "AI-Native 문서화 체계",
      maxScore: 20,
      description: "PRD, README, AI 컨텍스트 파일, 개발 진행 기록의 완성도",
      subItems: [
        { key: "project_definition", name: "프로젝트 정의", maxScore: 8, description: "PRD/README에 문제 정의, 목표, 기능 명세가 명확히 기술되어 있는가" },
        { key: "ai_context", name: "AI 컨텍스트", maxScore: 6, description: "CLAUDE.md 또는 동등한 AI 컨텍스트 파일이 존재하고 충실히 작성되었는가" },
        { key: "progress_log", name: "개발 진행 기록", maxScore: 6, description: "개발 과정이 커밋 이력 또는 문서로 추적 가능한가" },
      ],
    },
    {
      key: "implementation",
      name: "기술 구현력",
      maxScore: 10,
      description: "코드 구조, 품질, 기술 스택 적합성",
      subItems: [
        { key: "code_quality", name: "코드 품질", maxScore: 5, description: "코드 가독성, 일관성이 적절한가" },
        { key: "tech_stack", name: "기술 스택", maxScore: 5, description: "기술 스택 선택이 문제에 적합한가" },
      ],
    },
    {
      key: "ux",
      name: "완성도 및 UX",
      maxScore: 20,
      description: "핵심 기능 동작 여부, 사용자 경험, 반응형",
      subItems: [
        { key: "completeness", name: "완성도", maxScore: 10, description: "핵심 기능이 동작하는 완성된 형태인가" },
        { key: "user_experience", name: "사용자 경험", maxScore: 7, description: "사용자 흐름이 자연스럽고 UI가 직관적인가" },
        { key: "responsive", name: "반응형/호환성", maxScore: 3, description: "반응형 디자인 또는 다양한 환경에서 동작하는가" },
      ],
    },
    {
      key: "idea",
      name: "아이디어 및 활용 가치",
      maxScore: 10,
      description: "문제의 실재성, 차별성",
      subItems: [
        { key: "problem_definition", name: "문제 정의", maxScore: 5, description: "해결하려는 문제가 실제적이고 가치 있는가" },
        { key: "differentiation", name: "차별화", maxScore: 5, description: "기존 솔루션과의 차별점이 명확한가" },
      ],
    },
    {
      key: "design_system",
      name: "디자인 시스템",
      maxScore: 30,
      description: "컴포넌트 일관성, 색상/타이포그래피 체계, 디자인 토큰",
      subItems: [
        { key: "consistency", name: "시각적 일관성", maxScore: 12, description: "UI 컴포넌트, 색상, 타이포그래피가 일관성 있게 적용되었는가" },
        { key: "design_tokens", name: "디자인 토큰", maxScore: 10, description: "색상, 간격, 타이포그래피 등이 시스템화되어 있는가" },
        { key: "accessibility", name: "접근성", maxScore: 8, description: "색상 대비, 포커스 상태, 스크린 리더 지원이 고려되었는가" },
      ],
    },
    {
      key: "verification_plan",
      name: "검증 계획",
      maxScore: 10,
      description: "사용성 테스트, 디자인 검증 방법",
      subItems: [
        { key: "usability_test", name: "사용성 테스트", maxScore: 6, description: "사용자 테스트 계획이 존재하거나 수행되었는가" },
        { key: "design_review", name: "디자인 검토", maxScore: 4, description: "디자인 검토 프로세스가 문서화되어 있는가" },
      ],
    },
  ],
  "QA": [
    {
      key: "documentation",
      name: "AI-Native 문서화 체계",
      maxScore: 30,
      description: "PRD, README, AI 컨텍스트 파일, 개발 진행 기록의 완성도",
      subItems: [
        { key: "project_definition", name: "프로젝트 정의", maxScore: 12, description: "PRD/README에 문제 정의, 목표, 기능 명세가 명확히 기술되어 있는가" },
        { key: "ai_context", name: "AI 컨텍스트", maxScore: 9, description: "CLAUDE.md 또는 동등한 AI 컨텍스트 파일이 존재하고 충실히 작성되었는가" },
        { key: "progress_log", name: "개발 진행 기록", maxScore: 9, description: "개발 과정이 커밋 이력 또는 문서로 추적 가능한가" },
      ],
    },
    {
      key: "implementation",
      name: "기술 구현력",
      maxScore: 10,
      description: "코드 구조, 품질, 기술 스택 적합성",
      subItems: [
        { key: "code_quality", name: "코드 품질", maxScore: 5, description: "코드 가독성, 일관성이 적절한가" },
        { key: "tech_stack", name: "기술 스택", maxScore: 5, description: "기술 스택 선택이 문제에 적합한가" },
      ],
    },
    {
      key: "ux",
      name: "완성도 및 UX",
      maxScore: 20,
      description: "핵심 기능 동작 여부, 사용자 경험",
      subItems: [
        { key: "completeness", name: "완성도", maxScore: 12, description: "핵심 기능이 동작하는 완성된 형태인가" },
        { key: "user_experience", name: "사용자 경험", maxScore: 8, description: "사용자 흐름이 자연스럽고 UI가 직관적인가" },
      ],
    },
    {
      key: "idea",
      name: "아이디어 및 활용 가치",
      maxScore: 10,
      description: "문제의 실재성, 차별성",
      subItems: [
        { key: "problem_definition", name: "문제 정의", maxScore: 5, description: "해결하려는 문제가 실제적이고 가치 있는가" },
        { key: "differentiation", name: "차별화", maxScore: 5, description: "기존 솔루션과의 차별점이 명확한가" },
      ],
    },
    {
      key: "verification_plan",
      name: "검증 계획",
      maxScore: 30,
      description: "테스트 전략, 품질 보증 체계, 자동화 수준",
      subItems: [
        { key: "test_strategy", name: "테스트 전략", maxScore: 12, description: "단위/통합/E2E 등 체계적인 테스트 전략이 수립되어 있는가" },
        { key: "test_coverage", name: "테스트 커버리지", maxScore: 10, description: "테스트 케이스가 핵심 기능을 충분히 커버하는가" },
        { key: "automation", name: "자동화", maxScore: 8, description: "테스트 자동화가 구현되어 있거나 계획되어 있는가" },
      ],
    },
  ],
};
