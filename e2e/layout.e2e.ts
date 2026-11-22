import { expect, test } from '@playwright/test';
import { expectCleanLayout, finishOnboarding, openFresh, openToday, tabBar } from './helpers';

test.describe('верстка на iPhone', () => {
  test('онбординг', async ({ page }) => {
    await openFresh(page);
    await expectCleanLayout(page, 'Онбординг');
    // «Готово» — sticky внизу, видно без скролу
    const done = page.getByRole('button', { name: /Готово/ });
    await expect(done).toBeInViewport();
  });

  test('тиждень: усі 7 чаш видно без скролу', async ({ page }) => {
    await finishOnboarding(page);
    await expectCleanLayout(page, 'Тиждень');
    const days = page.getByRole('button', { name: /^(пн|вт|ср|чт|пт|сб|нд) \d+:/ });
    // 7 чаш у сітці + 7 рядків у списку
    await expect(days).toHaveCount(14);
    for (let i = 0; i < 7; i++) await expect(days.nth(i)).toBeInViewport({ ratio: 1 });
    await expect(page.getByText(/Перетягніть/)).toHaveCount(0);
  });

  test('день із розгорнутою справою: чаша і перша група шаблонів на першому екрані', async ({ page }) => {
    await finishOnboarding(page);
    await openToday(page);

    const bowl = page.getByRole('img', { name: / з / }).first();
    const groups = page.getByRole('list', { name: 'Шаблони за категоріями' });
    const firstGroup = groups.getByRole('button').first();
    await expect(bowl).toBeInViewport({ ratio: 1 });
    const groupBox = (await firstGroup.boundingBox())!;
    const tabTop = (await tabBar(page).boundingBox())!.y;
    expect(groupBox.y + groupBox.height, 'заголовок першої групи над таб-панеллю').toBeLessThanOrEqual(tabTop);

    await groups.getByRole('button', { name: /^Відпочинок/ }).tap();
    await expectCleanLayout(page, 'День (розгорнута група шаблонів)');
    await page.getByRole('button', { name: /Читання/ }).tap();
    const list = page.getByRole('list', { name: 'Справи дня' });
    await list.getByRole('button', { name: /Читання/ }).tap();
    await expect(list.getByRole('textbox', { name: 'Назва' })).toBeVisible();
    await expectCleanLayout(page, 'День (розгорнута справа)');
  });

  test('день: лист підтвердження видалення', async ({ page }) => {
    await finishOnboarding(page);
    await openToday(page);
    await page.getByRole('button', { name: /^Відпочинок/ }).tap();
    await page.getByRole('button', { name: /Читання/ }).tap();
    const list = page.getByRole('list', { name: 'Справи дня' });
    await list.getByRole('button', { name: /Читання/ }).tap();
    await list.getByRole('button', { name: 'Видалити' }).tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectCleanLayout(page, 'ConfirmSheet');
  });

  test('шаблони', async ({ page }) => {
    await finishOnboarding(page);
    await tabBar(page).getByRole('button', { name: 'Шаблони' }).tap();
    await expect(page.getByRole('heading', { name: 'Категорії' })).toBeVisible();
    await expectCleanLayout(page, 'Шаблони');
    await page.getByRole('switch', { name: 'Показати архівні' }).tap();
    await expectCleanLayout(page, 'Шаблони (з архівними)');
  });

  test('підсумок', async ({ page }) => {
    await finishOnboarding(page);
    await tabBar(page).getByRole('button', { name: 'Підсумок' }).tap();
    await expect(page.getByRole('heading', { name: 'Підсумок тижня' })).toBeVisible();
    await expectCleanLayout(page, 'Підсумок');
  });

  test('налаштування', async ({ page }) => {
    await finishOnboarding(page);
    await tabBar(page).getByRole('button', { name: 'Налаштування' }).tap();
    await expect(page.getByRole('heading', { name: 'Резервна копія' })).toBeVisible();
    await expectCleanLayout(page, 'Налаштування');
  });

  test('фокус у полі ховає таб-панель', async ({ page }) => {
    await finishOnboarding(page);
    await openToday(page);
    await expect(tabBar(page)).toBeVisible();
    await page.getByRole('textbox', { name: "Об'єм дня" }).focus();
    await expect(tabBar(page)).toBeHidden();
  });
});
