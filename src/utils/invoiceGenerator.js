import jsPDF from 'jspdf';
import 'jspdf-autotable';

// US Date format: MM/DD/YYYY
const formatDateUS = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

export const generateInvoicePDF = async (invoice, client, job, companySettings = null) => {
  const doc = new jsPDF();
  
  // Light blue background for ENTIRE page
  doc.setFillColor(230, 240, 250);
  doc.rect(0, 0, 210, 297, 'F');
  
  // White square background for logo
  if (companySettings?.logo) {
    doc.setFillColor(255, 255, 255);
    doc.rect(15, 10, 45, 45, 'F');
  }
  
  // Company logo
  let logoLoaded = false;
  if (companySettings?.logo) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png');
            
            doc.addImage(base64, 'PNG', 20, 15, 35, 35);
            logoLoaded = true;
            resolve();
          } catch (error) {
            console.error('Error converting image:', error);
            resolve();
          }
        };
        img.onerror = () => resolve();
        img.src = companySettings.logo;
      });
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }
  
  // Company name (to the right of logo)
  doc.setTextColor(41, 98, 165);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(16);
  doc.text(companySettings?.name || 'Ceron Cleaning', logoLoaded ? 65 : 20, 32);
  
  // INVOICE title (right side, larger)
  doc.setTextColor(41, 98, 165);
  doc.setFontSize(34); // Was 28, now 34 (21% bigger)
  doc.text('Invoice', 190, 32, { align: 'right' });
  
  // To: section (left side, larger text)
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12); // Was 10, now 12 (20% bigger)
  doc.text('To:', 20, 65);
  
  doc.setTextColor(41, 98, 165);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11); // Was 9, now 11 (22% bigger)
  doc.text(client.name.toUpperCase(), 20, 72);
  
  doc.setTextColor(0, 0, 0);
  let toY = 78;
  
  if (client.address) {
    doc.text(client.address, 20, toY);
    toY += 6;
  }
  if (client.city || client.state || client.zipCode) {
    const cityLine = `${client.city || ''} ${client.state || ''},${client.zipCode || ''}`.trim();
    doc.text(cityLine, 20, toY);
    toY += 6;
  }
  if (client.phone) {
    doc.text(`(${client.phone.substring(0,3)}) ${client.phone.substring(3,6)}${client.phone.substring(6)}`, 20, toY);
    toY += 6;
  }
  
  // Invoice details (right side, larger)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11); // Was 9, now 11 (22% bigger)
  doc.text(`Date: ${formatDateUS(invoice.date)}`, 190, 65, { align: 'right' });
  doc.text(`Invoice #: ${invoice.invoiceNumber.replace('INV-', '')}`, 190, 71, { align: 'right' });
  
  // Direct mail (right side, blue, larger)
  if (client.email) {
    doc.setTextColor(41, 98, 165);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10); // Was 8, now 10 (25% bigger)
    doc.text('DIRECT MAIL:', 190, 79, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.text(client.email, 190, 85, { align: 'right' });
    if (client.alternateEmail) {
      doc.text(client.alternateEmail, 190, 91, { align: 'right' });
    }
  }
  
  // Table with yellow header and alternating rows
  const tableData = [];
  
  // Main service row
  tableData.push([
    formatDateUS(job.date),
    invoice.serviceDescription || 'Cleaning Service',
    '1',
    formatCurrency(invoice.baseAmount),
    formatCurrency(invoice.baseAmount)
  ]);
  
  // Additional charges (if any)
  if (invoice.additionalCharges && invoice.additionalCharges.length > 0) {
    invoice.additionalCharges.forEach((charge) => {
      tableData.push([
        charge.date ? formatDateUS(charge.date) : '',
        charge.description,
        '1',
        formatCurrency(charge.amount),
        formatCurrency(charge.amount)
      ]);
    });
  }
  
  // Empty rows (8 rows total, NO TEXT)
  for (let i = 0; i < 8; i++) {
    tableData.push(['', '', '', '', '']);
  }
  
  const tableStartY = 105;
  
  doc.autoTable({
    startY: tableStartY,
    head: [['DUE DATE', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT']],
    body: tableData,
    theme: 'plain',
    headStyles: { 
      fillColor: [255, 215, 0], // Yellow
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      lineWidth: 0
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 2.5, // Reduced from 4 to 2.5
      lineWidth: 0
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 32 },
      1: { halign: 'left', cellWidth: 78 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 }
    },
    margin: { left: 10, right: 10 },
    didParseCell: function(data) {
      if (data.section === 'body') {
        // Alternating pattern: white, blue, white, blue...
        if (data.row.index % 2 === 0) {
          data.cell.styles.fillColor = [255, 255, 255]; // White
        } else {
          data.cell.styles.fillColor = [230, 240, 250]; // Light blue
        }
      }
    }
  });
  
  // Totals section with spacing and alternating colors
  const finalY = doc.lastAutoTable.finalY + 5; // Add 5pt spacing
  
  const totalsData = [];
  totalsData.push(['Subtotal', formatCurrency(invoice.subtotal)]);
  totalsData.push(['Sales Tax', invoice.tax > 0 ? formatCurrency(invoice.tax) : '']);
  totalsData.push(['Total', formatCurrency(invoice.total)]);
  
  doc.autoTable({
    startY: finalY,
    body: totalsData,
    theme: 'plain',
    bodyStyles: {
      fontSize: 11,
      cellPadding: 3, // Reduced from 4 to 3
      lineWidth: 0
    },
    columnStyles: {
      0: { halign: 'right', cellWidth: 35, textColor: [0, 0, 0] },
      1: { halign: 'right', cellWidth: 32, textColor: [0, 0, 0] }
    },
    margin: { left: 125 },
    didParseCell: function(data) {
      // Alternating: blue (0), white (1), blue (2)
      if (data.row.index === 0) {
        data.cell.styles.fillColor = [230, 240, 250]; // Blue
      } else if (data.row.index === 1) {
        data.cell.styles.fillColor = [255, 255, 255]; // White
      } else if (data.row.index === 2) {
        data.cell.styles.fillColor = [230, 240, 250]; // Blue
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [41, 98, 165];
        data.cell.styles.fontSize = 12;
      }
    }
  });
  
  const footerY = doc.lastAutoTable.finalY + 20;
  
  // Footer
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('Make all checks payable to Ceron Cleaning', 105, footerY, { align: 'center' });
  
  doc.setFont(undefined, 'italic');
  doc.setFontSize(10);
  doc.text('Thank you for your business!', 105, footerY + 8, { align: 'center' });
  
  // Company address footer (smaller to fit)
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const footerAddress = companySettings?.address && companySettings?.city && companySettings?.state ?
    `${companySettings.address}, ${companySettings.city}, ${companySettings.state} ${companySettings.zipCode || ''} | ${companySettings.email || ''}` :
    '703 NW 59th St, Vancouver, WA 98663 | cleaningceron@gmail.com';
  doc.text(footerAddress, 105, footerY + 15, { align: 'center' });
  
  return doc;
};

export const downloadInvoice = async (invoice, client, job, companySettings) => {
  const doc = await generateInvoicePDF(invoice, client, job, companySettings);
  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
};

export const getInvoiceBlob = async (invoice, client, job, companySettings) => {
  const doc = await generateInvoicePDF(invoice, client, job, companySettings);
  return doc.output('blob');
};