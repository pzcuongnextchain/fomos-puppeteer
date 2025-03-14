import { Router, Request, Response } from "express";
import { GetBroadcastYoutubeChannel } from "../../services/youtube/get-broadcast-youtube-channel.service";

export class YoutubeRouter {
  private router: Router;
  private scraperService: GetBroadcastYoutubeChannel;

  constructor() {
    this.router = Router();
    this.scraperService = new GetBroadcastYoutubeChannel();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/get-broadcast-statistic",
      this.getBroadcastStatistic.bind(this)
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

  getRouter(): Router {
    return this.router;
  }
}
