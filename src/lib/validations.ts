import { z } from "zod";

// GitHub URL 패턴: https://github.com/{owner}/{repo}
const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/;

export const submissionSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다."),
  employeeId: z
    .string()
    .min(1, "사번을 입력해주세요.")
    .regex(/^[A-Za-z0-9-_]+$/, "사번은 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있습니다."),
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
  name: z.string().min(1, "이름을 입력해주세요."),
  employeeId: z.string().min(1, "사번을 입력해주세요."),
});

export type CheckFormData = z.infer<typeof checkFormSchema>;
