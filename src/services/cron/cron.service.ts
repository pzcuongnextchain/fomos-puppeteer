import cron from "node-cron";
import { GetBoradcastPuppeteerStatistic } from "../playboard-co/get-broadcast-statistic.puppeteer.service";
import { GetLiveViewersPuppeteerStatistic } from "../playboard-co/get-live-viewers.puppeteer.service";
import { GetSuperChattedPuppeteerStatistic } from "../playboard-co/get-super-chatted-statistic.puppeteer.service";
import { GetViewedPuppeteerStatistic } from "../playboard-co/get-viewed.puppeteer.service";
import { GetBroadcaseChannelHistory } from "../poong-today/get-broadcase-channel-history.service";
import { GetDailyStarBallon } from "../poong-today/get-daily-star-ballon.service";
import { ViewerShipService } from "../viewership/get-broadcase-channel-history.service";
import { DailySubscribeViewerShipService } from "../viewership/get-daily-subscribe.service";
import { GetBroadcastYoutubeChannel } from "../youtube/get-broadcast-youtube-channel.service";

export class CronService {
  private poongTodayDailyService: GetDailyStarBallon;
  private poongTodayBroadcastService: GetBroadcaseChannelHistory;
  private viewershipService: ViewerShipService;
  private viewershipDailySubscribeService: DailySubscribeViewerShipService;
  private youtubeService: GetBroadcastYoutubeChannel;
  private playboardBroadcastService: GetBoradcastPuppeteerStatistic;
  private playboardLiveViewersService: GetLiveViewersPuppeteerStatistic;
  private playboardSuperChattedService: GetSuperChattedPuppeteerStatistic;
  private playboardViewedService: GetViewedPuppeteerStatistic;

  constructor() {
    this.poongTodayDailyService = new GetDailyStarBallon();
    this.poongTodayBroadcastService = new GetBroadcaseChannelHistory();
    this.viewershipService = new ViewerShipService();
    this.viewershipDailySubscribeService =
      new DailySubscribeViewerShipService();
    this.youtubeService = new GetBroadcastYoutubeChannel();
    this.playboardBroadcastService = new GetBoradcastPuppeteerStatistic();
    this.playboardLiveViewersService = new GetLiveViewersPuppeteerStatistic();
    this.playboardSuperChattedService = new GetSuperChattedPuppeteerStatistic();
    this.playboardViewedService = new GetViewedPuppeteerStatistic();
  }

  startCronJobs(): void {
    console.log("Starting cron jobs...");

    try {
      // PoongToday daily service - every 3 hours
      cron.schedule(
        "0 */3 * * *",
        async () => {
          console.log(
            `Running PoongToday at ${new Date().toLocaleString("en-US", {
              timeZone: "Asia/Seoul",
            })}`
          );
          try {
            await this.poongTodayDailyService.startScraping();
            console.log("Finished PoongToday daily star balloon service");
          } catch (error) {
            console.error(
              "Error in PoongToday daily star balloon cron job:",
              error
            );
          }
        },
        { timezone: "Asia/Seoul" }
      );

      // PoongToday broadcast service - once per day
      cron.schedule(
        "0 0 * * *",
        async () => {
          console.log(
            `Running PoongToday broadcast channel history service at ${new Date().toLocaleString(
              "en-US",
              { timeZone: "Asia/Seoul" }
            )}`
          );
          try {
            await this.poongTodayBroadcastService.startScraping();
            console.log(
              "Finished PoongToday broadcast channel history service"
            );
          } catch (error) {
            console.error(
              "Error in PoongToday broadcast channel history cron job:",
              error
            );
          }
        },
        { timezone: "Asia/Seoul" }
      );

      // Viewership service - every 3 hours
      cron.schedule(
        "0 */3 * * *",
        async () => {
          console.log(
            `Running Viewership service at ${new Date().toLocaleString(
              "en-US",
              { timeZone: "Asia/Seoul" }
            )}`
          );
          try {
            await this.viewershipService.startScraping();
            console.log("Finished Viewership service");
          } catch (error) {
            console.error("Error in Viewership cron job:", error);
          }
        },
        { timezone: "Asia/Seoul" }
      );

      // Viewership service - daily
      cron.schedule("0 0 * * *", async () => {
        console.log(`Running Viewership service at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })}`);
        try {
          await this.viewershipDailySubscribeService.startScraping();
        } catch (error) {
          console.error("Error in Viewership daily subscribe cron job:", error);
        }
      }, { timezone: "Asia/Seoul" });

      // Playboard services - daily for broadcast and statistics
      cron.schedule(
        "0 0 * * *",
        async () => {
          console.log(
            `Running Playboard broadcast service at ${new Date().toLocaleString(
              "en-US",
              { timeZone: "Asia/Seoul" }
            )}`
          );
          try {
            await this.playboardBroadcastService.startScraping();
          } catch (error) {
            console.error("Error in Playboard broadcast cron job:", error);
          }

          console.log(
            `Running Playboard super chatted service at ${new Date().toLocaleString(
              "en-US",
              { timeZone: "Asia/Seoul" }
            )}`
          );
          try {
            await this.playboardSuperChattedService.startScraping();
          } catch (error) {
            console.error("Error in Playboard super chatted cron job:", error);
          }

          console.log(
            `Running Playboard viewed service at ${new Date().toLocaleString(
              "en-US",
              { timeZone: "Asia/Seoul" }
            )}`
          );
          try {
            await this.playboardViewedService.startScraping();
          } catch (error) {
            console.error("Error in Playboard viewed cron job:", error);
          }

          console.log(
            `Running Playboard live viewers service service at ${new Date().toLocaleString(
              "en-US",
              { timeZone: "Asia/Seoul" }
            )}`
          );
          try {
            await this.playboardLiveViewersService.startScraping();
          } catch (error) {
            console.error("Error in Playboard live viewers cron job:", error);
          }

          console.log(
            `Running YouTube broadcast service at ${new Date().toLocaleString(
              "en-US",
              { timeZone: "Asia/Seoul" }
            )}`
          );
          try {
            await this.youtubeService.startScraping();
          } catch (error) {
            console.error("Error in YouTube broadcast cron job:", error);
          }
        },
        { timezone: "Asia/Seoul" }
      );
    } catch (error) {
      console.error("Error in cron jobs:", error);
    }

    console.log("All cron jobs scheduled");
  }
}
