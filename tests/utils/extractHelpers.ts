// src/utils/extractHelpers.ts
import { Locator } from '@playwright/test';

export async function getTextContent(locator: Locator): Promise<string | undefined> {
  try {
    const content = await locator.textContent();
    return content?.trim();
  } catch {
    return undefined;
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
