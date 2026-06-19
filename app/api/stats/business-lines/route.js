import { NextResponse } from 'next/server';
import { openDB } from '@/lib/db';

export async function GET(request) {
    try {
        const db = await openDB();
        const tendersRows = await db.all(`
            SELECT id, items_json, estado, monto_estimado
            FROM tenders
            WHERE estado IN ('Publicada', 'Cerrada', 'Adjudicada', 'publicada', 'cerrada', 'adjudicada')
            ORDER BY fecha_publicacion DESC
            LIMIT 500
        `);

        const lines = {
            'Computación y Tecnología': { count: 0, totalAmount: 0, keywords: ['computador', 'notebook', 'pc', 'impresora', 'toner', 'tóner', 'teclado', 'mouse', 'monitor', 'disco', 'software', 'licencia', 'tecnología', 'cable'] },
            'Aseo e Higiene': { count: 0, totalAmount: 0, keywords: ['aseo', 'limpieza', 'cloro', 'basura', 'papel higiénico', 'toalla', 'detergente', 'jabon', 'jabón', 'escoba', 'mopa'] },
            'Insumos Médicos': { count: 0, totalAmount: 0, keywords: ['medico', 'médico', 'jeringa', 'guante', 'mascarilla', 'alcohol', 'gasa', 'suero', 'dental', 'clínico'] },
            'Ferretería y Construcción': { count: 0, totalAmount: 0, keywords: ['ferretería', 'herramienta', 'clavo', 'madera', 'cemento', 'pintura', 'taladro', 'sierra', 'martillo', 'tornillo', 'tubo'] },
            'Oficina y Escritorio': { count: 0, totalAmount: 0, keywords: ['oficina', 'escritorio', 'resma', 'lapiz', 'lápiz', 'cuaderno', 'tinta', 'carpeta', 'archivador', 'corchetera'] },
            'Otros': { count: 0, totalAmount: 0, keywords: [] }
        };

        for (const row of tendersRows) {
            let items = [];
            try {
                items = JSON.parse(row.items_json);
            } catch (e) {}

            let assigned = false;
            let amount = parseFloat(row.monto_estimado) || 0;

            if (items && items.length > 0) {
                const text = items.map(i => (i.nombre + " " + i.descripcion)).join(" ").toLowerCase();
                
                for (const [line, data] of Object.entries(lines)) {
                    if (line === 'Otros') continue;
                    
                    if (data.keywords.some(kw => text.includes(kw))) {
                        data.count++;
                        data.totalAmount += amount;
                        assigned = true;
                        break;
                    }
                }
            }

            if (!assigned) {
                lines['Otros'].count++;
                lines['Otros'].totalAmount += amount;
            }
        }

        const result = Object.entries(lines).map(([name, data]) => ({
            name,
            count: data.count,
            totalAmount: data.totalAmount,
            avgAmount: data.count > 0 ? data.totalAmount / data.count : 0
        })).filter(l => l.count > 0).sort((a, b) => b.count - a.count);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error("Error en API /stats/business-lines:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
