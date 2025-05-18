import { Service } from "@prisma/client";
import { prisma } from "../../libs/prisma.libs";
import { NumberNormalizer } from "../../utils/normalize-number.util";
import { BaseScraperService } from "../base.scraper.service";
import { PuppeteerWebViewController } from "../puppeteer.webview.controller";

export class ViewerShipService extends BaseScraperService {
  private readonly basePageUrl: string =
    "https://viewership.softc.one/ranking/streamer?type=naverchzzk&date=yesterday";
  private readonly targetCount: number = 300;

  constructor() {
    super();
    this.crawledCount = 0;
    this.totalPages = 0;
    this.currentPageNo = 1;
  }

  public async startScraping(): Promise<
    Array<{
      id: string;
      channelIconUrl: string;
      channelName: string;
      dailyBroadcastCount: number;
      dailyViewerCount: number;
      dailyAverageViewerCount: number;
    }>
  > {
    if (this.isRunning) throw new Error("Scraper is already running");

    try {
      const channelList: Array<{
        id: string;
        channelIconUrl: string;
        channelName: string;
        dailyBroadcastCount: number;
        dailyViewerCount: number;
        dailyAverageViewerCount: number;
      }> = [];

      const puppeteerController = new PuppeteerWebViewController();
      const cookie = await puppeteerController.launchAndGetCookie();

      await this.openBrowser({
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; MI PAD 4 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Safari/537.36",
        cookies: [
          {
            name: "_vcrcs",
            value: cookie!,
            domain: "viewership.softc.one",
          },
          {
            name: "webview",
            value: JSON.stringify({ platform: "android" }),
            domain: "viewership.softc.one",
          },
        ],
      });

      this.isRunning = true;

      // Continue scraping until we reach the target count or there are no more items
      while (this.crawledCount < this.targetCount) {
        const pageUrl = `${this.basePageUrl}&page=${this.currentPageNo}`;
        await this.navigateToPage(pageUrl);

        const rowSelector = `[class~="md:py-2"] > div > div > a`;
        const rowsElements = await this.findElements(rowSelector);

        // If no rows found, we've reached the end of pagination
        if (rowsElements.length === 0) {
          break;
        }

        for (const rowElement of rowsElements) {
          const id = await this.getElementAttribute(rowElement, "href");
          const channelIconElement = await this.findChildElement(
            rowElement,
            " img"
          );
          const dailyBroadcastCountElement = await this.findChildElement(
            rowElement,
            " div:nth-child(4) > span:nth-child(1)"
          );
          const dailyViewerCountElement = await this.findChildElement(
            rowElement,
            " div:nth-child(5) > span:nth-child(1)"
          );
          const dailyAverageViewerCountElement = await this.findChildElement(
            rowElement,
            " div:nth-child(6) > span:nth-child(1)"
          );

          const channelIcon = await this.getElementAttribute(
            channelIconElement,
            "src"
          );

          const channelName = await this.getElementAttribute(
            channelIconElement,
            "alt"
          );
          const dailyBroadcastCount = await this.getElementText(
            dailyBroadcastCountElement
          );
          const dailyViewerCount = await this.getElementText(
            dailyViewerCountElement
          );
          const dailyAverageViewerCount = await this.getElementText(
            dailyAverageViewerCountElement
          );

          const channel = {
            service: Service.VIEWERSHIP,
            channelId: id?.split("/")[5] ?? "",
            channelIconUrl: channelIcon ?? "",
            channelName: channelName ?? "",
            dailyBroadcastCount:
              NumberNormalizer.normalizeFloat(dailyBroadcastCount),
            dailyViewerCount:
              NumberNormalizer.normalizeInteger(dailyViewerCount),
            dailyAverageViewerCount: NumberNormalizer.normalizeInteger(
              dailyAverageViewerCount
            ),
            date: new Date(new Date().setDate(new Date().getDate() - 1)),
          };

          await prisma.nChannel.upsert({
            where: {
              channelId_date: {
                channelId: channel.channelId,
                date: channel.date,
              },
            },
            update: channel,
            create: channel,
          });

          this.crawledCount++;

          // Stop if we've reached the target count
          if (this.crawledCount >= this.targetCount) {
            break;
          }
        }

        // Move to the next page
        this.currentPageNo++;
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
