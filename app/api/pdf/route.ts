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
      args: [
        ...chromium.args,
        '--disable-dev-shm-usage',      // Critical for EC2
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',             // Important for limited memory
        '--disable-gpu'
      ],
      headless: true,
      timeout: 60000,                   // Increased browser launch timeout
      protocolTimeout: 60000,           // Increased protocol timeout
    });
  }

  console.log("[DEBUG] Launching Puppeteer in dev mode");
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",       // Also add for dev
      "--disable-gpu"
    ],
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
      console.log("[DEBUG] Browser disconnected, relaunching...");
      browserPromise = launchBrowser();
      return browserPromise;
    }

    return browser;
  } catch (error) {
    console.error("[ERROR] Browser launch failed:", error);
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

  let page;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Increased timeouts for EC2
    page.setDefaultNavigationTimeout(60000);  // 60s instead of 30s
    page.setDefaultTimeout(60000);            // 60s instead of 30s

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:8888");

    const url = new URL(`${baseUrl}/resume/download`);
    url.search = searchParams.toString();

    console.log("[DEBUG] Navigating to:", url.toString());

    // Better page navigation
    await page.goto(url.toString(), {
      waitUntil: ["networkidle0", "domcontentloaded"],  // Wait for network to settle
      timeout: 60000
    });

    // Wait for resume content with fallback
    console.log("[DEBUG] Waiting for #resume-content...");
    try {
      await page.waitForSelector("#resume-content", {
        visible: true,
        timeout: 60000,  // Increased from 20s to 60s
      });
      console.log("[DEBUG] #resume-content found");
    } catch (selectorError) {
      console.warn("[WARN] #resume-content not found, trying body fallback");
      // Fallback to body if specific selector not found
      await page.waitForSelector("body", {
        visible: true,
        timeout: 10000
      });
    }

    // Wait for fonts to load
    await page.evaluate(() => {
      return (document as any).fonts?.ready?.catch(() => {
        console.warn("Font loading timed out or not supported");
        return null;
      });
    });

    // Additional wait to ensure rendering is complete
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve(true);
        } else {
          window.addEventListener('load', () => resolve(true));
        }
      });
    });

    console.log("[DEBUG] Page fully loaded, generating PDF...");

    // Set viewport to match A4 dimensions exactly
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
      pageRanges: '',
      timeout: 60000,  // Add PDF generation timeout
    });

    console.log("[DEBUG] PDF generated successfully, size:", pdf.length);

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": pdf.length.toString(),
        "Content-Disposition": `inline; filename="resume.pdf"`,
      },
    });

  } catch (error) {
    console.error("[ERROR] PDF generation error:", error);

    // Log more details
    if (error instanceof Error) {
      console.error("[ERROR] Error name:", error.name);
      console.error("[ERROR] Error message:", error.message);
      console.error("[ERROR] Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        message: "Error generating PDF",
        error: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );

  } finally {
    // Clean up page
    if (page) {
      try {
        await page.close();
        console.log("[DEBUG] Page closed successfully");
      } catch (cleanupError) {
        console.error("[ERROR] Error closing page:", cleanupError);
      }
    }
  }
}
