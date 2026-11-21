import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { db } from '../data/db';
import { useUi } from '../state/uiStore';
import { today, weekStartOf } from '../domain/dates';

/** jsdom не має matchMedia: емулюємо ширину вікна для `min-width` і точний вказівник. */
function setViewport(width: number) {
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const matches = (!min || width >= Number(min[1])) && (!query.includes('pointer: fine') || width >= 768);
    return {
      matches, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    } as MediaQueryList;
  }) as typeof window.matchMedia;
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  location.hash = '';
  useUi.setState({ screen: 'week', weekStart: weekStartOf(today()), date: today() });
});

afterEach(() => {
  // @ts-expect-error — повертаємо jsdom без matchMedia
  delete window.matchMedia;
  vi.useRealTimers();
});

describe('сценарій першого тижня', () => {
  it('десктоп: онбординг заповнює тиждень повторами, тап по чипу додає справу в день', async () => {
    setViewport(1280);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Готово/ }));

    // тиждень: робота пн–пт по 8 год з'явилась сама
    expect(await screen.findByText(/Для себе за тиждень/)).toBeInTheDocument();
    expect((await screen.findAllByTitle('Робота · 8 год')).length).toBe(5);

    // відкрити понеділок і додати «Читання» одним тапом
    const monday = screen.getAllByRole('button', { name: /^пн / })[0];
    await user.click(monday);
    await user.click(await screen.findByRole('button', { name: /Читання/ }));

    const list = await screen.findByRole('list', { name: 'Справи дня' });
    expect(await within(list).findByText('Читання')).toBeInTheDocument();
    // «Читання» — категорія «Відпочинок» типу self → 1 год для себе
    const selfStat = screen.getByText('Для себе').parentElement!;
    expect(selfStat).toHaveTextContent('1 год');
  });

  it('телефон: сітка 7 чаш і список днів, таб-панель, день без drag & drop', async () => {
    setViewport(402);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Готово/ }));
    await screen.findByText(/Для себе за тиждень/);

    // кожен день — і чаша в сітці, і рядок у списку
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^пн \d+: 8 год з 16 год$/ })).toHaveLength(2));
    expect(screen.getAllByRole('button', { name: /^нд / })).toHaveLength(2);
    expect(screen.queryByText(/Перетягніть/)).not.toBeInTheDocument();
    expect(screen.queryAllByTitle('Робота · 8 год')).toHaveLength(0);

    // нижня таб-панель
    const tabs = screen.getAllByRole('navigation', { name: 'Розділи' }).find((n) => n.classList.contains('tabbar'))!;
    await user.click(within(tabs).getByRole('button', { name: /Шаблони/ }));
    expect(location.hash).toBe('#/templates');
    expect(within(tabs).getByRole('button', { name: /Шаблони/ })).toHaveAttribute('aria-current', 'page');
    await user.click(within(tabs).getByRole('button', { name: /Тиждень/ }));

    await user.click((await screen.findAllByRole('button', { name: /^пн / }))[1]);
    expect(await screen.findByRole('button', { name: /До тижня/ })).toBeInTheDocument();
  });

  it('об\'єм дня приймає кому і показує помилку для невалідного', async () => {
    setViewport(402);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Готово/ }));
    await screen.findByText(/Для себе за тиждень/);
    act(() => useUi.getState().openDay(today()));

    const cap = await screen.findByRole('textbox', { name: "Об'єм дня" });
    expect(cap).toHaveAttribute('inputmode', 'decimal');
    await user.clear(cap);
    await user.type(cap, '7,5');
    await user.tab();
    await waitFor(async () => expect((await db.dayConfigs.get(today()))?.capacityMinutes).toBe(450));
    expect(cap).toHaveValue('7,5');

    await user.clear(cap);
    await user.type(cap, 'abc');
    await user.tab();
    expect(cap).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Введіть число від 0 до 24');
    expect((await db.dayConfigs.get(today()))?.capacityMinutes).toBe(450);

    // − / + крокують по 0,5 год
    await user.click(screen.getByRole('button', { name: "Більше: Об'єм дня" }));
    await waitFor(async () => expect((await db.dayConfigs.get(today()))?.capacityMinutes).toBe(480));
    // «Скинути» повертає до типового
    await user.click(screen.getByRole('button', { name: 'Скинути' }));
    await waitFor(async () => expect((await db.dayConfigs.get(today()))?.capacityMinutes).toBeUndefined());
  });

  it('видалення справи — через нижній лист, а не window.confirm', async () => {
    setViewport(402);
    const confirmSpy = vi.spyOn(window, 'confirm');
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /Готово/ }));
    await screen.findByText(/Для себе за тиждень/);
    act(() => useUi.getState().openDay(today()));

    await user.click(await screen.findByRole('button', { name: /Читання/ }));
    const list = await screen.findByRole('list', { name: 'Справи дня' });
    const row = (await within(list).findByText('Читання')).closest('li')!;
    await user.click(within(row).getByRole('button', { name: /Читання/, expanded: false }));
    await user.click(within(row).getByRole('button', { name: 'Видалити' }));

    const dialog = await screen.findByRole('dialog', { name: /Видалити «Читання»/ });
    await user.click(within(dialog).getByRole('button', { name: 'Видалити' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Справи дня' })).toBeNull());
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
