/** Run on the Dashboard server, never bundle this file into browser code. */
const categories = ['bctc', 'dautu', 'eoffice', 'vanban', 'nhiemvu'];
export async function getDashboardDataset(category: string, period?: string) {
  if (!categories.includes(category)) throw new Error('Unknown category');
  const origin = process.env.CMS_URL;
  const token = process.env.CMS_API_TOKEN;
  if (!origin || !token) throw new Error('Configure CMS_URL and CMS_API_TOKEN');
  const url = new URL('/vtv/dashboard/' + category, origin);
  if (period) url.searchParams.set('period', period);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`CMS returned ${response.status}`);
  const payload = (await response.json()) as { data: unknown };
  return payload.data;
}
/** Map the existing browser routes to CMS categories in the Dashboard's own API layer. */
export const dashboardRoutes = {
  '/bctc': 'bctc',
  '/dautu': 'dautu',
  '/eoffice': 'eoffice',
  '/eoffice/sla': 'vanban',
  '/nhiemvu': 'nhiemvu',
};
