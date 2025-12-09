import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate, formatCurrency } from './helpers';

export const generateInvoicePDF = (invoice, client, job) => {
  const doc = new jsPDF();
  
  // Company header
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('CERON CLEANING', 20, 20);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Commercial & Residential Cleaning', 20, 27);
  doc.text('Vancouver, WA', 20, 32);
  doc.text('Phone: (360) XXX-XXXX', 20, 37);
  doc.text('Email: info@ceroncleaning.com', 20, 42);
  
  // Invoice title and number
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', 150, 20);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 150, 30);
  doc.text(`Date: ${formatDate(invoice.date)}`, 150, 35);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 150, 40);
  
  // Client information
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Bill To:', 20, 55);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(client.name, 20, 62);
  if (client.company) doc.text(client.company, 20, 67);
  if (client.address) doc.text(client.address, 20, 72);
  if (client.phone) doc.text(`Phone: ${client.phone}`, 20, 77);
  if (client.email) doc.text(`Email: ${client.email}`, 20, 82);
  
  // Job details
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Job Details:', 20, 95);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Job Type: ${job.type}`, 20, 102);
  doc.text(`Service Date: ${formatDate(job.date)}`, 20, 107);
  if (job.description) {
    doc.text('Description:', 20, 112);
    const splitDescription = doc.splitTextToSize(job.description, 170);
    doc.text(splitDescription, 20, 117);
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
  
  doc.autoTable({
    startY: job.description ? 130 : 115,
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
  doc.text('Payment is due within 30 days. Please make checks payable to CERON CLEANING.', 105, 275, { align: 'center' });
  
  return doc;
};

export const downloadInvoice = (invoice, client, job) => {
  const doc = generateInvoicePDF(invoice, client, job);
  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
};

export const getInvoiceBlob = (invoice, client, job) => {
  const doc = generateInvoicePDF(invoice, client, job);
  return doc.output('blob');
};