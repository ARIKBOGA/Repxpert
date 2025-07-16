import { Page, Locator, BrowserContext, expect } from '@playwright/test';

// Daha okunaklı olması için timeout seçeneklerini tanımlayabiliriz.
type TimeoutOptions = { timeout?: number };

// PlaywrightUtils sınıfının alabileceği seçenekler
interface PlaywrightUtilsOptions {
  defaultTimeout?: number;
}

// Timeout ayarları için
interface ActionOptions {
  timeout?: number;
  delay?: number; // Özellikle type gibi işlemler için
}

// Click gibi özel seçenekler için
interface ClickOptions extends ActionOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
}

// Type gibi özel seçenekler için
interface TypeOptions extends ActionOptions {
  delay?: number; // Her karakter arası gecikme
}

// Element durumu için (checkElementState gibi fonksiyonlarda kullanılabilir)
enum ElementState {
  Visible = 'visible',
  Hidden = 'hidden',
  Enabled = 'enabled',
  Disabled = 'disabled',
  Checked = 'checked',
  Unchecked = 'unchecked',
}

// Yaygın olarak kullanılan tuşlar
enum KeyboardKey {
  Enter = 'Enter',
  Escape = 'Escape',
  Tab = 'Tab',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  PageUp = 'PageUp',
  PageDown = 'PageDown',
  Home = 'Home',
  End = 'End',
  Delete = 'Delete',
  Backspace = 'Backspace',
  Space = 'Space',
}

