// src/utils/extractHelpers.ts
import { Locator, Page } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';
import { Locale } from 'locale-enum';

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


const retryFilePath = path.resolve(__dirname, '../data/willBefixed/reTry.json');

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

export async function getDimensionValuesSmart(page: Page, labelKeywords: string[]): Promise<string[]> {
  // XPath ile tüm eşleşen dt'leri al
  const xpathQuery = labelKeywords
    .map(keyword => `contains(., "${keyword}")`)
    .join(' or ');

  const dtLocator = page.locator(`xpath=//dt[${xpathQuery}]`);
  const count = await dtLocator.count();

  const values: string[] = [];
  for (let i = 0; i < count; i++) {
    const dt = dtLocator.nth(i);
    const dd = dt.locator('xpath=following-sibling::dd[1]/span');
    let texts = await dd.allTextContents();
    texts = texts.map(text => text.trim());
    const text = texts.join(', ');
    if (text) {
      values.push(text);
    }
  }

  return values;
}

export function extractYears(madeYear: string, locale: Locale): { start: string; end: string } {
  madeYear = madeYear.trim();

  // 1. RepXpert - Tam aralık: "06.2009 - 12.2012"
  const repxpertFullMatch = madeYear.match(/(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{4})/);
  if (repxpertFullMatch) {
    return {
      start: repxpertFullMatch[2].slice(-2),
      end: repxpertFullMatch[4].slice(-2),
    };
  }

  // 2. JNBK - Tam aralık: "04.16~11.20"
  const jnbkFullMatch = madeYear.match(/(\d{2})\.(\d{2})~(\d{2})\.(\d{2})/);
  if (jnbkFullMatch) {
    return {
      start: jnbkFullMatch[2], // Zaten son iki hane
      end: jnbkFullMatch[4],   // Zaten son iki hane
    };
  }

  // 3. JNBK - Bitiş yılı belirtilmiş: "~11.20"
  const jnbkEndMatch = madeYear.match(/~?(\d{2})\.(\d{2})$/); // "~" ile başlayabilir veya başlamayabilir
  if (jnbkEndMatch && madeYear.startsWith("~")) { // Sadece "~" ile başlayanları yakala
    return {
      start: "",
      end: jnbkEndMatch[2], // Zaten son iki hane
    };
  }

  // 4. JNBK - Başlangıç yılı belirtilmiş: "04.16~"
  const jnbkStartMatch = madeYear.match(/^(\d{2})\.(\d{2})~$/);
  if (jnbkStartMatch) {
    return {
      start: jnbkStartMatch[2], // Zaten son iki hane
      end: "",
    };
  }

  // 5. RepXpert / Diğer kaynaklar - Başlangıç/Bitiş kelimeleri ile
  let startMatch, endMatch;
  if (locale === Locale.tr_TR) {
    startMatch = madeYear.match(/başlangıç\s+(\d{2})\.(\d{4})/i);
    endMatch = madeYear.match(/bitiş\s+(\d{2})\.(\d{4})/i);
  } else if (locale === Locale.en_US) {
    startMatch = madeYear.match(/from\s+(\d{2})\.(\d{4})/i);
    endMatch = madeYear.match(/to\s+(\d{2})\.(\d{4})/i);
  }

  if (startMatch) {
    return { start: startMatch[2].slice(-2), end: "" };
  }

  if (endMatch) {
    return { start: "", end: endMatch[2].slice(-2) };
  }

  // 6. Sadece dört haneli yıl: "2009" veya "09" (güvenlik için)
  const singleYearMatch = madeYear.match(/^(\d{2}|\d{4})$/);
  if (singleYearMatch) {
    return {
      start: singleYearMatch[1].slice(-2),
      end: singleYearMatch[1].slice(-2)
    };
  }

  // Hiçbir eşleşme yoksa
  return { start: "", end: "" };
}

const matchLogFile = path.join("src/data/katalogInfo/jsons", "modelMatchPool.json");

type ModelMatch = {
  original: string;
  normalized: string;
  model_id: number;
  marka_id: number;
};

export function logMatchedModel(entry: ModelMatch) {
  let existing: ModelMatch[] = [];

  if (fs.existsSync(matchLogFile)) {
    existing = JSON.parse(fs.readFileSync(matchLogFile, "utf8"));
  }

  const isDuplicate = existing.some(
    (item) =>
      item.normalized.toLowerCase() === entry.normalized.toLowerCase() &&
      item.model_id === entry.model_id
  );

  if (!isDuplicate) {
    existing.push(entry);
    fs.writeFileSync(matchLogFile, JSON.stringify(existing, null, 2), "utf8");
    console.log("✔️ Model havuzuna eklendi:", entry.normalized);
  } else {
    //console.log("⚠️ Zaten havuzda var, atlandı:", entry.normalized);
  }
}