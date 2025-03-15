import * as dotenv from "dotenv";
import {
  Browser,
  ElementHandle,
  NodeFor,
  Page,
  WaitForOptions,
} from "puppeteer-core";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteerExtra.use(StealthPlugin());

dotenv.config();

export interface ScraperStatus {
  isRunning: boolean;
  isFinished: boolean;
  currentPageNo: number;
  totalPages: number;
}

export abstract class BaseScraperService {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected isRunning: boolean = false;
  protected isFinished: boolean = false;
  protected currentPageNo: number = 0;
  protected totalPages: number = 0;
  protected crawledCount: number = 0;
  protected timeout: number = 20000;

  protected readonly isHeadless: boolean =
    process.env.IS_HEADLESS == null ? true : process.env.IS_HEADLESS === "true";

  public getCurrentStatus(): ScraperStatus {
    return {
      isRunning: this.isRunning,
      isFinished: this.isFinished,
      currentPageNo: this.currentPageNo,
      totalPages: this.totalPages,
    };
  }

  protected async openBrowser(): Promise<void> {
    this.browser = await puppeteerExtra.launch({
      headless: this.isHeadless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      executablePath: process.env.CHROME_BIN,
    });
    this.page = await this.browser!.newPage();

    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });
  }

  protected async configurePage(options?: {
    width?: number;
    height?: number;
    isMobile?: boolean;
    timeout?: number;
    jsEnabled?: boolean;
  }): Promise<void> {
    if (!this.page) throw new Error("Browser page not initialized");

    await this.page.setViewport({
      width: options?.width || 1024,
      height: options?.height || 768,
      deviceScaleFactor: 1,
      isMobile: options?.isMobile || false,
    });

    await this.page.setDefaultNavigationTimeout(options?.timeout || 90000);
    await this.page.setJavaScriptEnabled(options?.jsEnabled ?? true);
  }

  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  protected async navigateToPage(
    url: string,
    waitUntil: WaitForOptions["waitUntil"] = "networkidle2"
  ): Promise<void> {
    if (!this.page) throw new Error("Browser page not initialized");
    await this.page.goto(url, { waitUntil });
  }

  protected async waitForSelector(selector: string): Promise<void> {
    if (!this.page) throw new Error("Browser page not initialized");
    await this.page.waitForSelector(selector);
  }

  protected async evaluateOnPage<T>(
    fn: (selector: string) => T,
    selector: string
  ): Promise<T> {
    if (!this.page) throw new Error("Browser page not initialized");
    return await this.page.evaluate(fn, selector);
  }

  protected async waitSelector(
    selector: string,
    timeout?: number
  ): Promise<ElementHandle<NodeFor<string>>> {
    if (!this.page) throw new Error("Browser page not initialized");
    return (await this.page.waitForSelector(selector, {
      ...(timeout ? { timeout } : {}),
    })) as ElementHandle<NodeFor<string>>;
  }

  protected async findFirstElement(
    selector: string,
    timeout = this.timeout
  ): Promise<ElementHandle<NodeFor<string>>> {
    return await this.waitSelector(selector, timeout);
  }

  protected async findElements(
    selector: string
  ): Promise<Array<ElementHandle<NodeFor<string>>>> {
    if (!this.page) throw new Error("Browser page not initialized");
    return await this.page.$$(selector);
  }

  protected async findChildElement(
    element: ElementHandle,
    selector: string
  ): Promise<ElementHandle<NodeFor<string>>> {
    return (await element.$(selector)) as ElementHandle<NodeFor<string>>;
  }

  protected async findChildElements(
    element: ElementHandle,
    selector: string
  ): Promise<Array<ElementHandle<NodeFor<string>>>> {
    return await element.$$(selector);
  }

  protected async findLastElement(
    selector: string
  ): Promise<ElementHandle<NodeFor<string>>> {
    const elements = await this.findElements(selector);
    return elements[elements.length - 1];
  }

  protected async inputText(selector: string, text: string) {
    if (!this.page) throw new Error("Browser page not initialized");
    await this.page.type(selector, text);
  }

  protected async getElementText(
    element: ElementHandle
  ): Promise<string | null> {
    if (!this.page) throw new Error("Browser page not initialized");

    try {
      return await element.evaluate((el) => {
        return el.childNodes[0]?.nodeValue?.trim() || null;
      });
    } catch (error) {
      console.log(error);
      return "error";
    }
  }

  protected async getElementsText(
    elements: Array<ElementHandle>
  ): Promise<Array<string | null>> {
    return await Promise.all(
      elements.map((element) => this.getElementText(element))
    );
  }

  protected async getElementAttribute(
    element: ElementHandle,
    attribute: string
  ): Promise<string | null> {
    if (!this.page) throw new Error("Browser page not initialized");
    try {
      const value = await (await element.getProperty(attribute)).jsonValue();
      return value as string;
    } catch (error) {
      console.log(error);
      return "error";
    }
  }

  protected async click(selector: string) {
    return this.waitSelector(selector).then(async (result) => {
      await result.click();
    });
  }

  protected async clickElement(element: ElementHandle) {
    return element.click();
  }

  protected async loadMoreContent(
    loadMoreSelector: string | null,
    contentItemSelector: string,
    timeoutMs = this.timeout
  ): Promise<boolean> {
    const beforeCount = (await this.findElements(contentItemSelector)).length;

    try {
      if (loadMoreSelector) await this.click(loadMoreSelector);

      const startTime = Date.now();
      let afterCount = beforeCount;

      while (afterCount <= beforeCount && Date.now() - startTime < timeoutMs) {
        await this.page?.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await this.page?.waitForTimeout(500);

        afterCount = (await this.findElements(contentItemSelector)).length;
      }

      await this.page?.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await this.page?.waitForTimeout(50);

      afterCount = (await this.findElements(contentItemSelector)).length;

      return afterCount > beforeCount;
    } catch (error) {
      console.log("No more content to load or button not found");
      return false;
    }
  }

  protected async loadAllUntilCount(
    loadMoreSelector: string | null,
    contentItemSelector: string,
    targetCount: number,
    maxAttempts = 50
  ): Promise<number> {
    let hasMore = true;
    let attempts = 0;

    while (hasMore && attempts < maxAttempts) {
      hasMore = await this.loadMoreContent(
        loadMoreSelector,
        contentItemSelector
      );

      attempts++;

      const currentCount = (await this.findElements(contentItemSelector))
        .length;

      console.log("currentCount", currentCount);
      console.log("targetCount", targetCount);
      console.log("hasMore", hasMore);

      if (currentCount >= targetCount) break;
    }

    const finalCount = (await this.findElements(contentItemSelector)).length;
    return finalCount;
  }

  protected processScrapedData?(data: any): Promise<void> | void;
}
