import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 기존 JSON 형식 reasoning을 마크다운으로 변환 (하위 호환)
export function normalizeReasoning(text: string): string {
  // 이미 마크다운이면 그대로 반환
  if (text.includes("###")) return text;

  // JSON 파싱 시도 (구 형식 호환)
  try {
    const parsed = JSON.parse(text) as {
      summary?: string;
      sub_items?: Array<{ name: string; score: number; max_score: number; reasoning: string }>;
    };
    if (parsed.sub_items && Array.isArray(parsed.sub_items)) {
      return parsed.sub_items
        .map((s) => `### ${s.name} (${s.score}/${s.max_score})\n${s.reasoning}`)
        .join("\n\n");
    }
    if (parsed.summary) return parsed.summary;
  } catch {
    // JSON이 아님 — 텍스트 그대로 반환
  }

  return text;
}
