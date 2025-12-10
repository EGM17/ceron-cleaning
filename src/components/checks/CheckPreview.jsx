import { formatDate, formatCurrency } from '../../utils/helpers';
import { Calendar, DollarSign, Building2, FileText, Image as ImageIcon } from 'lucide-react';

const CheckPreview = ({ check, onClose }) => {
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      deposited: 'bg-green-100 text-green-800',
      bounced: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Status badge */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Check #{check.checkNumber}</h3>
          <p className="text-sm text-gray-500 mt-1">Registered on {formatDate(check.createdAt)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(check.status)}`}>
          {check.status}
        </span>
      </div>

      {/* Check details grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Client</label>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {check.client?.name || 'Unknown'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Building2 size={16} />
              Bank
            </label>
            <p className="text-lg text-gray-900 mt-1">{check.bank}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <DollarSign size={16} />
              Amount
            </label>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(check.amount)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Calendar size={16} />
              Check Date
            </label>
            <p className="text-lg text-gray-900 mt-1">{formatDate(check.checkDate)}</p>
          </div>

          {check.depositDate && (
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Calendar size={16} />
                Deposit Date
              </label>
              <p className="text-lg text-gray-900 mt-1">{formatDate(check.depositDate)}</p>
            </div>
          )}

          {check.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <FileText size={16} />
                Notes
              </label>
              <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">
                {check.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Check photo */}
      {check.photo && (
        <div>
          <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
            <ImageIcon size={16} />
            Check Photo
          </label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <img
              src={check.photo}
              alt="Check"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Close button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      </div>
    </div>
  );
};

export default CheckPreview;