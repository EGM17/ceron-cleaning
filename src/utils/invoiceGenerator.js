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
  
  // Company header with logo
  let yPosition = 20;
  
  if (companySettings?.logo) {
    try {
      // Load image using HTML Image element to avoid CORS
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Create canvas to convert image to base64
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png');
            
            // Add logo to PDF
            doc.addImage(base64, 'PNG', 20, 10, 30, 30);
            resolve();
          } catch (error) {
            console.error('Error converting image:', error);
            resolve(); // Continue without logo
          }
        };
        img.onerror = () => {
          console.error('Error loading logo');
          resolve(); // Continue without logo
        };
        img.src = companySettings.logo;
      });
      
      yPosition = 20;
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  }
  
  // Company name and info (right side of logo or top if no logo)
  const companyX = companySettings?.logo ? 55 : 20;
  
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text(companySettings?.name || 'CERON CLEANING', companyX, yPosition);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  let infoY = yPosition + 7;
  if (companySettings?.address) {
    doc.text(companySettings.address, companyX, infoY);
    infoY += 5;
  }
  
  const cityStateZip = [
    companySettings?.city,
    companySettings?.state,
    companySettings?.zipCode
  ].filter(Boolean).join(', ');
  
  if (cityStateZip) {
    doc.text(cityStateZip, companyX, infoY);
    infoY += 5;
  }
  
  if (companySettings?.phone) {
    doc.text(`Phone: ${companySettings.phone}`, companyX, infoY);
    infoY += 5;
  }
  
  if (companySettings?.email) {
    doc.text(`Email: ${companySettings.email}`, companyX, infoY);
    infoY += 5;
  }
  
  if (companySettings?.website) {
    doc.text(`Website: ${companySettings.website}`, companyX, infoY);
  }
  
  // Invoice title and number (top right)
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', 150, 20);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 150, 30);
  doc.text(`Date: ${formatDateUS(invoice.date)}`, 150, 35);
  doc.text(`Due Date: ${formatDateUS(invoice.dueDate)}`, 150, 40);
  
  // Client information
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Bill To:', 20, 55);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  let clientY = 62;
  doc.text(client.name || 'N/A', 20, clientY);
  clientY += 5;
  
  if (client.company) {
    doc.text(client.company, 20, clientY);
    clientY += 5;
  }
  
  if (client.address) {
    doc.text(client.address, 20, clientY);
    clientY += 5;
  }
  
  if (client.phone) {
    doc.text(`Phone: ${client.phone}`, 20, clientY);
    clientY += 5;
  }
  
  if (client.email) {
    doc.text(`Email: ${client.email}`, 20, clientY);
  }
  
  // Job details
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Job Details:', 20, 95);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const jobType = job.jobType ? 
    (job.jobType === 'residential' ? 'Residential' : 'Commercial') : 
    'N/A';
  
  doc.text(`Job Type: ${jobType}`, 20, 102);
  doc.text(`Service Date: ${formatDateUS(job.date)}`, 20, 107);
  
  if (job.location) {
    doc.text(`Location: ${job.location}`, 20, 112);
  }
  
  if (job.description) {
    doc.text('Description:', 20, 117);
    const splitDescription = doc.splitTextToSize(job.description, 170);
    doc.text(splitDescription, 20, 122);
  }
  
  // Items table
  const tableData = [];
  
  // Main service
  tableData.push([
    '1',
    invoice.serviceDescription || 'Cleaning Service',
    '1',
    formatCurrency(invoice.baseAmount),
    formatCurrency(invoice.baseAmount)
  ]);
  
  // Additional charges
  if (invoice.additionalCharges && invoice.additionalCharges.length > 0) {
    invoice.additionalCharges.forEach((charge, index) => {
      tableData.push([
        (index + 2).toString(),
        charge.description,
        '1',
        formatCurrency(charge.amount),
        formatCurrency(charge.amount)
      ]);
    });
  }
  
  const tableStartY = job.description ? 130 : 115;
  
  doc.autoTable({
    startY: tableStartY,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [9, 109, 217] },
    margin: { left: 20, right: 20 }
  });
  
  // Calculate totals
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.text('Subtotal:', 130, finalY);
  doc.text(formatCurrency(invoice.subtotal), 180, finalY, { align: 'right' });
  
  if (invoice.discount > 0) {
    doc.text(`Discount (${invoice.discountPercent || 0}%):`, 130, finalY + 7);
    doc.text(`-${formatCurrency(invoice.discount)}`, 180, finalY + 7, { align: 'right' });
  }
  
  if (invoice.tax > 0) {
    doc.text(`Tax (${invoice.taxPercent || 0}%):`, 130, finalY + 14);
    doc.text(formatCurrency(invoice.tax), 180, finalY + 14, { align: 'right' });
  }
  
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('Total:', 130, finalY + 21);
  doc.text(formatCurrency(invoice.total), 180, finalY + 21, { align: 'right' });
  
  // Payment info
  if (invoice.payments && invoice.payments.length > 0) {
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid:', 130, finalY + 28);
    doc.text(formatCurrency(totalPaid), 180, finalY + 28, { align: 'right' });
    
    doc.setFont(undefined, 'bold');
    doc.text('Balance Due:', 130, finalY + 35);
    doc.text(formatCurrency(invoice.total - totalPaid), 180, finalY + 35, { align: 'right' });
  }
  
  // Footer
  doc.setFontSize(9);
  doc.setFont(undefined, 'italic');
  doc.text('Thank you for your business!', 105, 270, { align: 'center' });
  
  const companyName = companySettings?.name || 'CERON CLEANING';
  doc.text(`Payment is due within 30 days. Please make checks payable to ${companyName}.`, 105, 275, { align: 'center' });
  
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