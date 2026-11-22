import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateChips } from './TemplateChips';
import { useUi } from '../../state/uiStore';
import { cat, tpl } from '../../test/factories';

const sport = cat({ name: 'Спорт', color: '#34B27B', order: 0 });
const rest = cat({ name: 'Відпочинок', color: '#F2A93B', order: 1 });
const templates = [
  tpl({ title: 'Тренування', categoryId: sport.id }),
  tpl({ title: 'Прогулянка', categoryId: sport.id, defaultMinutes: 30 }),
  tpl({ title: 'Читання', categoryId: rest.id }),
];

function setup(onPick = vi.fn(), onCustom = vi.fn()) {
  const user = userEvent.setup();
  const view = render(<TemplateChips templates={templates} categories={[sport, rest]} onPick={onPick} onCustom={onCustom} />);
  return { user, onPick, onCustom, unmount: view.unmount };
}

const header = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

beforeEach(() => useUi.setState({ openTemplateGroups: [] }));

describe('TemplateChips: розкривні групи за категоріями', () => {
  it('показує по заголовку на категорію з кількістю шаблонів, усі згорнуті', () => {
    setup();
    const list = screen.getByRole('list', { name: 'Шаблони за категоріями' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Спорт');
    expect(items[1]).toHaveTextContent('Відпочинок');

    expect(header('Спорт')).toHaveAttribute('aria-expanded', 'false');
    expect(within(header('Спорт')).getByLabelText('шаблонів: 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Тренування/ })).not.toBeInTheDocument();
  });

  it('тап по заголовку розгортає лише цю категорію, повторний — згортає', async () => {
    const { user } = setup();
    await user.click(header('Спорт'));

    expect(header('Спорт')).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(header('Спорт').getAttribute('aria-controls')!)!;
    expect(within(panel).getByRole('button', { name: /Тренування/ })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /Прогулянка.*S/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Читання/ })).not.toBeInTheDocument();

    await user.click(header('Спорт'));
    expect(header('Спорт')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /Тренування/ })).not.toBeInTheDocument();
  });

  it('можна розгорнути кілька категорій одночасно', async () => {
    const { user } = setup();
    await user.click(header('Спорт'));
    await user.click(header('Відпочинок'));
    expect(screen.getByRole('button', { name: /Тренування/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Читання/ })).toBeInTheDocument();
  });

  it('тап по чипу всередині групи додає справу і не згортає групу', async () => {
    const { user, onPick } = setup();
    await user.click(header('Відпочинок'));
    await user.click(screen.getByRole('button', { name: /Читання/ }));
    expect(onPick).toHaveBeenCalledWith(templates[2]);
    expect(header('Відпочинок')).toHaveAttribute('aria-expanded', 'true');
  });

  it('стан розгортання зберігається після перемонтування (перехід між днями)', async () => {
    const { user, unmount } = setup();
    await user.click(header('Спорт'));
    unmount();
    render(<TemplateChips templates={templates} categories={[sport, rest]} onPick={vi.fn()} onCustom={vi.fn()} />);
    expect(header('Спорт')).toHaveAttribute('aria-expanded', 'true');
  });

  it('«Своя справа» лишається доступною поза групами', async () => {
    const { user, onCustom } = setup();
    await user.click(screen.getByRole('button', { name: /Своя справа/ }));
    await user.type(screen.getByRole('textbox', { name: 'Назва' }), 'Йога');
    await user.click(screen.getByRole('button', { name: 'Додати' }));
    expect(onCustom).toHaveBeenCalledWith({ title: 'Йога', categoryId: sport.id, minutes: 60 });
  });

  it('без шаблонів список груп не рендериться', () => {
    render(<TemplateChips templates={[]} categories={[sport]} onPick={vi.fn()} onCustom={vi.fn()} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Своя справа/ })).toBeInTheDocument();
  });
});
