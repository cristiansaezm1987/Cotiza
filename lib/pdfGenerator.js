import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = (tender, draft, finalCalc) => {
    const doc = new jsPDF();
    
    // Load Company Profile from LocalStorage
    let companyProfile = {
        logoUrl: '',
        companyName: 'MI EMPRESA SPA',
        website: 'Santiago - Chile | www.miempresa.cl',
        phones: '+56 9 00000000',
        rut: '76.XXX.XXX-X'
    };
    try {
        const savedProfile = localStorage.getItem('companyProfile');
        if (savedProfile) {
            companyProfile = { ...companyProfile, ...JSON.parse(savedProfile) };
        }
    } catch (e) {
        console.warn("Could not load company profile", e);
    }

    const pageWidth = doc.internal.pageSize.width;
    const marginLeft = 15;
    const marginRight = 15;
    
    // ---------------- HEADER ----------------
    // Logo
    let currentY = 15;
    if (companyProfile.logoUrl) {
        try {
            // Attempt to add logo. Dimensions: max 40x20
            doc.addImage(companyProfile.logoUrl, 'PNG', marginLeft, currentY, 40, 20, '', 'FAST');
        } catch (e) {
            console.error("Error adding logo to PDF", e);
        }
    }
    
    // Company Info (Top Left, below logo)
    currentY += 25;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(companyProfile.companyName.toUpperCase() || 'MI EMPRESA SPA', marginLeft, currentY);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    currentY += 5;
    doc.text(companyProfile.website, marginLeft, currentY);
    currentY += 5;
    doc.text(companyProfile.phones, marginLeft, currentY);
    currentY += 5;
    doc.text(`RUT: ${companyProfile.rut}`, marginLeft, currentY);

    // Document Title and Info (Top Right)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("COTIZACIÓN", pageWidth - marginRight, 25, { align: "right" });
    
    // Quotation Info Table (Top Right)
    const dateStr = new Date().toLocaleDateString('es-CL');
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30); // 30 days validity
    const validStr = validDate.toLocaleDateString('es-CL');
    const yearStr = new Date().getFullYear();
    const cotNumber = `${tender.id.split('-')[0] || tender.id}-${yearStr}`; // Using Licitacion ID part

    autoTable(doc, {
        startY: 32,
        margin: { left: pageWidth - 125, right: marginRight }, // Align to right, wider table
        headStyles: { fillColor: [80, 80, 80], textColor: 255, fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 8, halign: 'center', textColor: 0 },
        head: [['FECHA', 'COTIZACIÓN #', 'CLIENTE ID', 'VÁLIDO HASTA']],
        body: [[dateStr, cotNumber, tender.id, validStr]],
        theme: 'grid',
        tableWidth: 110,
    });

    currentY = Math.max(currentY + 10, doc.lastAutoTable.finalY + 10);

    // ---------------- CLIENT BLOCK ----------------
    // Draw gray background for CLIENTE header
    doc.setFillColor(150, 150, 150);
    doc.rect(marginLeft, currentY, Math.min(100, pageWidth/2), 6, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("CLIENTE", marginLeft + 3, currentY + 4.5);
    
    currentY += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const pdfClientName = draft.pdfClientName || 'A quien corresponda';
    doc.text(pdfClientName, marginLeft, currentY);
    
    currentY += 5;
    doc.setFont("helvetica", "normal");
    const pdfDeliveryPlace = draft.pdfDeliveryPlace || 'Despacho a coordinar';
    doc.text(pdfDeliveryPlace, marginLeft, currentY);
    
    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.text(tender.organization || 'Mercado Público', marginLeft, currentY);
    
    currentY += 5;
    doc.setFont("helvetica", "normal");
    if (draft.pdfClientRut) {
        doc.text(draft.pdfClientRut, marginLeft, currentY);
        currentY += 5;
    }
    
    // Tender Name
    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Ref: Licitación ${tender.id}`, marginLeft, currentY);
    currentY += 5;
    doc.setFont("helvetica", "italic");
    const splitTenderName = doc.splitTextToSize(tender.name || '', pageWidth - marginLeft - marginRight);
    doc.text(splitTenderName, marginLeft, currentY);
    
    currentY += (splitTenderName.length * 5) + 5;

    // ---------------- PRODUCTS TABLE ----------------
    let tableBody = [];
    let netTotal = 0;

    if (draft.itemsData && draft.itemsData.length > 0) {
        tableBody = draft.itemsData.map(item => {
            const rowTotal = item.totalFinalPrice || 0;
            netTotal += rowTotal;
            return [
                item.selectedTitle || item.nombre,
                `$${(item.unitFinalPrice || 0).toLocaleString('es-CL')}`,
                item.qty.toString(),
                '-',
                `$${rowTotal.toLocaleString('es-CL')}`
            ];
        });
    } else {
        // Fallback if no specific items
        netTotal += finalCalc.finalProduct || 0;
        tableBody.push([
            'Productos solicitados según bases',
            `$${(finalCalc.finalProduct || 0).toLocaleString('es-CL')}`,
            '1',
            '-',
            `$${(finalCalc.finalProduct || 0).toLocaleString('es-CL')}`
        ]);
    }

    // Shipping row
    const shipping = finalCalc.finalShipping || 0;
    if (shipping > 0) {
        netTotal += shipping;
        tableBody.push([
            'Servicio de Despacho',
            `$${shipping.toLocaleString('es-CL')}`,
            '1',
            '-',
            `$${shipping.toLocaleString('es-CL')}`
        ]);
    }

    autoTable(doc, {
        startY: currentY,
        headStyles: { fillColor: [80, 80, 80], textColor: 255, fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, textColor: 50 },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Descripción
            1: { cellWidth: 25, halign: 'right' }, // Precio Unit.
            2: { cellWidth: 15, halign: 'center' }, // Cant
            3: { cellWidth: 20, halign: 'center' }, // Otros
            4: { cellWidth: 25, halign: 'right' }  // Total
        },
        head: [['DESCRIPCIÓN', 'PRECIO UNIT.', 'CANT.', 'OTROS', 'TOTAL']],
        body: tableBody,
        theme: 'striped',
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // ---------------- TOTALS AND TERMS ----------------
    // Calculate Taxes
    const iva = Math.round(netTotal * 0.19);
    const grossTotal = netTotal + iva;

    // Terms & Conditions Box (Left)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TÉRMINOS Y CONDICIONES", marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("1. Los valores expresados son netos, el IVA se refleja en el recuadro adjunto.", marginLeft, currentY + 6);
    doc.text(`2. Días de entrega: ${draft.pdfDeliveryDays || 'A convenir'} días hábiles desde OC.`, marginLeft, currentY + 11);
    doc.text("3. El pago se realizará a 30 días contra recepción conforme de la factura.", marginLeft, currentY + 16);
    doc.text("4. Cumplimiento íntegro de especificaciones técnicas solicitadas.", marginLeft, currentY + 21);

    // Totals Box (Right)
    const totalsX = pageWidth - marginRight - 65; // Moved further left to avoid overlap
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    
    // Subtotal
    doc.text("Subtotal", totalsX, currentY);
    doc.text(`$${netTotal.toLocaleString('es-CL')}`, pageWidth - marginRight, currentY, { align: "right" });
    
    // IVA
    doc.setFont("helvetica", "normal");
    doc.text("Impuesto (19% IVA)", totalsX, currentY + 8);
    doc.text(`$${iva.toLocaleString('es-CL')}`, pageWidth - marginRight, currentY + 8, { align: "right" });
    
    // Draw line
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX, currentY + 12, pageWidth - marginRight, currentY + 12);
    
    // TOTAL
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL COTIZACIÓN", totalsX, currentY + 18);
    doc.text(`$${grossTotal.toLocaleString('es-CL')}`, pageWidth - marginRight, currentY + 18, { align: "right" });

    // ---------------- FOOTER ----------------
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("Gracias por su preferencia.", pageWidth / 2, doc.internal.pageSize.height - 15, { align: "center" });

    doc.save(`Cotizacion_${tender.id}.pdf`);
};
