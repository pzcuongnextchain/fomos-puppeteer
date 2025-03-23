import { Service } from "@prisma/client";
import { prisma } from "../../libs/prisma.libs";
import { NumberNormalizer } from "../../utils/normalize-number.util";
import { BaseScraperService } from "../base.scraper.service";
// import axios from "axios";
export class GetBoradcastPuppeteerStatistic extends BaseScraperService {
  private readonly pageUrl: string =
    "https://playboard.co/youtube-ranking/most-subscribed-all-channels-in-south-korea-total";
  private readonly loginUrl: string = "https://playboard.co/en/account/signin";
  private readonly targetCount: number = 200;
  private readonly targetDate: string = "1742515200";
  private readonly initialDate: string = "1735732800";

  constructor() {
    super();
    this.crawledCount = 0;
  }

  public async startScraping() {
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
      console.log("open browser");
      await this.openBrowser();
      console.log("open browser success");

      await this.login();
      console.log("login success");
      await this.wait(5000);

      this.isRunning = true;

      let crawledDate = this.initialDate;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        await this.navigateToPage(this.pageUrl);

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
            // Re-find the specific row element since we lost the previous reference
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
              const scoreElements = await this.findChildElement(
                channelElement,
                " .score"
              );
              const dailyNewSubscribersElement = await this.findChildElement(
                channelElement,
                " .score > span"
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
              const cumulativeSubscribers = await this.getElementText(
                scoreElements
              );

              const dailyNewSubscribers = await this.getElementText(
                dailyNewSubscribersElement
              );

              const channelId = id?.split("/")[4] ?? "";
              console.log("channelId", channelId);

              const channel = {
                channelId: channelId,
                channelIconUrl: channelIcon ?? "",
                channelName: channelName ?? "",
                channelTags: channelCategory.join(",") ?? "",
                cumulativeSubscribers: NumberNormalizer.normalizeInteger(
                  cumulativeSubscribers
                ),
                dailyNewSubscribers:
                  NumberNormalizer.normalizeInteger(dailyNewSubscribers),
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
            console.error(`Error processing row ${index}:`, error);

            // If we encounter an error, try to recover
            console.log("Attempting to recover from error...");
            await this.wait(10000);

            // Re-navigate to the page
            await this.navigateToPage(this.pageUrl);

            // Re-find all elements
            rowsElements = await this.findElements(rowSelector);
            if (rowsElements.length > this.targetCount) {
              rowsElements = rowsElements.slice(0, this.targetCount);
            }

            // Decrease index to retry the current row
            index = Math.max(0, index - 1);
            continue;
          }
        }

        if (crawledDate > this.targetDate) {
          break;
        }

        //add 1 day to crawledDate
        crawledDate = (Number(crawledDate) + 86400).toString();
      }
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
