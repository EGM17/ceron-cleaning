import { formatDate, formatCurrency } from '../../utils/helpers';
import { Download, X } from 'lucide-react';
import { downloadInvoice } from '../../utils/invoiceGenerator';

const InvoicePreview = ({ invoice, onClose }) => {
  const handleDownload = () => {
    if (invoice.client && invoice.job) {
      downloadInvoice(invoice, invoice.client, invoice.job);
    }
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CERON CLEANING</h1>
          <p className="text-gray-600">Commercial & Residential Cleaning</p>
          <p className="text-gray-600">Vancouver, WA</p>
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
            <p className="text-gray-600">Type: <span className="font-medium text-gray-900 capitalize">{invoice.job.type}</span></p>
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
        <div className="mb-8">
          <table className="w-full">
            <thead className="border-b-2 border-gray-300">
              <tr>
                <th className="text-left py-3 text-gray-700 font-semibold">#</th>
                <th className="text-left py-3 text-gray-700 font-semibold">Description</th>
                <th className="text-right py-3 text-gray-700 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-3 text-gray-600">1</td>
                <td className="py-3 text-gray-900">Cleaning Service</td>
                <td className="py-3 text-right text-gray-900">{formatCurrency(invoice.baseAmount)}</td>
              </tr>
              {invoice.additionalCharges?.map((charge, index) => (
                <tr key={index}>
                  <td className="py-3 text-gray-600">{index + 2}</td>
                  <td className="py-3 text-gray-900">{charge.description}</td>
                  <td className="py-3 text-right text-gray-900">{formatCurrency(charge.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount {invoice.discountPercent > 0 && `(${invoice.discountPercent}%)`}:</span>
                <span className="font-medium text-red-600">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax {invoice.taxPercent > 0 && `(${invoice.taxPercent}%)`}:</span>
                <span className="font-medium text-gray-900">{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="border-t-2 border-gray-300 pt-2 flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Amount Paid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-red-600">
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
        <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
          <p>Thank you for your business!</p>
          <p className="mt-2">Payment is due within 30 days. Please make checks payable to CERON CLEANING.</p>
        </div>
      </div>

      {/* Close button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="btn btn-secondary"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default InvoicePreview;