import { numericTotals } from './numbers';
import { type Batch, catalog, type RecordRow } from './catalog';
export function dashboardPayload(batch: Batch) {
  const records = (batch.records || []).map(
    (row) =>
      Object.fromEntries(
        Object.entries(row).filter(
          ([key]) => !['approver_email', 'approver_phone'].includes(key),
        ),
      ) as RecordRow,
  );
  const totalRows = records.filter((r) => r.scope === 'total');
  const numeric: Record<string, number | null> =
    batch.category === 'bctc' ? {} : numericTotals(records);
  if (batch.category === 'eoffice') {
    numeric.usage_rate =
      numeric.active_users == null
        ? null
        : numeric.users
          ? (numeric.active_users / numeric.users) * 100
          : 0;
    numeric.electronic_outgoing_rate =
      numeric.electronic_outgoing == null
        ? null
        : numeric.outgoing
          ? (numeric.electronic_outgoing / numeric.outgoing) * 100
          : 0;
  }
  // Financial rows are hierarchical. Never sum balance-sheet lines together.
  const summary =
    batch.category === 'bctc'
      ? {
          indicators: Object.fromEntries(
            records.map((r) => [
              String(r.code),
              { name: r.name, opening: r.opening, closing: r.closing },
            ]),
          ),
        }
      : numeric;
  return {
    schema_version: 1,
    category: batch.category,
    period: batch.period,
    version: batch.id,
    published_at: batch.published_at,
    unit: catalog.find((c) => c.id === batch.category)?.unit,
    reporting_range: records[0]?.source_reporting_range || undefined,
    aggregation:
      batch.category === 'bctc'
        ? 'by_indicator'
        : totalRows.length
          ? 'reported_total'
          : 'sum_rows',
    summary,
    records,
  };
}
