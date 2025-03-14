import { BaseScraperService } from "../base.scraper.service";
import { NumberNormalizer } from "../../utils/normalize-number.util";
export class GetDailyStarBallon extends BaseScraperService {
  private readonly pageUrl: string =
    "https://poong.today/rankings/broadcast/history";
  private readonly targetCount: number = 1000;

  constructor() {
    super();

    this.crawledCount = 0;
  }

  public async startScraping(): Promise<
    Array<{
      id: string;
      channelIconUrl: string;
      channelName: string;
      channelCategory: string;
      dailyReceivedStarBalloons: number;
      hourlyStarBalloonRate: number;
      dailyViewerCount: number;
      dailyStarBalloonGifts: number;
    }>
  > {
    if (this.isRunning) throw new Error("Scraper is already running");

    try {
      const channelList: Array<{
        id: string;
        channelIconUrl: string;
        channelName: string;
        channelCategory: string;
        dailyReceivedStarBalloons: number;
        hourlyStarBalloonRate: number;
        dailyViewerCount: number;
        dailyStarBalloonGifts: number;
      }> = [];

      await this.openBrowser();
      this.isRunning = true;
      await this.navigateToPage(this.pageUrl);

      await this.loadAllUntilCount(
        ".bbs-btn-more",
        ".body .rank",
        this.targetCount
      );

      const rowSelector = ".bbs-body .body .row";
      const rowsElements = await this.findElements(rowSelector);
      for (const rowElement of rowsElements) {
        const idElement = await this.findChildElement(rowElement, " .post");
        const channelIconElement = await this.findChildElement(
          rowElement,
          " .thumnail > img"
        );
        const channelNameElement = await this.findChildElement(
          rowElement,
          " .nick"
        );
        const channelCategoryElement = await this.findChildElement(
          rowElement,
          " .category"
        );
        const statisticElements = await this.findChildElements(
          rowElement,
          " .col"
        );

        const id = await this.getElementAttribute(idElement, "href");
        const channelIcon = await this.getElementAttribute(
          channelIconElement,
          "src"
        );

        const channelName = await this.getElementText(channelNameElement);
        const channelCategory = await this.getElementText(
          channelCategoryElement
        );

        const [
          dailyReceivedStarBalloons,
          hourlyStarBalloonRate,
          dailyViewerCount,
          dailyStarBalloonGifts,
        ] = await this.getElementsText(statisticElements);

        const channel = {
          id: id?.split("/")[4] ?? "",
          channelIconUrl: channelIcon ?? "",
          channelName: channelName ?? "",
          channelCategory: channelCategory ?? "",
          dailyReceivedStarBalloons: NumberNormalizer.normalizeInteger(
            dailyReceivedStarBalloons
          ),
          hourlyStarBalloonRate: NumberNormalizer.normalizeInteger(
            hourlyStarBalloonRate
          ),
          dailyViewerCount: NumberNormalizer.normalizeInteger(dailyViewerCount),
          dailyStarBalloonGifts: NumberNormalizer.normalizeInteger(
            dailyStarBalloonGifts
          ),
        };

        channelList.push(channel);
        this.crawledCount++;
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
