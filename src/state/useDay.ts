import { weekStartOf, type DateStr } from '../domain/dates';
import { useWeek } from './useWeek';

export function useDay(date: DateStr) {
  const res = useWeek(weekStartOf(date));
  const day = res.week?.days.find((d) => d.date === date);
  return { ...res, day };
}
