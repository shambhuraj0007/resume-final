import maxmind, { CountryResponse } from 'maxmind';
import path from 'path';
import fs from 'fs';

// Path to the MMDB file
// We'll look in a few distinct places to be robust
const MMDB_PATHS = [
    path.join(process.cwd(), 'server', 'data', 'GeoLite2-Country.mmdb'),
    path.join(process.cwd(), 'public', 'GeoLite2-Country.mmdb'),
];

let lookup: maxmind.Reader<CountryResponse> | null = null;

export async function getRegionFromIP(ip: string): Promise<string> {
    // Default to INDIA if detection fails or IP is local
    const DEFAULT_REGION = 'INDIA';

    // Handle local development IPs
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
        return DEFAULT_REGION;
    }

    try {
        if (!lookup) {
            // Find the first valid path
            const dbPath = MMDB_PATHS.find(p => fs.existsSync(p));

            if (!dbPath) {
                console.warn('GeoLite2 database not found. Using default region.');
                return DEFAULT_REGION;
            }

            const buffer = fs.readFileSync(dbPath);
            lookup = new maxmind.Reader<CountryResponse>(buffer);
        }

        const response = lookup.get(ip);

        if (response && response.country && response.country.iso_code) {
            const countryCode = response.country.iso_code;

            // Map country codes to regions
            if (countryCode === 'IN') return 'INDIA';
            if (countryCode === 'US') return 'USA';
            if (['GB', 'UK'].includes(countryCode)) return 'UK';

            // Europe mappings (simplified list)
            const EU_COUNTRIES = [
                'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE',
                'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT',
                'RO', 'SK', 'SI', 'ES', 'SE'
            ];
            if (EU_COUNTRIES.includes(countryCode)) return 'EUROPE';

            // Default fallback for others could be USA or INTERNATIONAL
            return 'USA';
        }
    } catch (error) {
        console.error('Error looking up IP:', error);
    }

    return DEFAULT_REGION;
}
