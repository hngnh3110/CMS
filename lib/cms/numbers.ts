export function checkedSum(values: number[]): number {
  let total = 0;
  for (const value of values) {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)
      throw new Error('Giá trị số vượt giới hạn an toàn.');
    total += value;
    if (!Number.isFinite(total) || Math.abs(total) > Number.MAX_SAFE_INTEGER)
      throw new Error('Tổng giá trị vượt giới hạn an toàn.');
  }
  return total;
}

export function numericTotals(
  records: Record<string, string | number | null>[],
): Record<string, number | null> {
  const totalRows = records.filter((r) => r.scope === 'total');
  const rows = totalRows.length ? totalRows : records;
  const keys = [
    ...new Set(
      rows.flatMap((r) =>
        Object.keys(r).filter(
          (k) =>
            typeof r[k] === 'number' &&
            !k.endsWith('_rate') &&
            !k.startsWith('source_') &&
            k !== 'extension_count',
        ),
      ),
    ),
  ];
  return Object.fromEntries(
    keys.map((k) => {
      const sum = checkedSum(
        rows.map((r) => (typeof r[k] === 'number' ? (r[k] as number) : 0)),
      );
      return [
        k,
        rows.some((r) => r[k] === null || r[k] === undefined) ? null : sum,
      ];
    }),
  );
}
