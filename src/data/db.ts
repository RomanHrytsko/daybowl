import Dexie, { type EntityTable } from 'dexie';
import type { Activity, ActivityTemplate, Category, DayConfig, Settings } from '../domain/types';

export class DaybowlDB extends Dexie {
  activities!: EntityTable<Activity, 'id'>;
  dayConfigs!: EntityTable<DayConfig, 'date'>;
  categories!: EntityTable<Category, 'id'>;
  templates!: EntityTable<ActivityTemplate, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'daybowl') {
    super(name);
    this.version(1).stores({
      activities: 'id, date, [date+order], templateId',
      dayConfigs: 'date',
      categories: 'id, order',
      templates: 'id, usageCount',
      settings: 'id',
    });
  }
}

export const db = new DaybowlDB();
