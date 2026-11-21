import Dexie, { type EntityTable } from 'dexie';
import type { Activity, ActivityTemplate, Category, DayConfig, Settings } from '../domain/types';

/*
 * ПРАВИЛО МІГРАЦІЙ (дані користувача живуть у браузері, деплой не має права їх зламати):
 *
 * 1. SCHEMA_V1 / version(1).stores(...) більше НІКОЛИ не змінюється.
 * 2. Новий індекс або таблиця — це version(2).stores({...}).upgrade(tx => ...),
 *    далі version(3) і т. д. Старі версії лишаються в коді.
 * 3. Нові неіндексовані поля робимо опційними (`field?: T`); версію схеми не піднімаємо.
 * 4. Тест «v1-база відкривається без втрат» у data.test.ts має проходити завжди.
 * 5. Перед деплоєм зі зміною схеми — експорт даних (Налаштування → Експортувати JSON).
 */
export const SCHEMA_V1 = {
  activities: 'id, date, [date+order], templateId',
  dayConfigs: 'date',
  categories: 'id, order',
  templates: 'id, usageCount',
  settings: 'id',
} as const;

export class DaybowlDB extends Dexie {
  activities!: EntityTable<Activity, 'id'>;
  dayConfigs!: EntityTable<DayConfig, 'date'>;
  categories!: EntityTable<Category, 'id'>;
  templates!: EntityTable<ActivityTemplate, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'daybowl') {
    super(name);
    this.version(1).stores(SCHEMA_V1);
  }
}

export const db = new DaybowlDB();
