import { Service } from "@prisma/client";
import { prisma } from "../../libs/prisma.libs";
import { NumberNormalizer } from "../../utils/normalize-number.util";
import { BaseScraperService } from "../base.scraper.service";
import { PuppeteerWebViewController } from "../puppeteer.webview.controller";

export class DailySubscribeViewerShipService extends BaseScraperService {
  private readonly baseUrl: string =
    "https://viewership.softc.one/channel/naverchzzk/";
  private readonly queryLimit: number = 100; // Reduced for safer processing
  private readonly maxRetries: number = 3;

  constructor() {
    super();
    this.crawledCount = 0;
  }

  public async startScraping(): Promise<
    Array<{
      id: string;
      cumulativeSubscribers: number;
    }>
  > {
    if (this.isRunning) throw new Error("Scraper is already running");

    try {
      const channelResults: Array<{
        id: string;
        cumulativeSubscribers: number;
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

      let hasMoreRecords = true;
      let currentSkip = 0;

      while (hasMoreRecords) {
        // Get channels in paginated batches
        console.log(
          `Fetching channels from ${currentSkip} to ${currentSkip + this.queryLimit
          }`
        );

        const channelIds = await prisma.nChannel.findMany({
          where: {
            service: Service.VIEWERSHIP,
            cumulativeSubscribers: null,
          },
          select: {
            id: true,
            channelId: true,
          },
          orderBy: {
            id: "desc",
          },
          ...(currentSkip > 0 && { skip: currentSkip }),
          take: this.queryLimit,
        });

        // If no channels returned, we're done
        if (channelIds.length === 0) {
          hasMoreRecords = false;
          break;
        }

        console.log(
          `Fetched ${channelIds.length} channel IDs from database, starting from ${currentSkip}`
        );

        // Process channels sequentially to avoid navigation conflicts
        for (const channel of channelIds) {
          let retryCount = 0;
          let success = false;

          while (!success && retryCount < this.maxRetries) {
            try {
              // Navigate to the channel page
              const channelUrl = `${this.baseUrl}${channel.channelId}`;
              await this.navigateToPage(channelUrl);

              // Find the subscribe count element with the class "mt-2 text-3xl font-bold"
              const subscribeCountSelector = ".mt-2.text-3xl.font-bold";
              await this.waitForSelector(subscribeCountSelector);

              const subscribeCountElement = await this.findFirstElement(
                subscribeCountSelector
              );
              const subscribeCountText = await this.getElementText(
                subscribeCountElement
              );

              // Convert the text to a number
              const subscribeCount =
                NumberNormalizer.normalizeInteger(subscribeCountText);

              // Update the channel data in the database
              await prisma.nChannel.updateMany({
                where: {
                  id: channel.id,
                },
                data: {
                  cumulativeSubscribers: subscribeCount,
                },
              });

              channelResults.push({
                id: channel.channelId,
                cumulativeSubscribers: subscribeCount,
              });

              this.crawledCount++;
              success = true;

              console.log(
                `Successfully processed channel: ${channel.channelId}, subscribe count: ${subscribeCount}`
              );
            } catch (error) {
              retryCount++;
              console.error(
                `Error scraping channel ${channel.channelId} (attempt ${retryCount}/${this.maxRetries}):`,
                error
              );

              if (retryCount >= this.maxRetries) {
                console.log(
                  `Failed to process channel ${channel.channelId} after ${this.maxRetries} attempts. Skipping...`
                );
              } else {
                console.log(
                  `Retrying channel ${channel.channelId} in 2 seconds...`
                );
                await this.wait(2000); // Wait before retry
              }
            }
          }

          // Add a short delay between requests to avoid rate limiting
          await this.wait(1000);
        }

        console.log(
          `Processed batch of ${channelIds.length} channels. Total processed: ${this.crawledCount}`
        );

        // Move to the next page of records
        currentSkip += this.queryLimit;
      }

      await this.closeBrowser();
      this.isFinished = true;
      this.isRunning = false;
      return channelResults;
    } catch (error) {
      console.error("Scraping failed:", error);
      this.isRunning = false;

      // Try to clean up browser resources even if there's an error
      try {
        if (this.browser) {
          await this.closeBrowser();
        }
      } catch (cleanupError) {
        console.error("Failed to clean up browser resources:", cleanupError);
      }

      throw error;
    }
  }
}
