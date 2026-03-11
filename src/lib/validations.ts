import { z } from "zod";

// GitHub URL 패턴: https://github.com/{owner}/{repo}
const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/;

export const submissionSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 주소를 입력해주세요."),
  jobRole: z.enum(["PM/기획", "디자인", "개발", "QA"] as const),
  checkPassword: z
    .string()
    .regex(/^\d{4}$/, "조회 비밀번호는 숫자 4자리여야 합니다."),
  repoUrl: z
    .string()
    .min(1, "GitHub URL을 입력해주세요.")
    .regex(githubUrlPattern, "올바른 GitHub 저장소 URL을 입력해주세요. (예: https://github.com/user/repo)"),
  deployUrl: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || /^https?:\/\/.+/.test(val),
      "올바른 URL 형식을 입력해주세요. (예: https://my-app.vercel.app)"
    ),
});

export type SubmissionFormData = z.infer<typeof submissionSchema>;

// 조회 폼 검증
export const checkFormSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요."),
  checkPassword: z
    .string()
    .regex(/^\d{4}$/, "조회 비밀번호는 숫자 4자리여야 합니다."),
});

export type CheckFormData = z.infer<typeof checkFormSchema>;

// 세션 생성 스키마
export const createSessionSchema = z.object({
  name: z.string().min(1, "세션명을 입력해주세요."),
  submissionDeadline: z.string().min(1, "마감일시를 입력해주세요."),
  description: z.string().optional(),
});

export type CreateSessionData = z.infer<typeof createSessionSchema>;

// 세션 수정 스키마
export const updateSessionSchema = z.object({
  submissionDeadline: z.string().optional(),
  resultsPublished: z.boolean().optional(),
});

export type UpdateSessionData = z.infer<typeof updateSessionSchema>;

// 제출 수정 스키마
export const updateSubmissionSchema = z.object({
  excluded: z.boolean().optional(),
  adminNote: z.string().optional(),
});

export type UpdateSubmissionData = z.infer<typeof updateSubmissionSchema>;
