import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = (tender, draft, finalCalc) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185);
    doc.text("COTIZACIÓN FORMAL", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const date = new Date().toLocaleDateString('es-CL');
    doc.text(`Fecha: ${date}`, 170, 30);
    
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + (Number(draft.validityDays) || 30));
    doc.text(`Válido hasta: ${validDate.toLocaleDateString('es-CL')}`, 170, 35);

    // Business Info Placeholder (Can be edited by user later)
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("De: Mi Empresa SpA", 14, 30);
    doc.text("RUT: 76.XXX.XXX-X", 14, 35);
    doc.text("Contacto: ventas@miempresa.cl", 14, 40);

    // Client Info
    doc.text(`Para: ${tender.organization || 'Mercado Público'}`, 14, 55);
    doc.text(`Licitación ID: ${tender.id}`, 14, 60);
    
    // Description
    doc.setFontSize(10);
    const splitTitle = doc.splitTextToSize(`Referencia: ${tender.name}`, 180);
    doc.text(splitTitle, 14, 70);

    // Items Breakdown (if detailed data exists)
    let bodyData = [];
    if (draft.itemsData && draft.itemsData.length > 0) {
        bodyData = draft.itemsData.map(item => [
            item.selectedTitle || item.nombre,
            item.qty.toString(),
            `$${(item.unitCost || 0).toLocaleString('es-CL')}`,
            `$${(item.totalFinalPrice || 0).toLocaleString('es-CL')}`
        ]);
        bodyData.push(['Servicio de Despacho', '1 Global', `$${finalCalc.finalShipping.toLocaleString('es-CL')}`, `$${finalCalc.finalShipping.toLocaleString('es-CL')}`]);
    } else {
        // Fallback
        bodyData = [
            ['Productos solicitados según bases', '1 Global', `$${finalCalc.finalProduct.toLocaleString('es-CL')}`, `$${finalCalc.finalProduct.toLocaleString('es-CL')}`],
            ['Servicio de Despacho', '1 Global', `$${finalCalc.finalShipping.toLocaleString('es-CL')}`, `$${finalCalc.finalShipping.toLocaleString('es-CL')}`]
        ];
    }

    // Table
    autoTable(doc, {
      startY: 85,
      headStyles: { fillColor: [41, 128, 185] },
      head: [['Descripción', 'Cantidad', 'Valor Unitario Neto', 'Subtotal Neto']],
      body: bodyData,
      foot: [
        ['', '', 'TOTAL NETO:', `$${finalCalc.total.toLocaleString('es-CL')}`]
      ],
      footStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: 'bold' }
    });

    // Footer notes
    const finalY = doc.lastAutoTable?.finalY || 120;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Notas:", 14, finalY + 10);
    doc.text("- Los valores expresados son netos (no incluyen IVA).", 14, finalY + 15);
    doc.text("- Cumplimiento total de las especificaciones técnicas solicitadas en anexos.", 14, finalY + 20);

    doc.save(`Cotizacion_${tender.id}.pdf`);
};
