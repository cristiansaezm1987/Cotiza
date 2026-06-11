const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

(async () => {
    let browser;
    if (isVercel) {
      console.log("Vercel mode");
    } else {
      console.log("Local mode");
      const puppeteer = require('puppeteer');
      const { addExtra } = require('puppeteer-extra');
      const StealthPlugin = require('puppeteer-extra-plugin-stealth');
      const puppeteerExtraLocal = addExtra(puppeteer);
      puppeteerExtraLocal.use(StealthPlugin());

      browser = await puppeteerExtraLocal.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log("Browser launched locally!");
      await browser.close();
    }
})();
