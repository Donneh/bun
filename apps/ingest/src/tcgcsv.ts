import { z } from "zod";

export const TCGCSV_BASE_URL = "https://tcgcsv.com";
export const RIFTBOUND_CATEGORY_ID = 89;
export const PRICES_USER_AGENT = "riftkeeper-prices/1.0 (+https://riftkeeper.app; one sync per night)";
const FETCH_TIMEOUT_MS = 30_000;

const PriceAmountSchema = z.number().nonnegative().nullable();

const TcgcsvGroupSchema = z.object({
  groupId: z.int().positive(),
  abbreviation: z.string(),
});

const TcgcsvProductSchema = z.object({
  productId: z.int().positive(),
  name: z.string(),
  extendedData: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
});
export type TcgcsvProduct = z.infer<typeof TcgcsvProductSchema>;

const TcgcsvPriceSchema = z.object({
  productId: z.int().positive(),
  lowPrice: PriceAmountSchema,
  midPrice: PriceAmountSchema,
  highPrice: PriceAmountSchema,
  marketPrice: PriceAmountSchema,
  subTypeName: z.string(),
});
export type TcgcsvPrice = z.infer<typeof TcgcsvPriceSchema>;

const LastUpdatedSchema = z
  .string()
  .trim()
  .transform((text) => text.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"))
  .pipe(z.iso.datetime({ offset: true }))
  .transform((text) => new Date(text).toISOString());

export type TcgcsvSetPrices = {
  readonly setCode: string;
  readonly products: readonly TcgcsvProduct[];
  readonly prices: readonly TcgcsvPrice[];
};

export type TcgcsvCatalog = {
  readonly updatedAt: string;
  readonly sets: readonly TcgcsvSetPrices[];
};

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": PRICES_USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Fetching ${url} failed with HTTP ${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchResults<T extends z.ZodType>(url: string, schema: T): Promise<z.infer<T>[]> {
  const text = await fetchText(url);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${url} did not return JSON: ${text.slice(0, 80)}`);
  }
  const parsed = z.object({ success: z.literal(true), results: z.array(schema) }).safeParse(json);
  if (!parsed.success) throw new Error(`${url} has an unexpected shape: ${z.prettifyError(parsed.error)}`);
  return parsed.data.results;
}

export async function fetchTcgcsvCatalog({
  setCodes,
  baseUrl = TCGCSV_BASE_URL,
}: {
  setCodes: readonly string[];
  baseUrl?: string;
}): Promise<TcgcsvCatalog> {
  const updatedAt = LastUpdatedSchema.parse(await fetchText(`${baseUrl}/last-updated.txt`));
  const category = `${baseUrl}/tcgplayer/${RIFTBOUND_CATEGORY_ID}`;
  const groups = await fetchResults(`${category}/groups`, TcgcsvGroupSchema);
  const groupBySet = new Map(groups.map((group) => [group.abbreviation, group]));

  const sets: TcgcsvSetPrices[] = [];
  for (const setCode of setCodes) {
    const group = groupBySet.get(setCode);
    if (group === undefined) continue;
    const products = await fetchResults(`${category}/${group.groupId}/products`, TcgcsvProductSchema);
    const prices = await fetchResults(`${category}/${group.groupId}/prices`, TcgcsvPriceSchema);
    sets.push({ setCode, products, prices });
  }
  return { updatedAt, sets };
}
