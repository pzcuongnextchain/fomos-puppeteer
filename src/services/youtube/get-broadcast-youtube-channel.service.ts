import { Service } from "@prisma/client";
import axios from "axios";
import { prisma } from "../../libs/prisma.libs";

export class GetBroadcastYoutubeChannel {
  private readonly apiUrl: string =
    "https://www.googleapis.com/youtube/v3/search";
  private isRunning: boolean = false;

  public async startScraping(): Promise<
    Array<{
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
    }>
  > {
    if (this.isRunning) throw new Error("Scraper is already running");

    await prisma.serviceCrawl.upsert({
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

      // 1. Get video categories
      const categoriesResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/videoCategories",
        {
          params: {
            part: "snippet",
            regionCode: "KR",
            key: process.env.YOUTUBE_API_KEY,
            hl: "ko_KR",
          },
        }
      );

      // Get top 5 categories
      // const topCategories = categoriesResponse.data.items.slice(0, 5);
      const topCategories = categoriesResponse.data.items;
      for (const category of topCategories) {
        const categoryId = category.id;
        const categoryName = category.snippet.title;

        // 2. Search videos by category
        const videosResponse = await axios.get(
          "https://www.googleapis.com/youtube/v3/search",
          {
            params: {
              part: "snippet",
              eventType: "live",
              type: "video",
              videoCategoryId: categoryId,
              regionCode: "KR",
              maxResults: 100,
              key: process.env.YOUTUBE_API_KEY,
            },
          }
        );

        // Extract unique channel IDs from the video search results
        const channelIds = [
          ...new Set(
            videosResponse.data.items.map((item: any) => item.snippet.channelId)
          ),
        ];

        const categoryChannels: {
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
        } = {
          id: categoryId,
          name: categoryName,
          items: [],
        };

        // 3. Get channel statistics for each channel
        for (const channelId of channelIds) {
          const channelResponse = await axios.get(
            "https://www.googleapis.com/youtube/v3/channels",
            {
              params: {
                part: "statistics,snippet",
                id: channelId,
                key: process.env.YOUTUBE_API_KEY,
              },
            }
          );

          if (
            channelResponse.data.items &&
            channelResponse.data.items.length > 0
          ) {
            const channelData = channelResponse.data.items[0];

            const channel = {
              channelId: channelId as string,
              cumulativeViewers: parseInt(channelData.statistics.viewCount, 10),
              cumulativeSubscribers: parseInt(
                channelData.statistics.subscriberCount,
                10
              ),
              numberOfUploadedVideos: parseInt(
                channelData.statistics.videoCount,
                10
              ),
              creationDate: channelData?.snippet?.publishedAt as string,
              channelName: channelData?.snippet?.title as string,
              channelDescription: channelData?.snippet?.description as string,
              channelCustomURL: channelData?.snippet?.customUrl as string,
              channelCategory: categoryName,
              service: Service.YOUTUBE,
            };

            categoryChannels.items.push({
              id: channel.channelId as string,
              cumulativeViews: channel.cumulativeViewers,
              cumulativeSubscribers: channel.cumulativeSubscribers,
              numberOfUploadedVideos: channel.numberOfUploadedVideos,
              channelCreationDate: channel.creationDate,
              channelName: channel.channelName,
              channelDescription: channel.channelDescription,
              channelCustomURL: channel.channelCustomURL,
            });

            console.log("channel", channel);

            await prisma.channel.upsert({
              where: {
                channelId: channel.channelId as string,
              },
              update: channel,
              create: channel,
            });
          }
        }

        channelList.push(categoryChannels);
      }

      this.isRunning = false;

      return channelList;
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }
}
