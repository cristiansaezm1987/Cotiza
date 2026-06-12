/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min', 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'merge-deep', 'clone-deep', 'is-plain-object', 'isobject', 'for-own', 'kind-of', 'shallow-clone', 'for-in', 'mixin-object'],
};

export default nextConfig;
