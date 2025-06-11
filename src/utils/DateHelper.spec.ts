import { test, expect } from '@playwright/test';
import { getCurrentDateString } from './DateHelper';

test.describe('DateHelper', () => {
  test('should return today\'s date in YYYY-MM-DD format', () => {
    const date = getCurrentDateString();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
