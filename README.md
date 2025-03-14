# formoskr-parser

## Description

`formoskr-parser` is a web data scraping application built with Node.js and TypeScript. It is designed to extract data from websites, and currently includes scrapers for platforms like Playboard and Youtube. The application uses Puppeteer for browser automation and Express to serve the scraped data through an API.

## Technologies Used

- Node.js
- TypeScript
- Puppeteer & Puppeteer-extra (with Stealth plugin to avoid bot detection)
- Express
- dotenv (for environment variable management)

## Setup

### Prerequisites

- Node.js and npm or yarn installed.
- Docker and Docker Compose (optional, for containerized deployment).

### Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd obastan-parser
    ```

2.  Install dependencies using yarn:
    ```bash
    yarn install
    ```

### Environment Variables

Create a `.env` file in the root directory to configure environment variables. While not strictly necessary for basic operation based on the provided code, you might need to set environment variables for:

- `PORT`: The port the application will run on (default is 3000, or 8080 in Docker).
- `IS_HEADLESS`: Set to `false` to run Puppeteer in headed mode (for debugging), defaults to `true` (headless).
- `CHROME_BIN`: Path to your Chrome or Chromium executable if Puppeteer cannot find it automatically. This is often necessary in Docker environments.

Example `.env` file:

```env
PORT=8080
IS_HEADLESS=true
# CHROME_BIN=/usr/bin/chromium-browser # Example path in some linux environments
```

### Building and Running the Application

**Development Mode (with live reload):**

```bash
yarn dev
```

This command starts the application using `tsx watch`, which automatically restarts the server on file changes.

**Building for Production:**

```bash
yarn build
```

This command compiles the TypeScript code into JavaScript and places it in the `build` directory.

**Starting in Production Mode:**

```bash
yarn start
```

This command first builds the application and then starts the compiled JavaScript application from the `build` directory.

### Docker

The project includes a `Dockerfile` and `docker-compose.yml` for containerization.

**Build and run with Docker Compose (Development):**

```bash
docker-compose up --build
```

This command builds the Docker image and starts the application in a container using Docker Compose. The application will be accessible at `http://localhost:8080`. Code changes in your local directory are reflected in the container due to volume mounting.

**Build and run with Docker (Production):**

```bash
docker build -t obastan-parser .
docker run -d -p 8080:8080 obastan-parser
```

This builds a production Docker image and runs it in detached mode, accessible at `http://localhost:8080`.

## Usage

The application exposes API endpoints for accessing scraped data. Based on the `src/index.ts` file, the following routes are likely available:

- `/poong-today`: Potentially related to scraping data from "Poong Today".
- `/playboard-co`: Endpoints for scraping data from Playboard.co (e.g., super chats, viewers, broadcasts).
- `/viewership`: General viewership data endpoints.
- `/youtube`: Endpoints for scraping Youtube data.

Refer to the code in `src/routes` directory (specifically `src/routes/poong-today`, `src/routes/playboard-co`, `src/routes/viewership`, `src/routes/youtube`) for specific endpoint details and expected request/response formats.

**Example Request (Conceptual - check actual routes for specifics):**

GET http://localhost:8080/play
