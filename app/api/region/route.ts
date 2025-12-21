// import { NextRequest, NextResponse } from "next/server";
// import path from "path";
// import maxmind, { Reader } from "maxmind"; // Import Reader type explicitly

// type Region = "INDIA" | "USA" | "EUROPE" | "UK";

// // Correct type for the promise: Promise<Reader<any>>
// let readerPromise: Promise<Reader<any>> | null = null;

// function getReader() {
//   if (!readerPromise) {
//     const mmdbPath = path.join(process.cwd(), "server", "data", "GeoLite2-Country.mmdb");
//     readerPromise = maxmind.open(mmdbPath);
//   }
//   return readerPromise;
// }

// function mapCountryToRegion(countryCode?: string): Region {
//   if (countryCode === "IN") return "INDIA";
//   if (countryCode === "GB") return "UK";
//   if (countryCode === "US") return "USA";
  
//   const EU = new Set(["DE","FR","IT","ES","NL","BE","AT","SE","NO","DK","FI","PT","IE","PL","CZ","GR"]);
//   if (countryCode && EU.has(countryCode)) return "EUROPE";
  
//   return "USA"; // Default
// }

// function getClientIp(req: NextRequest) {
//   const xff = req.headers.get("x-forwarded-for");
//   if (xff) return xff.split(",")[0].trim();
//   return req.headers.get("x-real-ip") || "127.0.0.1";
// }

// export async function GET(req: NextRequest) {
//   try {
//     const ip = getClientIp(req);
//     const reader = await getReader();
//     const geo = reader.get(ip); // geo is automatically typed

//     const countryCode = geo?.country?.iso_code; 
//     const region = mapCountryToRegion(countryCode);

//     return NextResponse.json({
//       ip,
//       countryCode: countryCode || null,
//       region,
//     });
//   } catch (error) {
//     console.error("GeoIP Error:", error);
//     // Fallback to USA on error
//     return NextResponse.json({ region: "USA", countryCode: null });
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import maxmind, { Reader } from "maxmind";

type Region = "INDIA" | "USA" | "EUROPE" | "UK";

let readerPromise: Promise<Reader<any>> | null = null;

function getReader() {
  if (!readerPromise) {
    const mmdbPath = path.join(process.cwd(), "server", "data", "GeoLite2-Country.mmdb");
    readerPromise = maxmind.open(mmdbPath);
  }
  return readerPromise;
}

function mapCountryToRegion(countryCode?: string): Region {
  if (countryCode === "IN") return "INDIA";
  if (countryCode === "GB") return "UK";
  if (countryCode === "US") return "USA";
  const EU = new Set(["DE","FR","IT","ES","NL","BE","AT","SE","NO","DK","FI","PT","IE","PL","CZ","GR"]);
  if (countryCode && EU.has(countryCode)) return "EUROPE";
  return "USA";
}

function getClientIp(req: NextRequest) {
  // DEV ONLY: Force an Indian IP to test India logic
  // return "103.208.68.0"; // Uncomment this to simulate India
  
  // DEV ONLY: Force a US IP to test USA logic
   return "8.8.8.8"; 

//   const xff = req.headers.get("x-forwarded-for");
//   if (xff) return xff.split(",")[0].trim();
//   return req.headers.get("x-real-ip") || "127.0.0.1";
}


export async function GET(req: NextRequest) {
  // In development, bypass the GeoIP lookup to avoid errors if the file is missing.
  if (process.env.NODE_ENV === "development") {
    const ip = getClientIp(req);
    const region = ip === "8.8.8.8" ? "USA" : "INDIA"; // Basic mapping for dev
    return NextResponse.json({ 
      ip,
      countryCode: region === "USA" ? "US" : "IN",
      region 
    });
  }

  try {
    const ip = getClientIp(req);
    
    // Allow overriding Region via query param for testing (simpler)
    const testRegion = req.nextUrl.searchParams.get("test_region");
    if (testRegion) {
        return NextResponse.json({
            ip: "test-override",
            countryCode: "TEST",
            region: testRegion.toUpperCase()
        });
    }

    const reader = await getReader();
    const geo = reader.get(ip);
    const countryCode = geo?.country?.iso_code;
    const region = mapCountryToRegion(countryCode);

    return NextResponse.json({
      ip,
      countryCode: countryCode || null,
      region,
    });
  } catch (error) {
    console.error("GeoIP Error:", error);
    return NextResponse.json({ region: "USA", countryCode: null });
  }
}
