// src/utils/extractHelpers.ts

import { Locator } from '@playwright/test';

/**
 * Tek bir metin değerini güvenli şekilde çeker.
 */
export const getTextContent = async (locator: Locator): Promise<string | undefined> => {
  try {
    const text = await locator.textContent();
    return text?.trim();
  } catch (err) {
    console.warn('Text extract error:', err);
    return undefined;
  }
};

/**
 * Birden fazla öğeden metinleri liste olarak çeker.
 */
export const getMultipleTexts = async (locator: Locator): Promise<string[]> => {
  try {
    const elements = await locator.all();
    const texts = await Promise.all(
      elements.map(async (el) => {
        const text = await el.textContent();
        return text?.trim();
      })
    );
    return Array.from(new Set(texts.filter(Boolean))) as string[];
  } catch (err) {
    console.warn('Multiple text extract error:', err);
    return [];
  }
};
