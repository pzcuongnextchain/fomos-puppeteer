import { Router, Request, Response } from "express";
import { GetBoradcastPuppeteerStatistic } from "../../services/playboard-co/get-broadcast-statistic.puppeteer.service";
import { GetLiveViewersPuppeteerStatistic } from "../../services/playboard-co/get-live-viewers.puppeteer.service";
import { GetSuperChattedPuppeteerStatistic } from "../../services/playboard-co/get-super-chatted-statistic.puppeteer.service";
import { GetViewedPuppeteerStatistic } from "../../services/playboard-co/get-viewed.puppeteer.service";

export class PlayboardCoRouter {
  private router: Router;
  private scraperService: GetBoradcastPuppeteerStatistic;
  private liveViewersScraperService: GetLiveViewersPuppeteerStatistic;
  private superChattedScraperService: GetSuperChattedPuppeteerStatistic;
  private viewedScraperService: GetViewedPuppeteerStatistic;

  constructor() {
    this.router = Router();
    this.scraperService = new GetBoradcastPuppeteerStatistic();
    this.liveViewersScraperService = new GetLiveViewersPuppeteerStatistic();
    this.superChattedScraperService = new GetSuperChattedPuppeteerStatistic();
    this.viewedScraperService = new GetViewedPuppeteerStatistic();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/get-broadcast-statistic",
      this.getBroadcastStatistic.bind(this)
    );
    this.router.get(
      "/get-live-viewers-statistic",
      this.getLiveViewersStatistic.bind(this)
    );
    this.router.get(
      "/get-super-chatted-statistic",
      this.getSuperChattedStatistic.bind(this)
    );
    this.router.get(
      "/get-viewed-statistic",
      this.getViewedStatistic.bind(this)
    );
  }

  private async getBroadcastStatistic(req: Request, res: Response) {
    try {
      const result = await this.scraperService.startScraping();
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  }

  private async getLiveViewersStatistic(req: Request, res: Response) {
    try {
      const result = await this.liveViewersScraperService.startScraping();
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  }

  private async getSuperChattedStatistic(req: Request, res: Response) {
    try {
      const result = await this.superChattedScraperService.startScraping();
      res.json(result);
    } catch (error) {
      console.error(error);

      res.status(500).json({ message: "Failed to start scraping" });
    }
  }

  private async getViewedStatistic(req: Request, res: Response) {
    try {
      const result = await this.viewedScraperService.startScraping();
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to start scraping" });
    }
  }

  getRouter(): Router {
    return this.router;
  }
}
