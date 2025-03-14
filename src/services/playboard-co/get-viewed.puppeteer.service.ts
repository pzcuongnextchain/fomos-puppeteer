import { BaseScraperService } from "../base.scraper.service";
import { NumberNormalizer } from "../../utils/normalize-number.util";
// import axios from "axios";
export class GetViewedPuppeteerStatistic extends BaseScraperService {
  private readonly pageUrl: string =
    "https://playboard.co/en/youtube-ranking/most-viewed-all-channels-in-south-korea-daily";
  private readonly apiUrl: string = "https://lapi.playboard.co/v1/channel";
  private readonly targetCount: number = 99;

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
      this.isRunning = true;

      await this.navigateToPage(this.pageUrl);

      const rowSelector = ".shelf > div:first-of-type li:not(:first-child)";
      let rowsElements = await this.findElements(rowSelector);

      if (rowsElements.length > this.targetCount) {
        rowsElements = rowsElements.slice(0, this.targetCount);
      }

      for (const rowElement of rowsElements) {
        await this.clickElement(rowElement);
        await this.loadAllUntilCount(null, ".current", this.targetCount);

        console.log("====================LOADED====================");

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

          const channelId = id?.split("/")[5] ?? "";

          const channel = {
            id: channelId,
            channelIconUrl: channelIcon ?? "",
            channelName: channelName ?? "",
            channelTags: channelCategory.join(",") ?? "",
            cumulativeSubscribers: NumberNormalizer.normalizeInteger(
              cumulativeSubscribers
            ),
            dailyNewSubscribers:
              NumberNormalizer.normalizeInteger(dailyNewSubscribers),
            dailySuperChat: 0,
            dailyLiveViewers: 0,
            dailyViews: 0,
          };

          channelList.push(channel);

          // await new Promise((resolve) => setTimeout(resolve, 1000));

          this.crawledCount++;
        }
        break;
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
}
