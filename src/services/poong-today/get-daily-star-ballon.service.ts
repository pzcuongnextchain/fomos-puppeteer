import { Service } from "@prisma/client";
import { prisma } from "../../libs/prisma.libs";
import { NumberNormalizer } from "../../utils/normalize-number.util";
import { BaseScraperService } from "../base.scraper.service";
export class GetDailyStarBallon extends BaseScraperService {
  private readonly pageUrl: string =
    "https://poong.today/rankings/broadcast/history";
  private readonly targetCount: number = 1000;

  constructor() {
    super();

    this.crawledCount = 0;
  }

  public async startScraping(): Promise<void> {
    if (this.isRunning) throw new Error("Scraper is already running");

    await prisma.serviceCrawl.upsert({
      where: {
        service: Service.POONG_TODAY,
      },
      update: {
        lastCrawledAt: new Date(),
      },
      create: {
        service: Service.POONG_TODAY,
        lastCrawledAt: new Date(),
      },
    });

    try {
      await this.openBrowser();
      this.isRunning = true;
      const today = "2025. 03. 22";

      await this.navigateToPage(this.pageUrl);

      const dailyElement = await this.findFirstElement(".tab-type-round li");
      await dailyElement?.click();

      await this.wait(5000);

      const inputSelector = ".react-datepicker-wrapper input";

      if (!this.page?.$(inputSelector)) {
        return;
      }
      await this.page?.click(inputSelector, {
        clickCount: 3,
      });
      await this.page?.type(inputSelector, "");

      await this.page?.type(inputSelector, "2024. 12. 02");

      await this.wait(5000);

      //send enter
      await this.page?.keyboard.press("Enter");

      // eslint-disable-next-line no-constant-condition
      while (true) {
        await this.wait(10000);

        const todayElement = await this.findFirstElement(
          ".react-datepicker-wrapper input"
        );

        const todayText = await this.getElementValue(todayElement);
        const formattedString = todayText?.replace(/\./g, "-").trim(); // Convert "2024. 12. 01" -> "2024-12-01"
        const todayDate = new Date(formattedString!);

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
            channelId: id?.split("/")[4] ?? "",
            channelIconUrl: channelIcon ?? "",
            channelName: channelName ?? "",
            channelCategory: channelCategory ?? "",
            dailyReceivedStarBalloons: NumberNormalizer.normalizeInteger(
              dailyReceivedStarBalloons
            ),
            hourlyStarBalloonRate: NumberNormalizer.normalizeInteger(
              hourlyStarBalloonRate
            ),
            dailyViewerCount:
              NumberNormalizer.normalizeInteger(dailyViewerCount),
            dailyStarBalloonGifts: NumberNormalizer.normalizeInteger(
              dailyStarBalloonGifts
            ),
            service: Service.POONG_TODAY,
            date: todayDate,
          };

          try {
            if (channel.channelId) {
              await prisma.channel.upsert({
                where: {
                  channelId_date: {
                    channelId: channel.channelId,
                    date: channel.date,
                  },
                },
                update: channel,
                create: channel,
              });
            }
          } catch (error) {
            console.log(channel);
            console.error("Error upserting channel:", error);
          }

          this.crawledCount++;
        }

        if (todayText && todayText === today) break;
        else {
          const nextDayElement = await this.findFirstElement(
            ".history-conts .right-arrow"
          );
          await this.clickElement(nextDayElement);
        }
      }
    } catch (error) {
      console.error("Scraping failed:", error);
      this.isRunning = false;
      throw error;
    }
  }
}
