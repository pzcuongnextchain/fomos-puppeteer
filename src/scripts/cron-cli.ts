import { CronService } from "../services/cron/cron.service";
import { GetBoradcastPuppeteerStatistic } from "../services/playboard-co/get-broadcast-statistic.puppeteer.service";
import { GetLiveViewersPuppeteerStatistic } from "../services/playboard-co/get-live-viewers.puppeteer.service";
import { GetSuperChattedPuppeteerStatistic } from "../services/playboard-co/get-super-chatted-statistic.puppeteer.service";
import { GetViewedPuppeteerStatistic } from "../services/playboard-co/get-viewed.puppeteer.service";
import { GetBroadcaseChannelHistory } from "../services/poong-today/get-broadcase-channel-history.service";
import { GetDailyStarBallon } from "../services/poong-today/get-daily-star-ballon.service";
import { ViewerShipService } from "../services/viewership/get-broadcase-channel-history.service";
import { GetBroadcastYoutubeChannel } from "../services/youtube/get-broadcast-youtube-channel.service";

// Define a common interface for all services
interface ScraperService {
  startScraping: (...args: any[]) => Promise<any>;
}

// Define the services type
interface ServiceMap {
  [key: string]: ScraperService;
}

// Available services
const services: ServiceMap = {
  "poong-today-daily": new GetDailyStarBallon(),
  "poong-today-broadcast": new GetBroadcaseChannelHistory(),
  viewership: new ViewerShipService(),
  youtube: new GetBroadcastYoutubeChannel(),
  "playboard-broadcast": new GetBoradcastPuppeteerStatistic(),
  "playboard-live-viewers": new GetLiveViewersPuppeteerStatistic(),
  "playboard-super-chatted": new GetSuperChattedPuppeteerStatistic(),
  "playboard-viewed": new GetViewedPuppeteerStatistic(),
};

// Script arguments
const args = process.argv.slice(2);
const command = args[0];
const serviceId = args[1];

async function executeService(id: string) {
  if (!services[id]) {
    console.error(
      `Service ${id} not found. Available services: ${Object.keys(
        services
      ).join(", ")}`
    );
    process.exit(1);
  }

  try {
    console.log(`Running service: ${id}`);
    await services[id].startScraping();
    console.log(`Service ${id} completed successfully`);
  } catch (error) {
    console.error(`Error running service ${id}:`, error);
    process.exit(1);
  }
}

async function main() {
  switch (command) {
    case "start-all":
      console.log("Starting all cron jobs");
      const cronService = new CronService();
      cronService.startCronJobs();
      console.log("Use Ctrl+C to stop the cron service");
      // Keep the process running
      process.stdin.resume();
      break;

    case "run":
      if (!serviceId) {
        console.error("Please specify a service ID to run");
        console.error(
          `Available services: ${Object.keys(services).join(", ")}`
        );
        process.exit(1);
      }
      await executeService(serviceId);
      break;

    case "run-all":
      console.log("Running all services");
      for (const id of Object.keys(services)) {
        await executeService(id);
      }
      console.log("All services completed");
      break;

    case "list":
      console.log("Available services:");
      Object.keys(services).forEach((id) => console.log(`- ${id}`));
      break;

    default:
      console.log(`
Usage:
  yarn ts-node src/scripts/cron-cli.ts <command> [options]

Commands:
  start-all                Start all cron jobs
  run <service-id>         Run a specific service once
  run-all                  Run all services once
  list                     List all available services

Examples:
  yarn ts-node src/scripts/cron-cli.ts start-all
  yarn ts-node src/scripts/cron-cli.ts run poong-today-daily
  yarn ts-node src/scripts/cron-cli.ts run-all
  yarn ts-node src/scripts/cron-cli.ts list
      `);
      break;
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
