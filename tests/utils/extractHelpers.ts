// src/utils/extractHelpers.ts
import { Locator } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

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


const retryFilePath = path.resolve(__dirname, '../../data/willBefixed/reTry.json');

// Add OE to the retry list
export function addToRetryList(oe: string) {
  let currentList: string[] = [];

  if (fs.existsSync(retryFilePath)) {
    currentList = JSON.parse(fs.readFileSync(retryFilePath, 'utf-8'));
  }

  if (!currentList.includes(oe)) {
    currentList.push(oe);
    fs.writeFileSync(retryFilePath, JSON.stringify(currentList, null, 2), 'utf-8');
    console.log(`➕ ${oe} reTry listesine eklendi.`);
  }
}
