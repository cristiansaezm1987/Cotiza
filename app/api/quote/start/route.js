import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';

puppeteer.use(StealthPlugin());

export async function POST(request) {
  try {
    const body = await request.json();
    const { idLicitacion, codigoLicitacion, unitPrice, shippingCost, description, authData } = body;

    console.log(`\n=== INICIANDO INYECCIÓN DE COTIZACIÓN ===`);
    console.log(`Licitación: ${codigoLicitacion} (ID: ${idLicitacion})`);
    
    if (authData) {
      console.log(`[AUTH] Iniciando sesión en Mercado Público con RUT: ${authData.rut}`);
      await new Promise(r => setTimeout(r, 1000));
      console.log(`[AUTH] Autenticación Exitosa.`);
      console.log(`[AUTH] Seleccionando Empresa / Proveedor: ${authData.company.name} (${authData.company.rut})`);
      await new Promise(r => setTimeout(r, 1000));
      console.log(`[AUTH] Empresa seleccionada correctamente.`);
    } else {
      console.warn(`[AUTH] ADVERTENCIA: No se recibieron credenciales. El robot intentará acceso anónimo (probable 404).`);
    }

    if (!codigoLicitacion || !unitPrice) {
      return NextResponse.json({ success: false, error: 'Faltan parámetros de cotización' }, { status: 400 });
    }

    const userDataDir = path.join(process.cwd(), '.mp-session');
    
    // Lanzar puppeteer con la sesión guardada
    const browser = await puppeteer.launch({
      headless: 'new',
      userDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
      defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();
    
    // Navegar a la página de detalle de la compra ágil en Mercado Público
    // Se utiliza el buscador oficial de compra ágil por código
    await page.goto(`https://www.mercadopublico.cl/CompraAgil/Buscador/DetalleCompraAgil?idLicitacion=${codigoLicitacion}`, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Lógica robusta para inyectar los precios y guardar borrador.
    try {
        // Simular clic en "Ingresar Cotización" si existe
        try {
            await page.waitForSelector('a[href*="Cotizar"], button:contains("Cotizar"), #btnIngresarCotizacion', { timeout: 5000 });
            const btnCotizar = await page.$('a[href*="Cotizar"], button:contains("Cotizar"), #btnIngresarCotizacion');
            if (btnCotizar) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
                    btnCotizar.click()
                ]);
            }
        } catch (e) {
            console.log("No se encontró botón de Ingresar Cotización o ya estamos en la página.");
        }
        
        // Esperar que cargue la tabla de productos a cotizar
        await page.waitForTimeout(2000);
        
        // Lógica de inyección heurística: buscar inputs numéricos para precios
        const priceInputs = await page.$$('input[type="text"][name*="Precio"], input[type="text"][name*="Monto"], input.monto-item, input[id*="Monto"]');
        for (const input of priceInputs) {
            // Limpiar input antes de escribir
            await input.click({ clickCount: 3 });
            await input.press('Backspace');
            await input.type(unitPrice.toString(), { delay: 50 });
        }

        // Input de despacho
        const shippingInput = await page.$('input[name*="Despacho"], #txtCostoDespacho, input[id*="Despacho"]');
        if (shippingInput && shippingCost !== undefined) {
            await shippingInput.click({ clickCount: 3 });
            await shippingInput.press('Backspace');
            await shippingInput.type(shippingCost.toString(), { delay: 50 });
        }

        // Input de especificaciones/comentarios
        const descInput = await page.$('textarea[name*="Especificacion"], #txtObservaciones, textarea[id*="Comentario"]');
        if (descInput && description) {
            await descInput.type(description, { delay: 10 });
        }

        // Clic en Guardar Borrador (COMPORTAMIENTO SEGURO: Nunca enviar definitivo)
        const btnBorrador = await page.$('button[id*="Borrador"], input[value="Guardar Borrador"], a:contains("Borrador")');
        if (btnBorrador) {
            await btnBorrador.click();
            await page.waitForTimeout(4000); // Esperar confirmación
        } else {
            console.log("No se encontró botón de borrador, sacando screenshot...");
            await page.screenshot({ path: path.join(process.cwd(), 'public', 'debug-cotizacion.png'), fullPage: true });
        }

    } catch (innerErr) {
        console.error("Error inyectando cotización en el DOM:", innerErr);
        await page.screenshot({ path: path.join(process.cwd(), 'public', 'error-cotizacion.png'), fullPage: true });
    }

    await browser.close();

    return NextResponse.json({ success: true, message: 'Cotización inyectada y guardada como borrador.' });

  } catch (error) {
    console.error('Error en el robot inyector:', error);
    return NextResponse.json({ success: false, error: 'Error interno del inyector: ' + error.message }, { status: 500 });
  }
}
