# Cron Jobs for Data Scraping

This project includes a cron job system that automatically runs the various scraping services at configured intervals.

## Schedule

The following services have been configured to run automatically:

### PoongToday

- **Daily Star Balloon**: Every 3 hours
- **Broadcast Channel History**: Once per day (at midnight)

### Viewership

- **Broadcast Channel Statistics**: Every 3 hours and once per day (at midnight)

### YouTube

- **Broadcast Statistics**: Once per day (at midnight)

### Playboard

- **Live Viewers**: Every 3 hours
- **Broadcast Statistics**: Once per day (at midnight)
- **Super Chatted Statistics**: Once per day (at midnight)
- **Viewed Statistics**: Once per day (at midnight)

## Usage

You can use the following commands to control the cron service:

### Starting the Cron Service with the Application

When you start the application with `yarn dev` or `yarn start`, the cron service automatically starts and schedules all the jobs.

### Using the Cron CLI

The application includes a command-line interface (CLI) for the cron service:

#### Start All Cron Jobs

```bash
yarn cron:start
```

This will start all cron jobs according to the configured schedule. The process will keep running until manually stopped.

#### Run a Specific Service Once

```bash
yarn cron:run <service-id>
```

Example:

```bash
yarn cron:run poong-today-daily
```

#### Run All Services Once

```bash
yarn cron:run-all
```

This will run all available services once, one after another.

#### List Available Services

```bash
yarn cron:list
```

This will show a list of all available services that can be run manually.

## Available Services

- `poong-today-daily`: PoongToday Daily Star Balloon service
- `poong-today-broadcast`: PoongToday Broadcast Channel History service
- `viewership`: Viewership Broadcast Channel Statistics service
- `youtube`: YouTube Broadcast Statistics service
- `playboard-broadcast`: Playboard Broadcast Statistics service
- `playboard-live-viewers`: Playboard Live Viewers Statistics service
- `playboard-super-chatted`: Playboard Super Chatted Statistics service
- `playboard-viewed`: Playboard Viewed Statistics service

## Customizing the Schedule

If you need to customize the schedule, you can modify the cron patterns in `src/services/cron/cron.service.ts`.

The cron patterns follow the standard cron syntax:

```
┌────────────── second (optional)
│ ┌──────────── minute
│ │ ┌────────── hour
│ │ │ ┌──────── day of month
│ │ │ │ ┌────── month
│ │ │ │ │ ┌──── day of week
│ │ │ │ │ │
│ │ │ │ │ │
* * * * * *
```

For example:

- `0 */3 * * *`: Every 3 hours
- `0 0 * * *`: Once a day at midnight
- `0 12 * * *`: Once a day at noon
