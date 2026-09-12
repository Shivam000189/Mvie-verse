export const formatYear = (date: string | null): string | number =>
  date ? new Date(date).getFullYear() : '—'

export const formatCount = (count: number): string =>
  count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : count.toString()
