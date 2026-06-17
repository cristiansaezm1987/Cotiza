import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        async def handle_request(route):
            request = route.request
            if "api.buscador.mercadopublico.cl" in request.url:
                print(f"URL: {request.url}")
                print("HEADERS:")
                for k, v in request.headers.items():
                    print(f"  {k}: {v}")
            await route.continue_()

        await page.route("**/*", handle_request)
        await page.goto("https://buscador.mercadopublico.cl/compra-agil")
        await page.wait_for_timeout(3000)
        await browser.close()

asyncio.run(main())
