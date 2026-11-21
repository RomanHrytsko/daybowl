import { expect, type Page } from '@playwright/test';

/** Свіжий контекст = порожня IndexedDB → онбординг. */
export async function openFresh(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Ласкаво просимо/ })).toBeVisible();
}

export async function finishOnboarding(page: Page) {
  await openFresh(page);
  await page.getByRole('button', { name: /Готово/ }).tap();
  await expect(page.getByText('Для себе за тиждень')).toBeVisible();
}

export const tabBar = (page: Page) => page.locator('nav.tabbar');

export async function openToday(page: Page) {
  await page.getByRole('button', { name: /^(пн|вт|ср|чт|пт|сб|нд) \d+:/ }).first().waitFor();
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await page.evaluate((d) => (location.hash = `#/day/${d}`), today);
  await expect(page.getByRole('button', { name: /До тижня/ })).toBeVisible();
  return today;
}

export interface LayoutIssue {
  kind: 'overflow' | 'field-font' | 'field-height' | 'tap-target' | 'clipped';
  what: string;
  detail: string;
}

/**
 * Перевірки зі специфікації (розділ «Автоматичні перевірки»):
 * немає горизонтального переповнення; поля ≥ 16 px і ≥ 44 px; кнопки ≥ 44×44
 * (винятки — лише з `data-touch-exempt`); нічого не обрізано правим краєм.
 */
export async function auditLayout(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const issues: { kind: string; what: string; detail: string }[] = [];
    const vw = window.innerWidth;
    const EPS = 0.5;
    const describe = (el: Element) => {
      const label = el.getAttribute('aria-label') || (el as HTMLElement).innerText?.trim().slice(0, 30) || '';
      return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}> «${label}»`;
    };
    const isVisible = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
    };

    const sw = document.documentElement.scrollWidth;
    if (sw > vw) issues.push({ kind: 'overflow', what: 'document', detail: `scrollWidth ${sw} > innerWidth ${vw}` });

    for (const el of document.querySelectorAll('input, select, textarea')) {
      const type = el.getAttribute('type');
      if (type === 'hidden' || type === 'file' || !isVisible(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) issues.push({ kind: 'field-font', what: describe(el), detail: `font-size ${fs}px` });
      const h = el.getBoundingClientRect().height;
      if (h < 44 - EPS) issues.push({ kind: 'field-height', what: describe(el), detail: `height ${h.toFixed(1)}px` });
    }

    for (const el of document.querySelectorAll('button, [role=button], [role=switch], a[href]')) {
      if (!isVisible(el) || el.closest('[data-touch-exempt]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 44 - EPS || r.height < 44 - EPS) {
        issues.push({ kind: 'tap-target', what: describe(el), detail: `${r.width.toFixed(1)}×${r.height.toFixed(1)}` });
      }
    }

    // SVG-нутрощі (хвилі) свідомо виходять за межі й обрізаються clipPath — перевіряємо лише сам <svg>
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + EPS || r.left < -EPS) {
        issues.push({ kind: 'clipped', what: describe(el), detail: `left ${r.left.toFixed(1)}, right ${r.right.toFixed(1)}, vw ${vw}` });
      }
    }
    return issues as never;
  });
}

export async function expectCleanLayout(page: Page, screen: string) {
  const issues = await auditLayout(page);
  expect(issues, `${screen}:\n${issues.map((i) => `  [${i.kind}] ${i.what} — ${i.detail}`).join('\n')}`).toEqual([]);
}
