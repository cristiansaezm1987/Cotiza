/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min', 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth'],
    },
};

export default nextConfig;
