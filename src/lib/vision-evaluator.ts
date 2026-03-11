// Claude Vision API 기반 배포 보너스 평가
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import type { ScreenshotResult, VisionEvaluationResult } from "@/types/evaluation";

const VISION_SYSTEM_PROMPT = `당신은 해커톤 배포 결과물의 시각적 품질을 평가하는 전문가입니다.
제공된 스크린샷을 분석하여 아래 루브릭에 따라 채점합니다.

## 평가 기준

### layout (0~2점)
- 2점: 깔끔한 레이아웃, 적절한 여백, 일관된 그리드
- 1점: 기본적인 레이아웃 존재하나 개선 필요
- 0점: 레이아웃이 혼란스럽거나 요소가 겹침

### colorTypography (0~2점)
- 2점: 일관된 색상 팔레트, 가독성 좋은 폰트 계층
- 1점: 기본적인 색상/폰트 적용
- 0점: 색상 충돌, 폰트 혼재, 가독성 낮음

### visualHierarchy (0~2점)
- 2점: 명확한 시각적 계층 (헤더→본문→CTA), 사용자 시선 유도
- 1점: 부분적 계층 존재
- 0점: 계층 구조 없음, 요소 중요도 구분 불가

### mobileResponsive (0~1점)
- 1점: 모바일 화면에서도 콘텐츠가 잘 정렬되어 있음
- 0점: 모바일에서 레이아웃 깨짐 또는 스크린샷 미제공

## 출력 형식

반드시 아래 JSON만 출력하라. 마크다운 코드블록 없이 순수 JSON:

{
  "layout": <0-2>,
  "colorTypography": <0-2>,
  "visualHierarchy": <0-2>,
  "mobileResponsive": <0-1>,
  "reasoning": "<구체적인 평가 근거 2-3문장>"
}`;

async function loadImageAsBase64(imagePath: string): Promise<string | null> {
  try {
    const absPath = path.join(process.cwd(), "public", imagePath.replace(/^\//, ""));
    const buffer = await fs.readFile(absPath);
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

export async function evaluateVisual(
  screenshots: ScreenshotResult,
  model?: string
): Promise<VisionEvaluationResult> {
  // 배포 URL 접근 불가 → 즉시 0점
  if (!screenshots.accessible) {
    return {
      deploymentCredit: 0,
      visualScore: 0,
      totalBonus: 0,
      reasoning: `배포 URL에 접근할 수 없어 보너스 점수를 부여하지 않습니다. 오류: ${screenshots.errorReason ?? "알 수 없음"}`,
      details: { layout: 0, colorTypography: 0, visualHierarchy: 0, mobileResponsive: 0 },
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      deploymentCredit: 3,
      visualScore: 0,
      totalBonus: 3,
      reasoning: "ANTHROPIC_API_KEY가 없어 시각 평가를 건너뜁니다. 배포 성공 크레딧 3점만 부여.",
      details: { layout: 0, colorTypography: 0, visualHierarchy: 0, mobileResponsive: 0 },
    };
  }

  // 스크린샷 base64 로드
  const desktopBase64 = screenshots.desktop ? await loadImageAsBase64(screenshots.desktop) : null;
  const mobileBase64 = screenshots.mobile ? await loadImageAsBase64(screenshots.mobile) : null;

  if (!desktopBase64 && !mobileBase64) {
    return {
      deploymentCredit: 3,
      visualScore: 0,
      totalBonus: 3,
      reasoning: "스크린샷 이미지를 읽을 수 없어 시각 평가를 건너뜁니다. 배포 성공 크레딧 3점만 부여.",
      details: { layout: 0, colorTypography: 0, visualHierarchy: 0, mobileResponsive: 0 },
    };
  }

  const anthropic = new Anthropic({ apiKey });
  const modelId = model === "sonnet" ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";

  // 이미지 콘텐츠 구성
  type ImageBlock = {
    type: "image";
    source: { type: "base64"; media_type: "image/png"; data: string };
  };
  type TextBlock = { type: "text"; text: string };
  const imageBlocks: (ImageBlock | TextBlock)[] = [];

  if (desktopBase64) {
    imageBlocks.push({ type: "text", text: "## 데스크톱 스크린샷 (1280x800)" });
    imageBlocks.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: desktopBase64 },
    });
  }
  if (mobileBase64) {
    imageBlocks.push({ type: "text", text: "## 모바일 스크린샷 (390x844)" });
    imageBlocks.push({
      type: "image",
      source: { type: "base64", media_type: "image/png", data: mobileBase64 },
    });
  }
  imageBlocks.push({ type: "text", text: "위 스크린샷을 평가해주세요." });

  try {
    const message = await anthropic.messages.create({
      model: modelId,
      max_tokens: 1024,
      temperature: 0,
      system: VISION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: imageBlocks }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // JSON 파싱
    let parsed: {
      layout: number;
      colorTypography: number;
      visualHierarchy: number;
      mobileResponsive: number;
      reasoning: string;
    };

    try {
      const jsonStr = responseText.match(/\{[\s\S]*\}/)?.[0] ?? responseText;
      parsed = JSON.parse(jsonStr);
    } catch {
      // 파싱 실패 시 기본값
      return {
        deploymentCredit: 3,
        visualScore: 0,
        totalBonus: 3,
        reasoning: "Vision 응답 파싱 실패. 배포 성공 크레딧 3점만 부여.",
        details: { layout: 0, colorTypography: 0, visualHierarchy: 0, mobileResponsive: 0 },
      };
    }

    const layout = Math.min(2, Math.max(0, parsed.layout ?? 0));
    const colorTypography = Math.min(2, Math.max(0, parsed.colorTypography ?? 0));
    const visualHierarchy = Math.min(2, Math.max(0, parsed.visualHierarchy ?? 0));
    const mobileResponsive = Math.min(1, Math.max(0, parsed.mobileResponsive ?? 0));
    const visualScore = layout + colorTypography + visualHierarchy + mobileResponsive;

    return {
      deploymentCredit: 3,
      visualScore,
      totalBonus: 3 + visualScore,
      reasoning: parsed.reasoning ?? "",
      details: { layout, colorTypography, visualHierarchy, mobileResponsive },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Vision 평가] API 오류: ${msg}`);
    return {
      deploymentCredit: 3,
      visualScore: 0,
      totalBonus: 3,
      reasoning: `Vision API 오류로 시각 평가를 건너뜁니다. 배포 성공 크레딧 3점만 부여. 오류: ${msg}`,
      details: { layout: 0, colorTypography: 0, visualHierarchy: 0, mobileResponsive: 0 },
    };
  }
}
