/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: [
        'puppeteer-core', '@sparticuz/chromium-min', 'puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 
        'merge-deep', 'clone-deep', 'is-plain-object', 'isobject', 'for-own', 'kind-of', 'shallow-clone', 'for-in', 'mixin-object', 'lazy-cache', 'is-extendable'
    ],
    experimental: {
        outputFileTracingIncludes: {
            '/api/**/*': [
                './node_modules/puppeteer-extra/**/*',
                './node_modules/puppeteer-extra-plugin-stealth/**/*',
                './node_modules/merge-deep/**/*',
                './node_modules/clone-deep/**/*',
                './node_modules/is-plain-object/**/*',
                './node_modules/isobject/**/*',
                './node_modules/kind-of/**/*',
                './node_modules/shallow-clone/**/*',
                './node_modules/for-own/**/*',
                './node_modules/for-in/**/*',
                './node_modules/mixin-object/**/*',
                './node_modules/lazy-cache/**/*',
                './node_modules/is-extendable/**/*'
            ]
        }
    }
};

export default nextConfig;
