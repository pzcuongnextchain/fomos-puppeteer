import { BaseScraperService } from "../base.scraper.service";
import { NumberNormalizer } from "../../utils/normalize-number.util";
// import axios from "axios";
export class GetLiveViewersPuppeteerStatistic extends BaseScraperService {
  private readonly pageUrl: string =
    "https://playboard.co/en/youtube-ranking/most-watched-all-channels-in-south-korea-daily";
  private readonly apiUrl: string = "https://lapi.playboard.co/v1/channel";
  private readonly targetCount: number = 100;

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

          // const headers = {
          //   "Content-Type": "application/json",
          //   Authorization:
          //     "Bearer Vu5juigpa-vYp78lBzRJRySJH5d4T6fD75GCcmIm2O2COQi173Yq3BokXOokSK_brMUQmbVe-ZvOxaM1uhJ5Dg4b9iCWrI97gNyR_z3fuxLtJV4fjbOMtXvviAd1kb37",
          // };

          // const [donationResponse, trendResponse, viewResponse] =
          //   await Promise.all([
          //     axios.get(
          //       `${this.apiUrl}/${channelId}/donation/trend?currency=USD&interval=d&tz=Asia%2FBangkok&locale=en-US`,
          //       { headers }
          //     ),
          //     axios.get(
          //       `${this.apiUrl}/${channelId}/live/viewer/trend?interval=d&tz=Asia%2FBangkok&locale=en-US`,
          //       { headers }
          //     ),
          //     axios.get(
          //       `${this.apiUrl}/${channelId}/views/trend?interval=d&tz=Asia%2FBangkok&locale=en-US`,
          //       { headers }
          //     ),
          //   ]);

          // const dailySuperChat = donationResponse.data.stats.today;
          // const dailyLiveViewers =
          //   trendResponse.data.sheet.rows[
          //     trendResponse.data.sheet.rows.length - 1
          //   ][1] || 0;
          // const dailyViews =
          //   viewResponse.data.sheet.rows[
          //     viewResponse.data.sheet.rows.length - 1
          //   ][1] || 0;

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

          await new Promise((resolve) => setTimeout(resolve, 1000));

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
