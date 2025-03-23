import { Service } from "@prisma/client";
import { prisma } from "../../libs/prisma.libs";
import { NumberNormalizer } from "../../utils/normalize-number.util";
import { BaseScraperService } from "../base.scraper.service";
// import axios from "axios";
export class GetSuperChattedPuppeteerStatistic extends BaseScraperService {
  private readonly pageUrl: string =
    "https://playboard.co/en/youtube-ranking/most-superchatted-all-channels-in-south-korea-daily";
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

      await this.login();

      await this.wait(5000);

      this.isRunning = true;

      await this.navigateToPage(this.pageUrl);

      //change currency to krw
      await this.clickElement(await this.findFirstElement(`.menu__picture`));
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
      for (const rowElement of rowsElements) {
        const categoryElement = await this.findChildElement(rowElement, "span");

        const category = await this.getElementText(categoryElement);

        console.log(
          "Start crawling category",
          category,
          index++,
          rowsElements.length
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
            dailySuperChat: NumberNormalizer.normalizeInteger(dailySuperChat),
            service: Service.PLAYBOARD_CO,
            channelCategory: category,
          };

          await prisma.channel.upsert({
            where: {
              channelId_date: {
                channelId: channelId,
                date: new Date(),
              },
            },
            update: channel,
            create: channel,
          });

          this.crawledCount++;
        }
        console.log(
          `Crawled ${this.crawledCount} channels, waiting 30 seconds`
        );
        await new Promise((resolve) => setTimeout(resolve, 30000));
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
