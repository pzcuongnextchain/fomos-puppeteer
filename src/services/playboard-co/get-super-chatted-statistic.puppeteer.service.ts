import { Service } from "@prisma/client";
import { prisma } from "../../libs/prisma.libs";
import { NumberNormalizer } from "../../utils/normalize-number.util";
import { BaseScraperService } from "../base.scraper.service";
// import axios from "axios";
export class GetSuperChattedPuppeteerStatistic extends BaseScraperService {
  private readonly pageUrl: string =
    "https://playboard.co/en/youtube-ranking/most-superchatted-all-channels-in-south-korea-daily";
  private readonly loginUrl: string = "https://playboard.co/en/account/signin";
  private readonly targetCount: number = 100;
  private readonly targetDate: string = "1742515200";
  private readonly initialDate: string = "1740830400";

  constructor() {
    super();
    this.crawledCount = 0;
  }

  public async startScraping(): Promise<
    Array<{
      id: string;
      channelIconUrl: string;
      channelName: string;
      channelTags: string;
      cumulativeSubscribers: number;
      dailyNewSubscribers: number;
      dailySuperChat: number;
      dailyLiveViewers: number;
      dailyViews: number;
    }>
  > {
    if (this.isRunning) throw new Error("Scraper is already running");

    await prisma.serviceCrawl.upsert({
      where: {
        service: Service.PLAYBOARD_CO,
      },
      update: {
        lastCrawledAt: new Date(),
      },
      create: {
        service: Service.PLAYBOARD_CO,
        lastCrawledAt: new Date(),
      },
    });

    try {
      const channelList: Array<{
        id: string;
        channelIconUrl: string;
        channelName: string;
        channelTags: string;
        cumulativeSubscribers: number;
        dailyNewSubscribers: number;
        dailySuperChat: number;
        dailyLiveViewers: number;
        dailyViews: number;
      }> = [];

      await this.openBrowser();

      // await this.login();

      await this.wait(5000);

      this.isRunning = true;
      let crawledDate = this.initialDate;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        await this.navigateToPage(this.pageUrl);

        //change currency to krw
        await this.clickElement(await this.findFirstElement(`.more-btn`));
        await this.clickElement(
          await this.findFirstElement(`.label--icon-currency`)
        );
        await this.wait(2000);
        await this.clickElement(
          await this.findFirstElement(`.shortcut_language li:nth-of-type(3)`)
        );

        await this.clickElement(await this.findFirstElement(".menu__language"));
        await this.clickElement(await this.findFirstElement(".popup li span"));

        await this.wait(1000);

        const rowSelector = ".shelf > div:first-of-type li:not(:first-child)";
        let rowsElements = await this.findElements(rowSelector);

        if (rowsElements.length > this.targetCount) {
          rowsElements = rowsElements.slice(0, this.targetCount);
        }

        let index = 0;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const rowElement of rowsElements) {
          try {
            const categoryElement = await this.findChildElement(
              rowsElements[index],
              "span"
            );
            const category = await this.getElementText(categoryElement);

            console.log(
              "Start crawling category",
              category,
              index++,
              rowsElements.length
            );

            await this.clickElement(rowsElements[index - 1]);

            const currentPageUrl = this.page?.url();
            console.log("currentPageUrl", currentPageUrl);

            if (!currentPageUrl?.includes(crawledDate)) {
              const pageUrlWithDate = currentPageUrl + `?period=${crawledDate}`;
              await this.navigateToPage(pageUrlWithDate);

              console.log("navigate to page", pageUrlWithDate);

              // Add delay for manual CAPTCHA resolution if needed
              await this.wait(5000);

              // Re-find elements after navigation or CAPTCHA
              rowsElements = await this.findElements(rowSelector);
              if (rowsElements.length === 0) {
                console.log(
                  "Waiting for page to load or CAPTCHA resolution..."
                );
                // Wait longer for manual CAPTCHA resolution
                await this.wait(30000);
                // Try finding elements again
                rowsElements = await this.findElements(rowSelector);

                if (rowsElements.length > this.targetCount) {
                  rowsElements = rowsElements.slice(0, this.targetCount);
                }

                // Adjust index if needed
                if (index >= rowsElements.length) {
                  index = 0;
                }
              }

              // Wait for the page to be fully loaded
              await this.page?.waitForSelector(".shelf");
              await this.wait(2000);
            }

            await this.loadAllUntilCount(null, ".current", this.targetCount);

            const channelListSelector = ".sheet .chart__row";
            const channelListElements = await this.findElements(
              channelListSelector
            );

            for (const channelElement of channelListElements) {
              const adsElement = await this.findChildElement(
                channelElement,
                " .ad__slot"
              );

              if (adsElement) continue;

              const idElement = await this.findChildElement(
                channelElement,
                " td > a"
              );
              const channelIconElement = await this.findChildElement(
                channelElement,
                " .lazy-image img"
              );
              const channelNameElement = await this.findChildElement(
                channelElement,
                " .name > a > h3"
              );
              const channelCategoryElement = await this.findChildElements(
                channelElement,
                " .name li > a"
              );

              const cumulativeSuperChatElement = await this.findChildElement(
                channelElement,
                " .score > span:nth-of-type(1)"
              );
              const dailySuperChatElement = await this.findChildElement(
                channelElement,
                " .score:nth-of-type(odd) > span"
              );

              const id = await this.getElementAttribute(idElement, "href");

              const channelIcon = await this.getElementAttribute(
                channelIconElement,
                "src"
              );

              const channelName = await this.getElementText(channelNameElement);
              const channelCategory = await this.getElementsText(
                channelCategoryElement
              );
              const dailySuperChat = await this.getElementText(
                dailySuperChatElement
              );

              const cumulativeSuperChat = await this.getElementText(
                cumulativeSuperChatElement
              );

              const channelId = id?.split("/")[4] ?? "";

              const channel = {
                channelId,
                channelIconUrl: channelIcon ?? "",
                channelName: channelName ?? "",
                channelTags: channelCategory.join(",") ?? "",
                cumulativeSuperChat:
                  NumberNormalizer.normalizeInteger(cumulativeSuperChat),
                dailySuperChat:
                  NumberNormalizer.normalizeInteger(dailySuperChat),
                service: Service.PLAYBOARD_CO,
                channelCategory: category,
                date: new Date(Number(crawledDate) * 1000),
              };

              await prisma.channel.upsert({
                where: {
                  channelId_date: {
                    channelId: channelId,
                    date: channel.date,
                  },
                },
                update: channel,
                create: channel,
              });

              this.crawledCount++;
            }
            console.log(
              `Crawled ${this.crawledCount} channels, waiting 120 seconds`
            );
            await new Promise((resolve) => setTimeout(resolve, 120000));
          } catch (error) {
            console.error("Scraping failed:", error);
            this.isRunning = false;
            throw error;
          }
        }

        if (crawledDate > this.targetDate) {
          break;
        }

        //add 1 day to crawledDate
        crawledDate = (Number(crawledDate) + 86400).toString();
      }
      await this.closeBrowser();
      this.isFinished = true;
      this.isRunning = false;
      return channelList;
    } catch (error) {
      console.error("Scraping failed:", error);
      this.isRunning = false;
      throw error;
    }
  }

  public async login() {
    await this.navigateToPage(this.loginUrl);

    await this.inputText(`input[name="email"]`, "pzcuong.uit@gmail.com");
    await this.inputText(`input[name="password"]`, "01242663149");

    await this.clickElement(
      await this.findFirstElement(`button[type="submit"]`)
    );
  }
}
