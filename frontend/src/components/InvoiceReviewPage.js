import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { invoiceReviewService } from '../api/services/invoiceReviewService';
import { jobService } from '../api/services/jobService';
import Pagination from './Pagination';
import RejectionReasonModal from './RejectionReasonModal';

function InvoiceReviewPage() {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedReviewForRejection, setSelectedReviewForRejection] = useState(null);
  const [processingReviewId, setProcessingReviewId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  useEffect(() => {
    if (user?.role === 'Waff Clerk') {
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await invoiceReviewService.getReviewsForClerk(user.userId);
      // Ensure data is always an array
      const reviewsArray = Array.isArray(data) ? data : (data?.data ? data.data : []);
      setReviews(reviewsArray);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setMessage('Error loading invoice reviews');
      setReviews([]);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredReviews = () => {
    if (!Array.isArray(reviews)) {
      return [];
    }
    return reviews.filter(review => {
      if (statusFilter === 'All') return true;
      return review.status === statusFilter;
    });
  };

  const getPaginatedReviews = () => {
    const filtered = getFilteredReviews();
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filtered.slice(startIndex, startIndex + recordsPerPage);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredReviews().length / recordsPerPage);
  };

  const handleApprove = async (reviewId) => {
    setProcessingReviewId(reviewId);
    try {
      console.log('Approving review:', reviewId);
      const response = await invoiceReviewService.approveReview(reviewId);
      console.log('Review approved:', response);
      setMessage('Review approved. Admin/Manager has been notified.');
      setTimeout(() => setMessage(''), 3000);
      fetchReviews();
      setExpandedReviewId(null);
    } catch (error) {
      console.error('Error approving review:', error);
      console.error('Error details:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Error approving review';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setProcessingReviewId(null);
    }
  };

  const handleRejectClick = (review) => {
    setSelectedReviewForRejection(review);
    setShowRejectionModal(true);
  };

  const handleRejectSubmit = async (reason) => {
    if (!selectedReviewForRejection) return;

    setProcessingReviewId(selectedReviewForRejection.reviewId);
    try {
      console.log('Rejecting review:', selectedReviewForRejection.reviewId, 'Reason:', reason);
      const response = await invoiceReviewService.rejectReview(selectedReviewForRejection.reviewId, reason);
      console.log('Review rejected:', response);
      setMessage('Review rejected. Admin/Manager has been notified with your reason.');
      setTimeout(() => setMessage(''), 3000);
      fetchReviews();
      setExpandedReviewId(null);
      setShowRejectionModal(false);
      setSelectedReviewForRejection(null);
    } catch (error) {
      console.error('Error rejecting review:', error);
      console.error('Error details:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Error rejecting review';
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setProcessingReviewId(null);
    }
  };

  const formatAmount = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'status-pending';
      case 'Approved':
        return 'status-approved';
      case 'Rejected':
        return 'status-rejected';
      default:
        return 'status-pending';
    }
  };

  if (user?.role !== 'Waff Clerk') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Access Denied: This page is for Waff Clerks only
        </div>
      </div>
    );
  }

  const paginatedReviews = getPaginatedReviews();
  const totalPages = getTotalPages();

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📋 Invoice Reviews</h1>
          <p className="text-gray-600 mt-1">Review invoices sent by Admin/Manager and approve or reject them</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${message.includes('Error') ? 'bg-red-50 border-red-500 text-red-700' : 'bg-green-50 border-green-500 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Pending & Completed Reviews ({getFilteredReviews().length})</h2>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Reviews</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

          <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Loading reviews...</p>
            </div>
          ) : paginatedReviews.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto mb-4 text-gray-400" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6M7 20h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"></path>
              </svg>
              <p className="text-gray-600">No invoice reviews found</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedReviews.map((review) => (
                  <div key={review.reviewId} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {/* Review Header */}
                    <div 
                      className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100" 
                      onClick={() => setExpandedReviewId(expandedReviewId === review.reviewId ? null : review.reviewId)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">Job ID: {review.jobId}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          review.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          review.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          review.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {review.status}
                        </span>
                      </div>
                      <button className="text-xl text-gray-600 hover:text-gray-900">
                        {expandedReviewId === review.reviewId ? '▼' : '▶'}
                      </button>
                    </div>

                    {/* Review Summary */}
                    <div className="p-4 grid grid-cols-4 gap-4 border-b border-gray-200 bg-white">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Shipment Category</label>
                        <span className="text-sm text-gray-900">{review.invoiceDetails?.shipmentCategory || '-'}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Total Amount</label>
                        <span className="text-lg font-semibold text-blue-600">LKR {formatAmount(review.invoiceDetails?.totalAmount)}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Sent By</label>
                        <span className="text-sm text-gray-900">{review.sentByName || review.sentBy || '-'}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Sent Date</label>
                        <span className="text-sm text-gray-900">{new Date(review.createdDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {expandedReviewId === review.reviewId && (
                      <div className="p-6 bg-white space-y-6">
                        {/* Review Notes Section */}
                        <div>
                          <h4 className="text-xs font-extrabold text-gray-900 mb-3 uppercase tracking-wide">Review Notes from Admin/Manager</h4>
                          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 border-l-4 border-blue-500">
                            {review.reviewNotes || 'No notes provided'}
                          </div>
                        </div>

                        {/* Pay Items Section */}
                        <div>
                          <h4 className="text-xs font-extrabold text-gray-900 mb-3 uppercase tracking-wide">Pay Items Details</h4>
                          <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-300">
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Description</th>
                                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Actual Cost</th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Paid By</th>
                                </tr>
                              </thead>
                              <tbody>
                                {review.payItems && review.payItems.length > 0 ? (
                                  review.payItems.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                      <td className="px-4 py-3 text-sm text-gray-900">{item.description || item.name || '-'}</td>
                                      <td className="px-4 py-3 text-right text-sm text-blue-600 font-medium">LKR {formatAmount(item.actualCost || item.amount)}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{item.paidBy || '-'}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="3" className="px-4 py-3 text-center text-sm text-gray-400">
                                      No pay items available
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                              <tfoot>
                                <tr className="bg-blue-50 border-t-2 border-gray-300">
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">TOTAL</td>
                                  <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">
                                    LKR {formatAmount(
                                      review.payItems?.reduce((sum, item) => sum + (parseFloat(item.actualCost || item.amount) || 0), 0) || 0
                                    )}
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {review.status === 'Pending' && (
                          <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleApprove(review.reviewId)}
                              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={processingReviewId === review.reviewId}
                            >
                              {processingReviewId === review.reviewId ? '⏳ Processing...' : '✓ Approve'}
                            </button>
                            <button
                              onClick={() => handleRejectClick(review)}
                              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={processingReviewId === review.reviewId}
                            >
                              {processingReviewId === review.reviewId ? '⏳ Processing...' : '✗ Reject'}
                            </button>
                          </div>
                        )}

                        {review.status === 'Rejected' && review.rejectionReason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-semibold text-red-900 mb-2">Your Rejection Reason:</h4>
                            <div className="text-sm text-red-700">
                              {review.rejectionReason}
                            </div>
                          </div>
                        )}

                        {review.status === 'Approved' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
                            <p className="text-sm">✓ This review has been approved and sent to Admin/Manager</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <RejectionReasonModal
        show={showRejectionModal}
        onClose={() => {
          setShowRejectionModal(false);
          setSelectedReviewForRejection(null);
        }}
        onSubmit={handleRejectSubmit}
        loading={processingReviewId !== null}
      />
    </div>
  );
}

export default InvoiceReviewPage;
