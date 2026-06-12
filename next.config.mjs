/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min', 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'merge-deep', 'clone-deep', 'is-plain-object'],
    experimental: {
        outputFileTracingIncludes: {
            '/api/**/*': [
                './node_modules/puppeteer-extra/**/*',
                './node_modules/puppeteer-extra-plugin-stealth/**/*',
                './node_modules/merge-deep/**/*',
                './node_modules/clone-deep/**/*',
                './node_modules/is-plain-object/**/*'
            ]
        }
    }
};

export default nextConfig;
