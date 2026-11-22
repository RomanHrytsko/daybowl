import type { ActivityTemplate, Category } from '../../domain/types';

export interface TemplateGroup {
  category: Category;
  templates: ActivityTemplate[];
}

/**
 * Групує активні шаблони за категоріями: групи — у порядку категорій,
 * шаблони всередині — за популярністю, далі за назвою. Порожні й архівні категорії пропускаються.
 */
export function groupTemplates(templates: ActivityTemplate[], categories: Category[]): TemplateGroup[] {
  const byCat = new Map<string, ActivityTemplate[]>();
  for (const t of templates) {
    if (t.archived) continue;
    const list = byCat.get(t.categoryId);
    if (list) list.push(t);
    else byCat.set(t.categoryId, [t]);
  }
  return categories
    .filter((c) => !c.archived && byCat.has(c.id))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'uk'))
    .map((category) => ({
      category,
      templates: byCat.get(category.id)!.sort(
        (a, b) => b.usageCount - a.usageCount || a.title.localeCompare(b.title, 'uk'),
      ),
    }));
}
