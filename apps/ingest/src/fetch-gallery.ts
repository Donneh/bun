export const GALLERY_URL = "https://playriftbound.com/en-us/card-gallery/";
export const SCRAPER_USER_AGENT = "riftkeeper-scraper/1.0";
const FETCH_TIMEOUT_MS = 30_000;

export async function fetchGalleryHtml(url: string = GALLERY_URL): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": SCRAPER_USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Fetching ${url} failed with HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}
