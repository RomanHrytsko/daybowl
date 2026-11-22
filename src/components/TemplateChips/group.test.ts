import { describe, expect, it } from 'vitest';
import { groupTemplates } from './group';
import { cat, tpl } from '../../test/factories';

describe('groupTemplates', () => {
  it('групує шаблони за категоріями у порядку категорій', () => {
    const work = cat({ name: 'Робота', order: 1 });
    const sport = cat({ name: 'Спорт', order: 0 });
    const groups = groupTemplates(
      [tpl({ title: 'Звіт', categoryId: work.id }), tpl({ title: 'Біг', categoryId: sport.id })],
      [work, sport],
    );
    expect(groups.map((g) => g.category.name)).toEqual(['Спорт', 'Робота']);
    expect(groups[0].templates.map((t) => t.title)).toEqual(['Біг']);
    expect(groups[1].templates.map((t) => t.title)).toEqual(['Звіт']);
  });

  it('всередині групи — спершу популярніші, далі за абеткою', () => {
    const c = cat();
    const groups = groupTemplates(
      [
        tpl({ title: 'Вʼязання', categoryId: c.id, usageCount: 0 }),
        tpl({ title: 'Арт', categoryId: c.id, usageCount: 0 }),
        tpl({ title: 'Ігри', categoryId: c.id, usageCount: 5 }),
      ],
      [c],
    );
    expect(groups[0].templates.map((t) => t.title)).toEqual(['Ігри', 'Арт', 'Вʼязання']);
  });

  it('пропускає порожні та архівні категорії і архівні шаблони', () => {
    const live = cat({ name: 'Жива' });
    const empty = cat({ name: 'Порожня' });
    const archived = cat({ name: 'Архівна', archived: true });
    const groups = groupTemplates(
      [
        tpl({ title: 'Ок', categoryId: live.id }),
        tpl({ title: 'Старий', categoryId: live.id, archived: true }),
        tpl({ title: 'Схований', categoryId: archived.id }),
        tpl({ title: 'Сирота', categoryId: 'missing' }),
      ],
      [live, empty, archived],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].category.name).toBe('Жива');
    expect(groups[0].templates.map((t) => t.title)).toEqual(['Ок']);
  });

  it('категорія, де всі шаблони архівні, не показується', () => {
    const c = cat();
    expect(groupTemplates([tpl({ categoryId: c.id, archived: true })], [c])).toEqual([]);
  });
});
