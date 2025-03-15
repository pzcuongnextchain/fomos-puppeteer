import { Service } from "@prisma/client";
import { prisma } from "../../libs/prisma.libs";
import { NumberNormalizer } from "../../utils/normalize-number.util";
import { BaseScraperService } from "../base.scraper.service";
export class GetLiveViewersPuppeteerStatistic extends BaseScraperService {
  private readonly pageUrl: string =
    "https://playboard.co/en/youtube-ranking/most-watched-all-channels-in-south-korea-daily";
  private readonly loginUrl: string = "https://playboard.co/en/account/signin";
  private readonly targetCount: number = 200;

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
      cumulativeViewers: number;
      dailyViewerCount: number;
      service: Service;
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
        cumulativeViewers: number;
        dailyViewerCount: number;
        service: Service;
      }> = [];

      await this.openBrowser();
      this.isRunning = true;

      await this.login();
      await this.page?.waitForTimeout(5000);

      await this.navigateToPage(this.pageUrl);

      await this.clickElement(await this.findFirstElement(".menu__language"));
      await this.clickElement(await this.findFirstElement(".popup li span"));

      await this.page?.waitForTimeout(1000);

      const rowSelector = ".shelf > div:first-of-type li:not(:first-child)";
      let rowsElements = await this.findElements(rowSelector);

      if (rowsElements.length > this.targetCount) {
        rowsElements = rowsElements.slice(0, this.targetCount);
      }

      let index = 0;
      for (const rowElement of rowsElements) {
        const categoryElement = await this.findChildElement(rowElement, "span");
        const category = await this.getElementText(categoryElement);

        console.log(
          `Start crawling category ${category}, ${index++}/${
            rowsElements.length
          }`
        );

        await this.clickElement(rowElement);
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
          console.log("channel", id);

          const channel = {
            channelId: channelId,
            channelIconUrl: channelIcon ?? "",
            channelName: channelName ?? "",
            channelTags: channelCategory.join(",") ?? "",
            cumulativeViewers: NumberNormalizer.normalizeInteger(
              cumulativeSubscribers
            ),
            dailyViewerCount:
              NumberNormalizer.normalizeInteger(dailyNewSubscribers),
            service: Service.PLAYBOARD_CO,
            channelCategory: category,
          };

          await prisma.channel.upsert({
            where: {
              channelId: channelId,
            },
            update: channel,
            create: channel,
          });

          this.crawledCount++;
        }
        console.log(
          `Crawled ${this.crawledCount} channels, waiting 20 seconds`
        );
        await new Promise((resolve) => setTimeout(resolve, 20000));
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
