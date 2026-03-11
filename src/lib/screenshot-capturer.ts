// Playwright 기반 배포 URL 스크린샷 캡처
import path from "path";
import fs from "fs/promises";
import type { ScreenshotResult } from "@/types/evaluation";

// 스크린샷 저장 디렉토리
const SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");

// Playwright 동적 임포트 (서버 전용)
async function getChromium() {
  const { chromium } = await import("playwright");
  return chromium;
}

export async function captureScreenshots(
  submissionId: string,
  deployUrl: string
): Promise<ScreenshotResult> {
  const capturedAt = new Date().toISOString();

  // 환경 변수로 비활성화 가능 (프로덕션 환경에서 Playwright 미설치 시)
  if (process.env.DISABLE_SCREENSHOTS?.toLowerCase() === "true") {
    return {
      desktop: null,
      mobile: null,
      accessible: false,
      errorReason: "스크린샷 캡처가 비활성화되어 있습니다.",
      capturedAt,
    };
  }

  // 저장 디렉토리 생성
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

  const desktopPath = `/screenshots/${submissionId}-desktop.png`;
  const mobilePath = `/screenshots/${submissionId}-mobile.png`;
  const desktopAbsPath = path.join(SCREENSHOT_DIR, `${submissionId}-desktop.png`);
  const mobileAbsPath = path.join(SCREENSHOT_DIR, `${submissionId}-mobile.png`);

  let chromium;
  try {
    chromium = await getChromium();
  } catch {
    return {
      desktop: null,
      mobile: null,
      accessible: false,
      errorReason: "Playwright chromium를 로드할 수 없습니다. npx playwright install chromium 실행 필요.",
      capturedAt,
    };
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // 데스크톱 스크린샷 (1280x800)
    let desktopCaptured: string | null = null;
    let mobileCaptured: string | null = null;

    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();

    await desktopPage.goto(deployUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await desktopPage.waitForTimeout(3000);
    await desktopPage.screenshot({ path: desktopAbsPath, fullPage: true });
    desktopCaptured = desktopPath;
    await desktopContext.close();

    // 모바일 스크린샷 (390x844)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(deployUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await mobilePage.waitForTimeout(3000);
    await mobilePage.screenshot({ path: mobileAbsPath, fullPage: true });
    mobileCaptured = mobilePath;
    await mobileContext.close();

    return {
      desktop: desktopCaptured,
      mobile: mobileCaptured,
      accessible: true,
      capturedAt,
    };
  } catch (error: unknown) {
    const errorReason = error instanceof Error ? error.message : String(error);
    console.error(`[스크린샷] 캡처 실패 (${submissionId}): ${errorReason}`);
    return {
      desktop: null,
      mobile: null,
      accessible: false,
      errorReason,
      capturedAt,
    };
  } finally {
    await browser.close();
  }
}
