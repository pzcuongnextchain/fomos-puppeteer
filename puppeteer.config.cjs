// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const { join } = require("path");

/**
 * @type {import("puppeteer").Configuration}
 */
// eslint-disable-next-line no-undef
module.exports = {
  // Changes the cache location for Puppeteer.
  // eslint-disable-next-line no-undef
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
