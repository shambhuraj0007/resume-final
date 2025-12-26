import { NextResponse, type NextRequest } from "next/server";
import puppeteer, { type Browser } from "puppeteer";
import puppeteerCore, { type Browser as BrowserCore } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

let browserPromise: Promise<Browser | BrowserCore> | null = null;

async function launchBrowser() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    // Configure Sparticuz Chromium for headless, non-GPU mode on Linux (e.g. AWS EC2/Lambda)
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    const executablePath = await chromium.executablePath();

    console.log("[DEBUG] Launching PuppeteerCore in production");
    console.log("[DEBUG] Executable path:", executablePath);

    return puppeteerCore.launch({
      executablePath,
      args: [...chromium.args, "--disable-gpu", "--disable-dev-shm-usage"],
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });
  }

  console.log("[DEBUG] Launching Puppeteer in dev mode");
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
  }

  try {
    const browser = await browserPromise;

    // If the browser was closed for some reason, relaunch
    if ("isConnected" in browser && !browser.isConnected()) {
      console.warn("[WARN] Puppeteer browser not connected, relaunching");
      browserPromise = launchBrowser();
      return browserPromise;
    }

    return browser;
  } catch (error) {
    console.error("[ERROR] Failed to get Puppeteer browser, resetting", error);
    browserPromise = null;
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (!searchParams.toString()) {
    return NextResponse.json(
      { message: "No query parameters provided" },
      { status: 400 }
    );
  }

  let page: any = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Be a bit more generous in production where cold starts and font loading can be slower
    page.setDefaultNavigationTimeout(45000);
    page.setDefaultTimeout(45000);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:8888");

    const url = new URL(`${baseUrl}/resume/download`);
    // Pass everything through to the download page
    url.search = searchParams.toString();

    console.log("[DEBUG] Navigating to:", url.toString());

    // Wait for network to be mostly idle so client-side bundle + fonts have time to load
    await page.goto(url.toString(), { waitUntil: "networkidle0" });

    // Wait for resume content to be fully rendered
    await page.waitForSelector("#resume-content", {
      visible: true,
      timeout: 30000,
    });

    // Wait for fonts to load (if available) without blocking unnecessarily
    await page.evaluate(() => (document as any).fonts?.ready?.catch(() => null));

    // Set viewport to match A4 dimensions exactly
    await page.setViewport({
      width: 794, // 21cm in pixels at 96 DPI
      height: 1123, // 29.7cm in pixels at 96 DPI
      deviceScaleFactor: 1,
    });

    // Small settling delay to reduce flakiness before printing to PDF
    await page.waitForTimeout(500);

    // Generate PDF with optimized settings to prevent empty pages
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true, // Let CSS control page sizing
      displayHeaderFooter: false,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
      // Ensure consistent page breaking
      pageRanges: "",
    });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": pdf.length.toString(),
        "Content-Disposition": `inline; filename="resume.pdf"`, // inline for preview support
      },
    });
  } catch (error: any) {
    console.error("[ERROR] PDF generation error:", error);
    return NextResponse.json(
      {
        message: "Error generating PDF",
        error:
          error && typeof error === "object"
            ? `${(error as Error).name || "Error"}: ${(error as Error).message || String(error)}`
            : String(error),
      },
      { status: 500 }
    );
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (cleanupError) {
        console.error("Error closing Puppeteer page:", cleanupError);
      }
    }
  }
}
