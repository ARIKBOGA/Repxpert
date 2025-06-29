// playwright-utils.ts
import { Page, Locator, BrowserContext, expect } from '@playwright/test';

export class PlaywrightUtils {
  constructor(private page: Page) {}

  async sleep(seconds: number) {
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  async click(selector: string | Locator, timeout = 10000) {
    await this.page.locator(selector.toString()).click({ timeout });
  }

  async type(selector: string | Locator, text: string, timeout = 10000) {
    const locator = this.page.locator(selector.toString());
    await locator.waitFor({ state: 'visible', timeout });
    await locator.fill(text);
  }

  async waitForVisibility(selector: string | Locator, timeout = 10000) {
    await this.page.locator(selector.toString()).waitFor({ state: 'visible', timeout });
  }

  async waitForClickability(selector: string | Locator, timeout = 10000) {
    const locator = this.page.locator(selector.toString());
    await locator.waitFor({ state: 'visible', timeout });
    await expect(locator).toBeEnabled();
  }

  async isVisible(selector: string | Locator) {
    return await this.page.locator(selector.toString()).isVisible();
  }

  async getText(selector: string | Locator): Promise<string> {
    return await this.page.locator(selector.toString()).innerText();
  }

  async getElementsText(selector: string): Promise<string[]> {
    return await this.page.locator(selector).allInnerTexts();
  }

  async verifyTitle(expectedTitle: string) {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  async verifyUrlContains(expected: string) {
    await expect(this.page).toHaveURL(new RegExp(expected));
  }

  async selectDropdownByText(selector: string, visibleText: string) {
    await this.page.locator(selector).selectOption({ label: visibleText });
  }

  async getDropdownOptions(selector: string): Promise<string[]> {
    const options = this.page.locator(`${selector} option`);
    return await options.allInnerTexts();
  }

  async hover(selector: string | Locator) {
    await this.page.locator(selector.toString()).hover();
  }

  async doubleClick(selector: string | Locator) {
    await this.page.locator(selector.toString()).dblclick();
  }

  async scrollToElement(selector: string | Locator) {
    await this.page.locator(selector.toString()).scrollIntoViewIfNeeded();
  }

  async highlight(selector: string | Locator) {
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (element) {
        const original = element.getAttribute('style');
        element.setAttribute('style', 'background: yellow; border: 2px solid red;');
        setTimeout(() => {
          if (original) element.setAttribute('style', original);
          else element.removeAttribute('style');
        }, 1000);
      }
    }, typeof selector === 'string' ? selector : await selector.evaluate(e => e.tagName));
  }

  async selectCheckbox(selector: string | Locator, check = true) {
    const locator = this.page.locator(selector.toString());
    if ((await locator.isChecked()) !== check) {
      await locator.click();
    }
  }

  async waitForPageToLoad(timeout = 10000) {
    await this.page.waitForLoadState('load', { timeout });
  }

  async executeScript(script: string | Function, ...args: any[]) {
    return await this.page.evaluate(script as any, ...args);
  }

  async switchToWindow(context: BrowserContext, expectedTitle: string) {
    for (const page of context.pages()) {
      if ((await page.title()) === expectedTitle) {
        await page.bringToFront();
        return page;
      }
    }
    throw new Error(`Window with title "${expectedTitle}" not found.`);
  }

  async takeScreenshot(path: string) {
    await this.page.screenshot({ path, fullPage: true });
  }

  async clickWithRetry(selector: string, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.locator(selector).click();
        return;
      } catch {
        await this.sleep(1);
      }
    }
    throw new Error(`Could not click element: ${selector}`);
  }

  async waitForStaleness(selector: string, timeout = 10000) {
    const locator = this.page.locator(selector);
    await expect(locator).toHaveCount(0, { timeout });
  }
}

// Kullanım Örneği (Playwright Test içinde):
// const utils = new PlaywrightUtils(page);
// await utils.click('#login-button');
