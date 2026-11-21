import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { db } from '../data/db';
import { useUi } from '../state/uiStore';
import { today, weekStartOf } from '../domain/dates';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  location.hash = '';
  useUi.setState({ screen: 'week', weekStart: weekStartOf(today()), date: today() });
});

describe('сценарій першого тижня', () => {
  it('онбординг заповнює тиждень повторами, тап по чипу додає справу в день', async () => {
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

    const list = await screen.findByRole('list');
    expect(await within(list).findByText('Читання')).toBeInTheDocument();
    // «Читання» — категорія «Відпочинок» типу self → 1 год для себе
    const selfStat = screen.getByText('Для себе').parentElement!;
    expect(selfStat).toHaveTextContent('1 год');
  });
});
