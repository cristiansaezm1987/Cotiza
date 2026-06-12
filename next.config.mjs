/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min', 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'is-plain-object', 'clone-deep', 'merge-deep'],
    },
};

export default nextConfig;
