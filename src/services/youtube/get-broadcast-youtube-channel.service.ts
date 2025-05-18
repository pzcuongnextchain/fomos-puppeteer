import { Service } from "@prisma/client";
import axios from "axios";
import { prisma } from "../../libs/prisma.libs";

export class GetBroadcastYoutubeChannel {
  private readonly apiUrl: string =
    "https://www.googleapis.com/youtube/v3/search";
  private isRunning: boolean = false;

  public async startScraping() {
    if (this.isRunning) throw new Error("Scraper is already running");

    await prisma.nServiceCrawl.upsert({
      where: {
        service: Service.YOUTUBE,
      },
      update: {
        lastCrawledAt: new Date(),
      },
      create: {
        service: Service.YOUTUBE,
        lastCrawledAt: new Date(),
      },
    });

    try {
      const channelList: Array<{
        id: string;
        name: string;
        items: Array<{
          id: string;
          cumulativeViews: number;
          cumulativeSubscribers: number;
          numberOfUploadedVideos: number;
          channelCreationDate: string;
          channelName: string;
          channelDescription: string;
          channelCustomURL: string;
        }>;
      }> = [];

      this.isRunning = true;

      // We'll use cursor-based pagination to process all channels
      let lastChannelId: string | undefined = undefined;
      let hasMoreChannels = true;

      // YouTube API allows up to 50 IDs per request
      const BATCH_SIZE = 25;

      while (hasMoreChannels) {
        // Get the next batch of channels using cursor pagination
        const channels: Array<{ channelId: string }> =
          await prisma.nChannel.findMany({
            where: {
              service: Service.PLAYBOARD_CO,
              ...(lastChannelId ? { channelId: { gt: lastChannelId } } : {}),
              cumulativeViewers: null,
            },
            orderBy: {
              channelId: "asc",
            },
            take: BATCH_SIZE,
            distinct: ["channelId"],
          });

        if (channels.length === 0) {
          hasMoreChannels = false;
          break;
        }

        // Update the cursor to the last channel ID in this batch
        lastChannelId = channels[channels.length - 1].channelId;

        // Create a comma-separated string of channel IDs for the API request
        const channelIds = channels
          .filter((channel) => channel.channelId)
          .map((channel) => channel.channelId)
          .join(",");

        // Make a single API call for this batch
        const channelResponse = await axios.get(
          "https://www.googleapis.com/youtube/v3/channels",
          {
            params: {
              part: "statistics,snippet",
              id: channelIds,
              key: process.env.YOUTUBE_API_KEY,
            },
          }
        );

        if (
          channelResponse.data.items &&
          channelResponse.data.items.length > 0
        ) {
          // Create a map for faster lookup of channel data
          const channelDataMap = new Map();
          channelResponse.data.items.forEach((item: any) => {
            channelDataMap.set(item.id, item);
          });

          // Process updates sequentially instead of in parallel
          for (const channel of channels) {
            const channelData = channelDataMap.get(channel.channelId);

            if (!channelData) continue; // Skip if no data returned for this channel

            const updateChannel = {
              channelId: channel.channelId as string,
              cumulativeViewers: BigInt(channelData.statistics.viewCount || 0),
              cumulativeSubscribers: BigInt(
                channelData.statistics.subscriberCount || 0
              ),
              numberOfUploadedVideos: BigInt(
                channelData.statistics.videoCount || 0
              ),
              creationDate: channelData?.snippet?.publishedAt
                ? new Date(channelData.snippet.publishedAt)
                : null,
              channelName: channelData?.snippet?.title || null,
              channelDescription: channelData?.snippet?.description || null,
              channelCustomURL: channelData?.snippet?.customUrl || null,
              service: Service.YOUTUBE,
            };

            // Process one update at a time
            await prisma.nChannel.updateMany({
              where: {
                channelId: channel.channelId as string,
              },
              data: updateChannel,
            });
          }
        }

        // Optional: Add a small delay between batches
        console.log("Waiting for 1 second");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      this.isRunning = false;
      return channelList;
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }
}
