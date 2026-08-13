import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RangeSlider } from './RangeSlider.tsx';
import type { Domain, Range } from '../lib/filters.ts';

const domain: Domain = { min: 10, max: 100, hardMax: 500 };

function Harness({
  start = [10, 100],
  onCommit = () => {},
  onChangeSpy,
}: {
  start?: Range;
  onCommit?: (r: Range) => void;
  onChangeSpy?: (r: Range) => void;
}) {
  const [value, setValue] = useState<Range>(start);
  return (
    <RangeSlider
      label="Distance"
      unit="km"
      domain={domain}
      value={value}
      onChange={(r) => {
        onChangeSpy?.(r);
        setValue(r);
      }}
      onCommit={onCommit}
    />
  );
}

describe('RangeSlider', () => {
  it('exposes two labelled range inputs with 5-step and the domain bounds', () => {
    render(<Harness />);
    const min = screen.getByRole('slider', { name: /minimum distance/i });
    const max = screen.getByRole('slider', { name: /maximum distance/i });
    for (const el of [min, max]) {
      expect(el).toHaveAttribute('min', '10');
      expect(el).toHaveAttribute('max', '100');
      expect(el).toHaveAttribute('step', '5');
    }
  });

  it('keeps the handles from crossing (min clamps up to max)', () => {
    const onChangeSpy = vi.fn();
    render(<Harness start={[10, 60]} onChangeSpy={onChangeSpy} />);
    const min = screen.getByRole('slider', { name: /minimum distance/i });
    // drag min past max (to 80) — it must clamp to the max handle (60)
    fireEvent.change(min, { target: { value: '80' } });
    expect(onChangeSpy).toHaveBeenLastCalledWith([60, 60]);
  });

  it('fires onChange live on drag and onCommit only on release', () => {
    const onCommit = vi.fn();
    const onChangeSpy = vi.fn();
    render(<Harness onCommit={onCommit} onChangeSpy={onChangeSpy} />);
    const max = screen.getByRole('slider', { name: /maximum distance/i });
    fireEvent.change(max, { target: { value: '75' } });
    expect(onChangeSpy).toHaveBeenCalledWith([10, 75]);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(max);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('labels the top handle as a bucket ("100+") when outliers are clamped out', () => {
    render(<Harness start={[10, 100]} />);
    expect(screen.getByText('10 – 100+ km')).toBeInTheDocument();
  });

  it('shows a plain max when the handle is below the domain top', () => {
    render(<Harness start={[10, 60]} />);
    expect(screen.getByText('10 – 60 km')).toBeInTheDocument();
  });
});
