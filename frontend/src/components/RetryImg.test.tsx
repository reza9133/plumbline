import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RetryImg } from './RetryImg';

describe('RetryImg', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks again with a new URL (also inside srcSet) after a failed download, then gives up after 3 tries', () => {
    render(<RetryImg src="/m/a.webp" srcSet="/m/a-sm.webp 336w, /m/a.webp 671w" alt="mascot" />);
    const img = () => screen.getByAltText('mascot') as HTMLImageElement;
    expect(img().getAttribute('src')).toBe('/m/a.webp');

    fireEvent.error(img());
    expect(img().style.opacity).toBe('0'); // no broken-image box while retrying
    act(() => void vi.advanceTimersByTime(800));
    expect(img().getAttribute('src')).toBe('/m/a.webp?r=1');
    expect(img().getAttribute('srcset')).toBe('/m/a-sm.webp?r=1 336w, /m/a.webp?r=1 671w');

    fireEvent.error(img());
    act(() => void vi.advanceTimersByTime(1600));
    fireEvent.error(img());
    act(() => void vi.advanceTimersByTime(2400));
    expect(img().getAttribute('src')).toBe('/m/a.webp?r=3');

    fireEvent.error(img()); // 4th failure: no more retries, the alt text is shown normally
    act(() => void vi.advanceTimersByTime(10_000));
    expect(img().getAttribute('src')).toBe('/m/a.webp?r=3');
    expect(img().style.opacity).toBe('');
  });

  it('shows the image again once a retry loads', () => {
    render(<RetryImg src="/m/a.webp" alt="mascot" />);
    const img = screen.getByAltText('mascot') as HTMLImageElement;
    fireEvent.error(img);
    expect(img.style.opacity).toBe('0');
    fireEvent.load(img);
    expect(img.style.opacity).toBe('');
  });
});
