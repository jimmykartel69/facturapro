export function parsePagination(params: URLSearchParams) {
  const raw = params.get('page') ?? '1';
  if (!/^[1-9]\d{0,5}$/.test(raw)) throw new RangeError('Page invalide');
  const page = Number(raw);
  const pageSize = 50;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize + 1 };
}
