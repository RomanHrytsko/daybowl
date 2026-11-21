import { expect, test, type Page } from '@playwright/test';
import { finishOnboarding, openFresh, openToday, tabBar } from './helpers';

/** Таблиця кнопок зі специфікації: кожна спрацьовує з першого tap(). */

const hash = (page: Page) => page.evaluate(() => location.hash);
const toast = (page: Page) => page.getByRole('status');

test.describe('усі кнопки працюють', () => {
  test('таби × 4', async ({ page }) => {
    await finishOnboarding(page);
    const tabs = tabBar(page);
    for (const [label, h] of [['Підсумок', '#/summary'], ['Шаблони', '#/templates'], ['Налаштування', '#/settings'], ['Тиждень', '#/week']]) {
      await tabs.getByRole('button', { name: label }).tap();
      await expect.poll(() => hash(page)).toContain(h);
      await expect(tabs.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('тиждень: ‹ / › / Сьогодні, відкриття дня, копіювання, банер', async ({ page }) => {
    await finishOnboarding(page);
    // до першої навігації хеш порожній — фіксуємо поточний тиждень через «›» + «Сьогодні»
    await page.getByRole('button', { name: 'Наступний тиждень' }).tap();
    await page.getByRole('button', { name: 'Сьогодні' }).tap();
    await expect.poll(() => hash(page)).toMatch(/^#\/week\/\d{4}-\d{2}-\d{2}$/);
    const start = await hash(page);
    await page.getByRole('button', { name: 'Наступний тиждень' }).tap();
    await expect.poll(() => hash(page)).not.toBe(start);
    await page.getByRole('button', { name: 'Сьогодні' }).tap();
    await expect.poll(() => hash(page)).toBe(start);
    await page.getByRole('button', { name: 'Попередній тиждень' }).tap();
    await expect.poll(() => hash(page)).not.toBe(start);
    await page.getByRole('button', { name: 'Сьогодні' }).tap();

    // «Скопіювати минулий тиждень» → toast з кількістю
    await page.getByRole('button', { name: 'Скопіювати минулий тиждень' }).tap();
    await expect(toast(page)).toHaveText(/Скопійовано справ: \d+|немає що копіювати/);

    // ✕ на банері «Встанови як застосунок»
    const banner = page.getByRole('note').filter({ hasText: 'Встанови' });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Закрити' }).tap();
    await expect(banner).toHaveCount(0);

    // чаша в сітці і рядок у списку відкривають день
    const days = page.getByRole('button', { name: /^пн \d+:/ });
    await days.first().tap();
    await expect.poll(() => hash(page)).toMatch(/^#\/day\//);
    await page.getByRole('button', { name: /До тижня/ }).tap();
    await days.last().tap();
    await expect.poll(() => hash(page)).toMatch(/^#\/day\//);
  });

  test('день: навігація, чипи, своя справа, об\'єм, розмір, дії рядка', async ({ page }) => {
    await finishOnboarding(page);
    const today = await openToday(page);
    const list = page.getByRole('list', { name: 'Справи дня' });

    await page.getByRole('button', { name: 'Наступний день' }).tap();
    await expect.poll(() => hash(page)).not.toContain(today);
    await page.getByRole('button', { name: 'Попередній день' }).tap();
    await expect.poll(() => hash(page)).toContain(today);

    // чип шаблону → новий шар
    await page.getByRole('button', { name: /Читання/ }).tap();
    await expect(list.getByText('Читання')).toBeVisible();

    // + Своя → Додати
    await page.getByRole('button', { name: /Своя справа/ }).tap();
    await page.getByRole('textbox', { name: 'Назва' }).fill('Вечірня йога');
    await page.getByRole('button', { name: 'Додати' }).tap();
    await expect(list.getByText('Вечірня йога')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Додати' })).toHaveCount(0);

    // − / + об'єму і «Скинути»
    const cap = page.getByRole('textbox', { name: "Об'єм дня" });
    const before = await cap.inputValue();
    await page.getByRole('button', { name: "Більше: Об'єм дня" }).tap();
    await expect(cap).not.toHaveValue(before);
    await page.getByRole('button', { name: 'Скинути' }).tap();
    await expect(cap).toHaveValue(before);
    await page.getByRole('button', { name: "Менше: Об'єм дня" }).tap();
    await expect(page.getByRole('button', { name: 'Скинути' })).toBeVisible();
    await page.getByRole('button', { name: 'Скинути' }).tap();

    // «7,5» з української клавіатури → 7 год 30 хв
    await cap.fill('7,5');
    await cap.press('Enter');
    await expect(page.getByRole('img', { name: / з 7,5 год$/ })).toBeVisible();

    // S / M / L / XL у згорнутому рядку
    const walk = list.locator('li').filter({ hasText: 'Вечірня йога' });
    await walk.getByRole('button', { name: /^XL/ }).tap();
    await expect(walk.getByRole('button', { name: /^XL/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(walk).toContainText('4 год');

    // рядок → ↑ / ↓ / Перенести на / Видалити
    await walk.getByRole('button', { name: /Вечірня йога/ }).tap();
    const titles = () => list.locator('li .font-medium').allInnerTexts();
    const order = await titles();
    await walk.getByRole('button', { name: order[0] === 'Вечірня йога' ? 'Нижче' : 'Вище' }).tap();
    await expect.poll(titles).not.toEqual(order);

    const options = walk.getByRole('combobox', { name: 'Перенести на…' }).locator('option');
    const target = await options.nth(1).getAttribute('value');
    await walk.getByRole('combobox', { name: 'Перенести на…' }).selectOption(target!);
    await expect(list.getByText('Вечірня йога')).toHaveCount(0);

    const reading = list.locator('li').filter({ hasText: 'Читання' });
    await reading.getByRole('button', { name: /Читання/ }).tap();
    await reading.getByRole('button', { name: 'Видалити' }).tap();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Видалити' }).tap();
    await expect(list.getByText('Читання')).toHaveCount(0);
  });

  test('шаблони: створення, меню ⋯, повтор, архів', async ({ page }) => {
    await finishOnboarding(page);
    await tabBar(page).getByRole('button', { name: 'Шаблони' }).tap();

    await page.getByRole('button', { name: '+ Нова категорія' }).tap();
    // чекаємо саме поле з фокусом: одразу після тапу фокус ще на кнопці «+»
    const focusedCat = page.getByRole('textbox', { name: 'Назва категорії' }).and(page.locator(':focus'));
    await expect(focusedCat).toHaveValue('Нова категорія');
    await page.keyboard.type('Музика');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: 'Назва категорії' }).nth(-1)).toHaveValue('Музика');

    await page.getByRole('button', { name: '+ Новий шаблон' }).tap();
    await expect(page.getByRole('textbox', { name: 'Назва шаблону' }).and(page.locator(':focus'))).toHaveValue('Новий шаблон');

    // ⋯ → Архівувати → зникає; перемикач архівних → видно → ⋯ → Повернути
    await page.getByRole('button', { name: 'Ще дії: Музика' }).tap();
    await page.getByRole('dialog').getByRole('button', { name: 'Архівувати' }).tap();
    await expect(page.getByRole('button', { name: 'Ще дії: Музика' })).toHaveCount(0);
    await page.getByRole('switch', { name: 'Показати архівні' }).tap();
    await expect(page.getByRole('switch', { name: 'Показати архівні' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Ще дії: Музика' }).tap();
    await page.getByRole('dialog').getByRole('button', { name: 'Повернути' }).tap();

    // ⋯ → Видалити для вільної категорії → підтвердження
    await page.getByRole('button', { name: 'Ще дії: Музика' }).tap();
    await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).tap();
    await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).tap();
    await expect(page.getByRole('button', { name: 'Ще дії: Музика' })).toHaveCount(0);

    // зайнята категорія → лист перенесення
    await page.getByRole('button', { name: /^Ще дії: Робота$/ }).first().tap();
    await page.getByRole('dialog').getByRole('button', { name: 'Видалити' }).tap();
    await expect(page.getByRole('dialog')).toContainText('Категорія використовується');
    await page.getByRole('dialog').getByRole('button', { name: 'Скасувати' }).tap();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // дні повтору × 7
    const repeat = page.getByRole('group', { name: 'Повтор' }).first();
    for (const day of ['понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота', 'неділя']) {
      const btn = repeat.getByRole('button', { name: day });
      const was = await btn.getAttribute('aria-pressed');
      await btn.tap();
      await expect(btn).toHaveAttribute('aria-pressed', was === 'true' ? 'false' : 'true');
    }
  });

  test('налаштування: копія через «Поділитися», відновлення, онбординг', async ({ page }) => {
    // емулюємо Web Share iOS: фіксуємо, що файл передано в меню «Поділитися»
    await page.addInitScript(() => {
      const w = window as unknown as { __shared: { name: string; text: Promise<string> }[] };
      w.__shared = [];
      Object.assign(navigator, {
        canShare: () => true,
        share: async (d: ShareData) => {
          const f = d.files![0];
          w.__shared.push({ name: f.name, text: f.text() });
        },
      });
    });
    await finishOnboarding(page);
    await tabBar(page).getByRole('button', { name: 'Налаштування' }).tap();

    await page.getByRole('button', { name: 'Зберегти копію' }).tap();
    await expect(page.getByText(/Остання копія:/)).toBeVisible();
    const shared = await page.evaluate(async () => {
      const s = (window as unknown as { __shared: { name: string; text: Promise<string> }[] }).__shared;
      return { name: s[0]?.name, text: await s[0]?.text };
    });
    expect(shared.name).toMatch(/^daybowl-\d{4}-\d{2}-\d{2}\.json$/);

    // «Відновити з файлу» → лист підтвердження → дані відновлено
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Відновити з файлу' }).tap();
    await (await chooser).setFiles({ name: shared.name!, mimeType: 'application/json', buffer: Buffer.from(shared.text!) });
    const sheet = page.getByRole('dialog', { name: 'Відновити з файлу?' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Замінити дані' }).tap();
    await expect(toast(page)).toHaveText('Дані відновлено');

    await page.getByRole('button', { name: 'Пройти налаштування знову' }).tap();
    await expect(page.getByRole('heading', { name: /Ласкаво просимо/ })).toBeVisible();
  });

  test('онбординг: + Додати, ✕, Готово', async ({ page }) => {
    await openFresh(page);
    const remove = page.getByRole('button', { name: 'Прибрати' });
    const n = await remove.count();
    await page.getByRole('button', { name: /Додати повтор/ }).tap();
    await expect(remove).toHaveCount(n + 1);
    await remove.last().tap();
    await expect(remove).toHaveCount(n);
    await page.getByRole('button', { name: /Готово/ }).tap();
    await expect.poll(() => hash(page)).toMatch(/^(#\/week|)/);
    await expect(page.getByText('Для себе за тиждень')).toBeVisible();
  });
});
