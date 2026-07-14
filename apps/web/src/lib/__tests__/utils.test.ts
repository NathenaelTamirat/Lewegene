import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible');
  });

  it('removes tailwind class duplicates', () => {
    expect(cn('p-2', 'p-2')).toBe('p-2');
    expect(cn('text-sm text-lg', 'text-sm')).toBe('text-sm');
  });

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('merges tailwind conflicting classes (later wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('m-2 m-4')).toBe('m-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('does not merge non-conflicting tailwind classes', () => {
    expect(cn('p-2', 'm-4')).toBe('p-2 m-4');
    expect(cn('text-sm', 'bg-red-500')).toBe('text-sm bg-red-500');
  });

  it('handles empty input', () => {
    expect(cn()).toBe('');
  });

  it('handles string with mixed types', () => {
    expect(cn('base', undefined, 'extra', null, false && 'nope')).toBe('base extra');
  });
});
