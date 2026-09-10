/** Public CMS origin is safe for frontend code. Never put access tokens in this URL. */
const mapping: Record<string, string> = {
  '/bctc': 'bctc',
  '/dautu': 'dautu',
  '/eoffice': 'eoffice',
  '/eoffice/sla': 'vanban',
  '/nhiemvu': 'nhiemvu',
};
export function cmsImportLink(dashboardHashRoute: string, cmsOrigin: string) {
  const category = mapping[dashboardHashRoute];
  if (!category) throw Error('Unknown Dashboard route');
  return new URL('/admin/vtv-cms/' + category + '/import', cmsOrigin).href;
}