// Yaygın olarak kullanılan HTTP metodları (API testlerinde veya network beklemelerinde kullanılabilir)
enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export class PlaywrightUtils {
  private defaultTimeout: number;

  constructor(private page: Page, options?: PlaywrightUtilsOptions) {
    this.defaultTimeout = options?.defaultTimeout || 10000; // Varsayılan 10 saniye
  }

  // Helper function for consistent locator creation
  private getLocator(selector: string | Locator): Locator {
    return typeof selector === 'string' ? this.page.locator(selector) : selector;
  }

  /**
   * Belirtilen süre kadar bekler.
   * @param seconds Beklenecek süre (saniye).
   */
  async sleep(seconds: number): Promise<void> {
    console.log(`Waiting for ${seconds} seconds...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /**
   * Bir elemente tıklar. Timeout belirtilebilir.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async click(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.click({ timeout: options?.timeout || this.defaultTimeout });
      console.log(`Clicked on element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to click on ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir input alanına metin yazar. Timeout belirtilebilir.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param text Yazılacak metin.
   * @param options Timeout seçenekleri.
   */
  async type(selector: string | Locator, text: string, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.waitFor({ state: 'visible', timeout: options?.timeout || this.defaultTimeout });
      await locator.fill(text);
      console.log(`Typed "${text}" into element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to type into ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir elementin görünür olmasını bekler. Timeout belirtilebilir.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async waitForVisibility(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.waitFor({ state: 'visible', timeout: options?.timeout || this.defaultTimeout });
      console.log(`Element became visible: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Element ${typeof selector === 'string' ? selector : 'Locator'} did not become visible within timeout: ${error}`);
    }
  }

  /**
   * Bir elementin tıklanabilir (görünür ve etkin) olmasını bekler. Timeout belirtilebilir.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async waitForClickability(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.waitFor({ state: 'visible', timeout: options?.timeout || this.defaultTimeout });
      await expect(locator).toBeEnabled({ timeout: options?.timeout || this.defaultTimeout });
      console.log(`Element became clickable: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Element ${typeof selector === 'string' ? selector : 'Locator'} did not become clickable within timeout: ${error}`);
    }
  }

  /**
   * Bir elementin görünür olup olmadığını kontrol eder.
   * @param selector CSS seçici veya Locator nesnesi.
   * @returns Element görünürse true, değilse false.
   */
  async isVisible(selector: string | Locator): Promise<boolean> {
    const locator = this.getLocator(selector);
    return await locator.isVisible();
  }

  /**
   * Bir elementin metnini alır.
   * @param selector CSS seçici veya Locator nesnesi.
   * @returns Elementin metni.
   */
  async getText(selector: string | Locator): Promise<string> {
    const locator = this.getLocator(selector);
    return await locator.innerText();
  }

  /**
   * Bir seçiciye uyan tüm elementlerin metinlerini bir dizi olarak alır.
   * @param selector CSS seçici.
   * @returns Elementlerin metinlerini içeren bir dizi.
   */
  async getElementsText(selector: string): Promise<string[]> {
    return await this.page.locator(selector).allInnerTexts();
  }

  /**
   * Sayfanın başlığını beklenen başlık ile doğrular.
   * @param expectedTitle Beklenen sayfa başlığı.
   * @param options Timeout seçenekleri.
   */
  async verifyTitle(expectedTitle: string, options?: TimeoutOptions): Promise<void> {
    try {
      await expect(this.page).toHaveTitle(expectedTitle, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`Page title verified: "${expectedTitle}"`);
    } catch (error) {
      throw new Error(`Page title verification failed. Expected "${expectedTitle}": ${error}`);
    }
  }

  /**
   * Sayfanın URL'sinin beklenen bir alt dizeyi içerip içermediğini doğrular.
   * @param expected URL'de olması beklenen alt dize veya RegExp.
   * @param options Timeout seçenekleri.
   */
  async verifyUrlContains(expected: string | RegExp, options?: TimeoutOptions): Promise<void> {
    try {
      const regex = typeof expected === 'string' ? new RegExp(expected) : expected;
      await expect(this.page).toHaveURL(regex, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`Page URL verified to contain: ${expected}`);
    } catch (error) {
      throw new Error(`URL verification failed. Expected URL to contain "${expected}": ${error}`);
    }
  }

  /**
   * Dropdown menüden görünen metne göre bir seçenek seçer.
   * @param selector CSS seçici.
   * @param visibleText Seçilecek seçeneğin görünen metni.
   * @param options Timeout seçenekleri.
   */
  async selectDropdownByText(selector: string, visibleText: string, options?: TimeoutOptions): Promise<void> {
    try {
      await this.page.locator(selector).selectOption({ label: visibleText }, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`Selected "${visibleText}" from dropdown: ${selector}`);
    } catch (error) {
      throw new Error(`Failed to select "${visibleText}" from dropdown ${selector}: ${error}`);
    }
  }

  /**
   * Bir dropdown menünün tüm seçeneklerinin metinlerini alır.
   * @param selector CSS seçici.
   * @returns Seçeneklerin metinlerini içeren bir dizi.
   */
  async getDropdownOptions(selector: string): Promise<string[]> {
    const options = this.page.locator(`${selector} option`);
    return await options.allInnerTexts();
  }

  /**
   * Bir elementin üzerine fare imlecini getirir (hover).
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async hover(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.hover({ timeout: options?.timeout || this.defaultTimeout });
      console.log(`Hovered over element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to hover over ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir elemente çift tıklar.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async doubleClick(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.dblclick({ timeout: options?.timeout || this.defaultTimeout });
      console.log(`Double clicked on element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to double click on ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir elemente kadar scroll yapar.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async scrollToElement(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.scrollIntoViewIfNeeded({ timeout: options?.timeout || this.defaultTimeout });
      console.log(`Scrolled to element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to scroll to ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir elementi kısa süreliğine vurgular (highlight). Hata ayıklama için kullanışlıdır.
   * @param selector CSS seçici veya Locator nesnesi.
   */
  async highlight(selector: string | Locator): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.evaluate((element) => {
        const originalStyle = element.getAttribute('style');
        element.setAttribute('style', 'background: yellow; border: 2px solid red;');
        setTimeout(() => {
          if (originalStyle) {
            element.setAttribute('style', originalStyle);
          } else {
            element.removeAttribute('style');
          }
        }, 1000);
      });
      console.log(`Highlighted element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      console.warn(`Could not highlight element ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir checkbox'ı işaretler veya işaretini kaldırır.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param check İşaretlemek için true, işaretini kaldırmak için false. Varsayılan true.
   * @param options Timeout seçenekleri.
   */
  async selectCheckbox(selector: string | Locator, check = true, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      if ((await locator.isChecked({ timeout: options?.timeout || this.defaultTimeout })) !== check) {
        await locator.click({ timeout: options?.timeout || this.defaultTimeout });
        console.log(`${check ? 'Checked' : 'Unchecked'} checkbox: ${typeof selector === 'string' ? selector : 'Locator'}`);
      } else {
        console.log(`Checkbox is already ${check ? 'checked' : 'unchecked'}: ${typeof selector === 'string' ? selector : 'Locator'}`);
      }
    } catch (error) {
      throw new Error(`Failed to select checkbox ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Sayfanın tamamen yüklenmesini bekler.
   * @param options Timeout seçenekleri.
   */
  async waitForPageToLoad(options?: TimeoutOptions): Promise<void> {
    try {
      await this.page.waitForLoadState('load', { timeout: options?.timeout || this.defaultTimeout });
      console.log('Page fully loaded.');
    } catch (error) {
      throw new Error(`Page did not load within timeout: ${error}`);
    }
  }

  /**
   * Sayfada bir JavaScript kodu çalıştırır.
   * @param script Çalıştırılacak fonksiyon veya kod dizesi.
   * @param args Kod için argümanlar.
   * @returns JavaScript kodunun dönüş değeri.
   */
  async executeScript<T>(script: string | Function, ...args: any[]): Promise<T> {
    try {
      const result = await this.page.evaluate(script as any, ...args);
      console.log('JavaScript executed successfully.');
      return result as T;
    } catch (error) {
      throw new Error(`Failed to execute script: ${error}`);
    }
  }

  /**
   * Başlık ile yeni bir pencereye geçer.
   * @param context Browser bağlamı.
   * @param expectedTitle Beklenen pencere başlığı.
   * @returns Geçilen Page nesnesi.
   */
  async switchToWindow(context: BrowserContext, expectedTitle: string): Promise<Page> {
    // Tüm mevcut sayfaları kontrol et
    for (const page of context.pages()) {
      if (await page.title() === expectedTitle) {
        await page.bringToFront();
        console.log(`Switched to window with title: "${expectedTitle}"`);
        return page;
      }
    }

    // Yeni bir sayfa açılmasını bekle
    const newPagePromise = context.waitForEvent('page');
    const newPage = await newPagePromise;
    await newPage.waitForLoadState(); // Yeni sayfanın yüklenmesini bekle

    if (await newPage.title() === expectedTitle) {
      await newPage.bringToFront();
      console.log(`Switched to newly opened window with title: "${expectedTitle}"`);
      return newPage;
    }

    throw new Error(`Window with title "${expectedTitle}" not found after checking existing and new pages.`);
  }

  /**
   * Ekran görüntüsü alır.
   * @param path Kaydedilecek dosya yolu.
   * @param fullPage Tüm sayfanın mı yoksa sadece görünür kısmın mı alınacağını belirtir. Varsayılan true.
   */
  async takeScreenshot(path: string, fullPage: boolean = true): Promise<void> {
    try {
      await this.page.screenshot({ path, fullPage });
      console.log(`Screenshot saved to: ${path}`);
    } catch (error) {
      throw new Error(`Failed to take screenshot to ${path}: ${error}`);
    }
  }

  /**
   * Bir elemente belirli sayıda tekrar deneyerek tıklar.
   * @param selector CSS seçici.
   * @param retries Deneme sayısı. Varsayılan 5.
   * @param intervalBetweenRetries Yeniden denemeler arası bekleme süresi (saniye). Varsayılan 1 saniye.
   */
  async clickWithRetry(selector: string, retries = 5, intervalBetweenRetries = 1): Promise<void> {
    const locator = this.getLocator(selector);
    for (let i = 0; i < retries; i++) {
      try {
        await locator.click({ timeout: this.defaultTimeout });
        console.log(`Clicked on element with retry: ${selector}`);
        return;
      } catch (error) {
        console.warn(`Attempt ${i + 1}/${retries} failed to click ${selector}. Retrying...`);
        await this.sleep(intervalBetweenRetries);
      }
    }
    throw new Error(`Could not click element: ${selector} after ${retries} retries.`);
  }

  /**
   * Bir elementin DOM'dan kaldırılmasını (staleness) veya count'unun 0 olmasını bekler.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async waitForStaleness(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await expect(locator).toHaveCount(0, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`Element became stale: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Element ${typeof selector === 'string' ? selector : 'Locator'} did not become stale within timeout: ${error}`);
    }
  }

  /**
   * Bir elementin görünmez olmasını bekler.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async waitForHidden(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.waitFor({ state: 'hidden', timeout: options?.timeout || this.defaultTimeout });
      console.log(`Element became hidden: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Element ${typeof selector === 'string' ? selector : 'Locator'} did not become hidden within timeout: ${error}`);
    }
  }

  /**
   * Bir elementin metninin beklenen değeri içerdiğini doğrular.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param expectedText Beklenen metin (alt dize).
   * @param options Timeout seçenekleri.
   */
  async verifyTextContains(selector: string | Locator, expectedText: string, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await expect(locator).toContainText(expectedText, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`Text "${expectedText}" verified in element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Element ${typeof selector === 'string' ? selector : 'Locator'} does not contain text "${expectedText}": ${error}`);
    }
  }

  /**
   * Bir elementin belirli bir attribute değerine sahip olduğunu doğrular.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param attributeName Doğrulanacak attribute'un adı.
   * @param expectedValue Beklenen attribute değeri.
   * @param options Timeout seçenekleri.
   */
  async verifyAttribute(selector: string | Locator, attributeName: string, expectedValue: string, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await expect(locator).toHaveAttribute(attributeName, expectedValue, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`Attribute "${attributeName}" of element ${typeof selector === 'string' ? selector : 'Locator'} verified as "${expectedValue}"`);
    } catch (error) {
      throw new Error(`Element ${typeof selector === 'string' ? selector : 'Locator'} does not have attribute "${attributeName}" with value "${expectedValue}": ${error}`);
    }
  }

  /**
   * Klavyeden bir tuşa basar.
   * @param key Basılacak tuş (örneğin 'Enter', 'Escape', 'ArrowDown').
   */
  async pressKey(key: string): Promise<void> {
    try {
      await this.page.keyboard.press(key);
      console.log(`Pressed key: ${key}`);
    } catch (error) {
      throw new Error(`Failed to press key "${key}": ${error}`);
    }
  }

  /**
   * Klavyeden belirli bir metni yazar.
   * @param text Yazılacak metin.
   * @param delay Yazılan her karakter arasındaki gecikme (ms).
   */
  async keyboardType(text: string, delay?: number): Promise<void> {
    try {
      await this.page.keyboard.type(text, { delay });
      console.log(`Typed text via keyboard: "${text}"`);
    } catch (error) {
      throw new Error(`Failed to type text "${text}" via keyboard: ${error}`);
    }
  }

  /**
   * Bir dosya yükler.
   * @param selector Dosya inputu seçicisi.
   * @param filePath Yüklenecek dosyanın yolu.
   */
  async uploadFile(selector: string | Locator, filePath: string): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.setInputFiles(filePath);
      console.log(`Uploaded file "${filePath}" to element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to upload file "${filePath}" to ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Birden fazla dosya yükler.
   * @param selector Dosya inputu seçicisi.
   * @param filePaths Yüklenecek dosya yollarının dizisi.
   */
  async uploadMultipleFiles(selector: string | Locator, filePaths: string[]): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.setInputFiles(filePaths);
      console.log(`Uploaded files [${filePaths.join(', ')}] to element: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to upload multiple files to ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir elementin screenshot'ını alır.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param path Kaydedilecek dosya yolu.
   */
  async takeElementScreenshot(selector: string | Locator, path: string): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.screenshot({ path });
      console.log(`Element screenshot saved to: ${path}`);
    } catch (error) {
      throw new Error(`Failed to take element screenshot of ${typeof selector === 'string' ? selector : 'Locator'} to ${path}: ${error}`);
    }
  }

  /**
   * Yeni bir tab açar ve o tab'a geçer.
   * @param url Yeni tab'ın açılacağı URL.
   * @returns Yeni açılan Page nesnesi.
   */
  async openNewTab(url?: string): Promise<Page> {
    const newPage = await this.page.context().newPage();
    if (url) {
      await newPage.goto(url);
    }
    await newPage.bringToFront();
    console.log(`Opened new tab and navigated to ${url || 'blank page'}`);
    return newPage;
  }

  /**
  * Bir elementin metninin değişmesini bekler.
  * @param selector CSS seçici veya Locator nesnesi.
  * @param initialText Beklenen ilk metin.
  * @param options Timeout seçenekleri.
  */
  async waitForTextChange(selector: string | Locator, initialText: string, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await expect(locator).not.toHaveText(initialText, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`Text of element ${typeof selector === 'string' ? selector : 'Locator'} changed from "${initialText}"`);
    } catch (error) {
      throw new Error(`Text of element ${typeof selector === 'string' ? selector : 'Locator'} did not change from "${initialText}" within timeout: ${error}`);
    }
  }

  /**
   * Sürükle ve bırak işlemi gerçekleştirir.
   * @param sourceSelector Sürüklenecek elementin seçicisi veya Locator nesnesi.
   * @param targetSelector Bırakılacak elementin seçicisi veya Locator nesnesi.
   */
  async dragAndDrop(sourceSelector: string | Locator, targetSelector: string | Locator): Promise<void> {
    const sourceLocator = this.getLocator(sourceSelector);
    const targetLocator = this.getLocator(targetSelector);
    try {
      await sourceLocator.dragTo(targetLocator, { timeout: this.defaultTimeout });
      console.log(`Dragged element ${typeof sourceSelector === 'string' ? sourceSelector : 'Locator'} to ${typeof targetSelector === 'string' ? targetSelector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to drag and drop from ${typeof sourceSelector === 'string' ? sourceSelector : 'Locator'} to ${typeof targetSelector === 'string' ? targetSelector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir input alanının içeriğini temizler.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param options Timeout seçenekleri.
   */
  async clearInputField(selector: string | Locator, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await locator.clear({ timeout: options?.timeout || this.defaultTimeout });
      console.log(`Cleared input field: ${typeof selector === 'string' ? selector : 'Locator'}`);
    } catch (error) {
      throw new Error(`Failed to clear input field ${typeof selector === 'string' ? selector : 'Locator'}: ${error}`);
    }
  }

  /**
   * Bir elementin belirli bir duruma (görünür, gizli, etkin, devre dışı vb.) sahip olup olmadığını doğrular.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param state Beklenen element durumu (ElementState enum'ından).
   * @param options Timeout seçenekleri.
   */
  async checkElementState(selector: string | Locator, state: ElementState, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      switch (state) {
        case ElementState.Visible:
          await expect(locator).toBeVisible({ timeout: options?.timeout || this.defaultTimeout });
          break;
        case ElementState.Hidden:
          await expect(locator).toBeHidden({ timeout: options?.timeout || this.defaultTimeout });
          break;
        case ElementState.Enabled:
          await expect(locator).toBeEnabled({ timeout: options?.timeout || this.defaultTimeout });
          break;
        case ElementState.Disabled:
          await expect(locator).toBeDisabled({ timeout: options?.timeout || this.defaultTimeout });
          break;
        case ElementState.Checked:
          await expect(locator).toBeChecked({ timeout: options?.timeout || this.defaultTimeout });
          break;
        case ElementState.Unchecked:
          await expect(locator).not.toBeChecked({ timeout: options?.timeout || this.defaultTimeout });
          break;
        default:
          throw new Error(`Unknown element state: ${state}`);
      }
      console.log(`Element ${typeof selector === 'string' ? selector : 'Locator'} is in state: ${state}`);
    } catch (error) {
      throw new Error(`Element ${typeof selector === 'string' ? selector : 'Locator'} is NOT in expected state "${state}": ${error}`);
    }
  }

  /**
   * Bir çoklu seçim dropdown'ından birden fazla değer seçer.
   * @param selector Çoklu seçim dropdown'ının seçicisi.
   * @param values Seçilecek değerlerin dizisi.
   * @param options Timeout seçenekleri.
   */
  async selectMultipleOptions(selector: string, values: string[], options?: TimeoutOptions): Promise<void> {
    try {
      await this.page.locator(selector).selectOption(values, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`Selected multiple options [${values.join(', ')}] from dropdown: ${selector}`);
    } catch (error) {
      throw new Error(`Failed to select multiple options from dropdown ${selector}: ${error}`);
    }
  }

  /**
   * Ağ isteklerinin durmasını (network idle) bekler. Özellikle sayfa yüklendikten sonra dinamik içeriklerin tamamen yüklenmesini beklemek için kullanışlıdır.
   * @param options Timeout seçenekleri.
   */
  async waitForNetworkIdle(options?: TimeoutOptions): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout: options?.timeout || this.defaultTimeout });
      console.log('Network became idle.');
    } catch (error) {
      throw new Error(`Network did not become idle within timeout: ${error}`);
    }
  }

  /**
   * Tarayıcıda geri gider.
   * @param options Timeout seçenekleri.
   */
  async goBack(options?: TimeoutOptions): Promise<void> {
    try {
      await this.page.goBack({ timeout: options?.timeout || this.defaultTimeout });
      console.log('Navigated back.');
    } catch (error) {
      throw new Error(`Failed to go back: ${error}`);
    }
  }

  /**
   * Tarayıcıda ileri gider.
   * @param options Timeout seçenekleri.
   */
  async goForward(options?: TimeoutOptions): Promise<void> {
    try {
      await this.page.goForward({ timeout: options?.timeout || this.defaultTimeout });
      console.log('Navigated forward.');
    } catch (error) {
      throw new Error(`Failed to go forward: ${error}`);
    }
  }

  /**
   * Sayfayı yeniden yükler.
   * @param options Timeout seçenekleri.
   */
  async reload(options?: TimeoutOptions): Promise<void> {
    try {
      await this.page.reload({ timeout: options?.timeout || this.defaultTimeout });
      console.log('Page reloaded.');
    } catch (error) {
      throw new Error(`Failed to reload page: ${error}`);
    }
  }

  /**
   * Local Storage'a bir öğe ekler veya günceller.
   * @param key Öğenin anahtarı.
   * @param value Öğenin değeri.
   */
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    try {
      await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
      console.log(`Set localStorage item: ${key} = ${value}`);
    } catch (error) {
      throw new Error(`Failed to set localStorage item "${key}": ${error}`);
    }
  }

  /**
   * Local Storage'dan bir öğenin değerini alır.
   * @param key Öğenin anahtarı.
   * @returns Öğenin değeri.
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    try {
      const value = await this.page.evaluate((k) => localStorage.getItem(k), key);
      console.log(`Got localStorage item: ${key} = ${value}`);
      return value;
    } catch (error) {
      throw new Error(`Failed to get localStorage item "${key}": ${error}`);
    }
  }

  /**
   * Session Storage'a bir öğe ekler veya günceller.
   * @param key Öğenin anahtarı.
   * @param value Öğenin değeri.
   */
  async setSessionStorageItem(key: string, value: string): Promise<void> {
    try {
      await this.page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [key, value]);
      console.log(`Set sessionStorage item: ${key} = ${value}`);
    } catch (error) {
      throw new Error(`Failed to set sessionStorage item "${key}": ${error}`);
    }
  }

  /**
   * Session Storage'dan bir öğenin değerini alır.
   * @param key Öğenin anahtarı.
   * @returns Öğenin değeri.
   */
  async getSessionStorageItem(key: string): Promise<string | null> {
    try {
      const value = await this.page.evaluate((k) => sessionStorage.getItem(k), key);
      console.log(`Got sessionStorage item: ${key} = ${value}`);
      return value;
    } catch (error) {
      throw new Error(`Failed to get sessionStorage item "${key}": ${error}`);
    }
  }

  /**
   * Tarayıcıdaki tüm çerezleri temizler.
   */
  async clearCookies(): Promise<void> {
    try {
      await this.page.context().clearCookies();
      console.log('All cookies cleared.');
    } catch (error) {
      throw new Error(`Failed to clear cookies: ${error}`);
    }
  }

  /**
   * Belirli bir API çağrısının yanıtını bekler.
   * @param urlOrPredicate Beklenecek URL (string veya RegExp) veya bir Request nesnesini alan predicate fonksiyonu.
   * @param options Timeout seçenekleri ve HTTP metodu filtrelemesi.
   * @returns Gelen Response nesnesi.
   */
  async waitForResponse(urlOrPredicate: string | RegExp | ((request: any) => boolean), options?: { timeout?: number, method?: HttpMethod }): Promise<any> {
    try {
      const response = await this.page.waitForResponse(
        (response) => {
          const matchesUrl = typeof urlOrPredicate === 'string'
            ? response.url().includes(urlOrPredicate)
            : urlOrPredicate instanceof RegExp
              ? urlOrPredicate.test(response.url())
              : urlOrPredicate(response); // If it's a predicate function
          const matchesMethod = options?.method ? response.request().method() === options.method : true;
          return matchesUrl && matchesMethod;
        },
        { timeout: options?.timeout || this.defaultTimeout }
      );
      console.log(`Response for URL matching "${urlOrPredicate}" (method: ${options?.method || 'any'}) received.`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get response for "${urlOrPredicate}" (method: ${options?.method || 'any'}) within timeout: ${error}`);
    }
  }

  /**
   * Klavyeden metni karakter karakter yazar.
   * @param text Yazılacak metin.
   * @param delay Her karakter arası gecikme (ms). Varsayılan 0.
   */
  async pressSequentially(text: string, delay: number = 0): Promise<void> {
    try {
      await this.page.keyboard.type(text, { delay });
      console.log(`Typed text sequentially: "${text}"`);
    } catch (error) {
      throw new Error(`Failed to type text sequentially "${text}": ${error}`);
    }
  }

  /**
   * Locator kullanarak elementleri test ID'sine göre bulur.
   * @param testId Elementin data-testid attribute değeri.
   * @returns Bulunan Locator nesnesi.
   */
  getByTestId(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  /**
   * Bir elementin belirli bir CSS özelliğinin beklenen bir değere sahip olduğunu doğrular.
   * @param selector CSS seçici veya Locator nesnesi.
   * @param cssProperty Doğrulanacak CSS özelliği adı (örneğin 'background-color').
   * @param expectedValue Beklenen CSS özelliği değeri.
   * @param options Timeout seçenekleri.
   */
  async verifyCssProperty(selector: string | Locator, cssProperty: string, expectedValue: string, options?: TimeoutOptions): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      await expect(locator).toHaveCSS(cssProperty, expectedValue, { timeout: options?.timeout || this.defaultTimeout });
      console.log(`CSS property "${cssProperty}" of element ${typeof selector === 'string' ? selector : 'Locator'} verified as "${expectedValue}"`);
    } catch (error) {
      throw new Error(`Element ${typeof selector === 'string' ? selector : 'Locator'} does not have CSS property "${cssProperty}" with value "${expectedValue}": ${error}`);
    }
  }

}




// Kullanım Örneği (Playwright Test içinde):
// const utils = new PlaywrightUtils(page);
// await utils.click('#login-button');
