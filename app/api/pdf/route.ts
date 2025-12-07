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
    const executablePath = await chromium.executablePath();

    console.log("[DEBUG] Launching PuppeteerCore in production");
    console.log("[DEBUG] Executable path:", executablePath);

    return puppeteerCore.launch({
      executablePath,
      args: chromium.args,
      headless: true,
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
      browserPromise = launchBrowser();
      return browserPromise;
    }

    return browser;
  } catch (error) {
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

  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:8888");

    const url = new URL(`${baseUrl}/resume/download`);
    url.search = searchParams.toString();

    console.log("[DEBUG] Navigating to:", url.toString());

    await page.goto(url.toString(), { waitUntil: "domcontentloaded" });

    // Wait for resume content to be fully loaded
    await page.waitForSelector("#resume-content", {
      visible: true,
      timeout: 20000,
    });

    // Wait for fonts to load (if available) without blocking unnecessarily
    await page.evaluate(() => (document as any).fonts?.ready?.catch(() => null));

    // Set viewport to match A4 dimensions exactly
    await page.setViewport({
      width: 794,  // 21cm in pixels at 96 DPI
      height: 1123, // 29.7cm in pixels at 96 DPI
      deviceScaleFactor: 1,
    });

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
      pageRanges: '',
    });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": pdf.length.toString(),
        "Content-Disposition": `inline; filename="resume.pdf"`, // Changed to inline for preview support
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { message: "Error generating PDF", error: String(error) },
      { status: 500 }
    );
  } finally {
    try {
      const browser = await browserPromise;
      if (browser) {
        const pages = await browser.pages();
        const extraPages = pages.filter((page) => page.url().includes("/resume/download"));
        await Promise.all(extraPages.map((page) => page.close().catch(() => null)));
      }
    } catch (cleanupError) {
      console.error("Error cleaning up Puppeteer pages:", cleanupError);
    }
  }
}
