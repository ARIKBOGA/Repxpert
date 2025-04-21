// src/utils/extractHelpers.ts
import { Locator } from '@playwright/test';

export async function getTextContent(locator: Locator): Promise<string> {
  try {
    const count = await locator.count();
    if (count > 0) {
      const text = await locator.first().textContent();
      return text?.trim() || '';
    }
    return ''; // Element sayfada yoksa boş dön
  } catch (error) {
    console.error('getTextContent error:', error);
    return '';
  }
}


export async function getMultipleTexts(locator: Locator): Promise<string[]> {
  try {
    const elements = await locator.all();
    const texts = await Promise.all(elements.map(async el => {
      const text = await el.textContent();
      return text?.trim();
    }));
    return Array.from(new Set(texts.filter(Boolean) as string[]));
  } catch {
    return [];
  }
}
