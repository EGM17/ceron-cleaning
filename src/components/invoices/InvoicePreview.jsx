import { formatDate, formatCurrency } from '../../utils/helpers';
import { Download } from 'lucide-react';
import { downloadInvoice } from '../../utils/invoiceGenerator';

const InvoicePreview = ({ invoice, onClose, companySettings }) => {
  const handleDownload = async () => {
    if (!invoice.client) {
      alert('Missing client data');
      return;
    }
    
    // Job is optional - create fallback if missing
    const jobData = invoice.job || {
      date: invoice.date,
      jobType: 'general',
      location: invoice.client.address || ''
    };
    
    await downloadInvoice(invoice, invoice.client, jobData, companySettings);
  };

  return (
    <div className="space-y-6">
      {/* Preview header */}
      <div className="flex justify-between items-start pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
          <p className="text-sm text-gray-500 mt-1">{invoice.invoiceNumber}</p>
        </div>
        <button
          onClick={handleDownload}
          className="btn btn-primary flex items-center gap-2"
        >
          <Download size={16} />
          Download PDF
        </button>
      </div>

      {/* Invoice content */}
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        {/* Company header */}
        <div className="flex items-start gap-4 mb-8">
          {companySettings?.logo && (
            <img 
              src={companySettings.logo} 
              alt="Company Logo" 
              className="w-20 h-20 object-contain"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{companySettings?.name || 'CERON CLEANING'}</h1>
            <p className="text-gray-600">{companySettings?.address || ''}</p>
            <p className="text-gray-600">
              {[companySettings?.city, companySettings?.state, companySettings?.zipCode]
                .filter(Boolean)
                .join(', ')}
            </p>
            {companySettings?.phone && <p className="text-gray-600">Phone: {companySettings.phone}</p>}
            {companySettings?.email && <p className="text-gray-600">Email: {companySettings.email}</p>}
            {companySettings?.website && <p className="text-gray-600">Website: {companySettings.website}</p>}
          </div>
        </div>

        {/* Invoice info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
            <p className="text-gray-900 font-medium">{invoice.client?.name}</p>
            {invoice.client?.company && <p className="text-gray-600">{invoice.client.company}</p>}
            {invoice.client?.address && <p className="text-gray-600">{invoice.client.address}</p>}
            {invoice.client?.phone && <p className="text-gray-600">Phone: {invoice.client.phone}</p>}
            {invoice.client?.email && <p className="text-gray-600">Email: {invoice.client.email}</p>}
          </div>
          
          <div className="text-right">
            <div className="mb-4">
              <p className="text-gray-600">Invoice #: <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span></p>
              <p className="text-gray-600">Date: <span className="font-medium text-gray-900">{formatDate(invoice.date)}</span></p>
              {invoice.dueDate && (
                <p className="text-gray-600">Due Date: <span className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Job details */}
        {invoice.job && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Job Details:</h3>
            <p className="text-gray-600">Type: <span className="font-medium text-gray-900 capitalize">{invoice.job.jobType || 'N/A'}</span></p>
            <p className="text-gray-600">Date: <span className="font-medium text-gray-900">{formatDate(invoice.job.date)}</span></p>
            {invoice.job.location && (
              <p className="text-gray-600">Location: <span className="font-medium text-gray-900">{invoice.job.location}</span></p>
            )}
          </div>
        )}

        {/* Service description */}
        {invoice.serviceDescription && (
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-2">Service Description:</h3>
            <p className="text-gray-600">{invoice.serviceDescription}</p>
          </div>
        )}

        {/* Items table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-gray-600">#</th>
              <th className="text-left py-2 text-gray-600">Description</th>
              <th className="text-right py-2 text-gray-600">Qty</th>
              <th className="text-right py-2 text-gray-600">Unit Price</th>
              <th className="text-right py-2 text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">1</td>
              <td className="py-3">{invoice.serviceDescription || 'Cleaning Service'}</td>
              <td className="text-right py-3">1</td>
              <td className="text-right py-3">{formatCurrency(invoice.baseAmount)}</td>
              <td className="text-right py-3">{formatCurrency(invoice.baseAmount)}</td>
            </tr>
            {invoice.additionalCharges && invoice.additionalCharges.map((charge, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-3">{index + 2}</td>
                <td className="py-3">
                  <div>
                    <p>{charge.description}</p>
                    {charge.date && (
                      <p className="text-xs text-gray-500">
                        Due: {formatDate(charge.date)}
                      </p>
                    )}
                  </div>
                </td>
                <td className="text-right py-3">1</td>
                <td className="text-right py-3">{formatCurrency(charge.amount)}</td>
                <td className="text-right py-3">{formatCurrency(charge.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount ({invoice.discountPercent || 0}%):</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({invoice.taxPercent || 0}%):</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t-2 border-gray-200">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(invoice.total - invoice.amountPaid)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Notes:</h3>
            <p className="text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm border-t border-gray-200 pt-6">
          <p className="mb-2">Thank you for your business!</p>
          <p>Payment is due within 30 days. Please make checks payable to {companySettings?.name || 'CERON CLEANING'}.</p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;