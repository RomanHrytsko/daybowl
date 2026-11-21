import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedSave } from './useDebouncedSave';

afterEach(() => vi.useRealTimers());

describe('useDebouncedSave', () => {
  it('зберігає останнє значення через 400 мс і не зберігає початкове', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { rerender } = renderHook(({ v }) => useDebouncedSave(v, save), { initialProps: { v: 'a' } });
    rerender({ v: 'ab' });
    rerender({ v: 'abc' });
    act(() => vi.advanceTimersByTime(399));
    expect(save).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(save).toHaveBeenCalledExactlyOnceWith('abc');
  });

  it('зберігає одразу, коли сторінку сховано (свайп додому)', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { rerender } = renderHook(({ v }) => useDebouncedSave(v, save), { initialProps: { v: 'a' } });
    rerender({ v: 'Нова назва' });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(save).toHaveBeenCalledExactlyOnceWith('Нова назва');
    act(() => vi.advanceTimersByTime(1000));
    expect(save).toHaveBeenCalledOnce();
  });

  it('flush і демонтаж зберігають незбережене; delay null — без таймера', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { rerender, result, unmount } = renderHook(({ v }) => useDebouncedSave(v, save, null), { initialProps: { v: 1 } });
    rerender({ v: 16 });
    act(() => vi.advanceTimersByTime(5000));
    expect(save).not.toHaveBeenCalled();
    act(() => result.current());
    expect(save).toHaveBeenCalledExactlyOnceWith(16);
    rerender({ v: 8 });
    unmount();
    expect(save).toHaveBeenLastCalledWith(8);
  });
});
