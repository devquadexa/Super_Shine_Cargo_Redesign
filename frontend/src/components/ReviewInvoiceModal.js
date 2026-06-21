import React, { useState, useEffect } from 'react';

function ReviewInvoiceModal({ show, onClose, job, assignedClerks, onSubmit, loading }) {
  const [selectedClerk, setSelectedClerk] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      setSelectedClerk('');
      setReviewNotes('');
      setErrors({});
    }
  }, [show]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedClerk) {
      newErrors.selectedClerk = 'Please select a clerk to review the invoice';
    }
    
    if (!reviewNotes.trim()) {
      newErrors.reviewNotes = 'Please add review details or notes';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const reviewData = {
      jobId: job.jobId,
      clerkId: selectedClerk,
      reviewNotes: reviewNotes.trim(),
      payItems: job.payItems || [],
      invoiceDetails: {
        jobReference: job.jobId,
        customer: job.customerId,
        shipmentCategory: job.shipmentCategory,
        totalAmount: job.payItems?.reduce((sum, item) => sum + (parseFloat(item.billingAmount) || 0), 0) || 0
      }
    };

    await onSubmit(reviewData);
    
    // Reset form
    setSelectedClerk('');
    setReviewNotes('');
    setErrors({});
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">📋 Review Invoice Before Generation</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-96 overflow-y-auto">
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Job ID:</p>
                  <p className="text-gray-900 font-semibold">{job.jobId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Shipment Category:</p>
                  <p className="text-gray-900 font-semibold">{job.shipmentCategory}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Amount:</p>
                  <p className="text-gray-900 font-bold text-lg">
                    LKR {(job.payItems?.reduce((sum, item) => sum + (parseFloat(item.billingAmount) || 0), 0) || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Clerk for Review <span className="text-red-600">*</span>
              </label>
              <select
                id="clerk-select"
                value={selectedClerk}
                onChange={(e) => {
                  setSelectedClerk(e.target.value);
                  if (errors.selectedClerk) {
                    setErrors({ ...errors, selectedClerk: '' });
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  errors.selectedClerk
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
              >
                <option value="">-- Select a clerk --</option>
                {assignedClerks && assignedClerks.length > 0 ? (
                  assignedClerks.map(clerk => (
                    <option key={clerk.userId} value={clerk.userId}>
                      {clerk.userName || clerk.fullName}
                    </option>
                  ))
                ) : (
                  <option disabled>No clerks assigned to this job</option>
                )}
              </select>
              {errors.selectedClerk && (
                <p className="mt-2 text-sm text-red-600">{errors.selectedClerk}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Review Details / Notes <span className="text-red-600">*</span>
              </label>
              <textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => {
                  setReviewNotes(e.target.value);
                  if (errors.reviewNotes) {
                    setErrors({ ...errors, reviewNotes: '' });
                  }
                }}
                placeholder="Enter review details, concerns, or notes about the invoice..."
                rows="6"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none ${
                  errors.reviewNotes
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
              />
              {errors.reviewNotes && (
                <p className="mt-2 text-sm text-red-600">{errors.reviewNotes}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !assignedClerks || assignedClerks.length === 0}
            >
              {loading ? '⏳ Sending Review...' : '✓ Send Review to Clerk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewInvoiceModal;
