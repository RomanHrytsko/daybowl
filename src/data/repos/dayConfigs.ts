import { db } from '../db';
import { nowIso, uuid, type DateStr } from '../../domain/dates';

/** undefined — повернутися до об'єму за замовчуванням */
export async function setDayCapacity(date: DateStr, capacityMinutes: number | undefined) {
  const now = nowIso();
  const cur = await db.dayConfigs.get(date);
  await db.dayConfigs.put({
    id: cur?.id ?? uuid(),
    createdAt: cur?.createdAt ?? now,
    updatedAt: now,
    date,
    note: cur?.note,
    capacityMinutes,
  });
}
