import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PropTypes from 'prop-types';
import apiClient from '../api/client';
import { pettyCashService } from '../api/services/pettyCashService';
import {
  sortAssignmentsDesc,
  computeSummary,
  getBalanceColorClass,
  validateSettlementItem,
  isAdminRole,
  isClerkRole,
  isFinanceRole,
  canEditSettlement,
  canDeleteSettlementItem,
  getSpecificPettyCashStatus,
} from '../utils/pettyCashUtils';
import '../styles/JobPettyCash.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (val) =>
  parseFloat(val || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

// ─── Component ────────────────────────────────────────────────────────────────

function JobPettyCash({ job, users, onUpdate }) {
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [expandedAssignments, setExpandedAssignments] = useState(new Set());
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [message, setMessage] = useState('');

  // Workflow Modals: Request, Approve, Reject, Re-request, Issue
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    requestedAmount: '',
    notes: '',
  });

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveFormData, setApproveFormData] = useState({
    assignmentId: null,
    clerkName: '',
    approvedAmount: '',
    notes: '',
  });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectFormData, setRejectFormData] = useState({
    assignmentId: null,
    clerkName: '',
    rejectionReason: '',
  });

  const [showReRequestModal, setShowReRequestModal] = useState(false);
  const [reRequestFormData, setReRequestFormData] = useState({
    assignmentId: null,
    requestedAmount: '',
    rejectionReason: '',
    notes: '',
  });

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueFormData, setIssueFormData] = useState({
    assignmentId: null,
    clerkName: '',
    issuedAmount: '',
    paymentMethod: 'Cash',
    referenceNumber: '',
    notes: '',
  });

  // Settlement & Balance states
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settlementItems, setSettlementItems] = useState([]);
  const [inlineEditingItem, setInlineEditingItem] = useState(null);
  const [inlineEditName, setInlineEditName] = useState('');
  const [inlineEditCost, setInlineEditCost] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAction, setBalanceAction] = useState(null); // 'BALANCE_RETURN' or 'OVERDUE_COLLECTION'
  const [balanceNotes, setBalanceNotes] = useState('');
  const [clerkThreshold, setClerkThreshold] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (isAdminRole(user) || isFinanceRole(user)) {
        // Admin / Manager / Finance: fetch ALL assignments for the job
        response = await apiClient.get(
          `/petty-cash-assignments/job/${job.jobId}/all`
        );
      } else {
        // Waff Clerk: fetch only their own assignment
        response = await apiClient.get(
          `/petty-cash-assignments/job/${job.jobId}`
        );
      }

      // Normalise: the API may return a single object or an array
      const raw = response.data;
      const data = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setAssignments(sortAssignmentsDesc(data));
    } catch (err) {
      setError('Could not load petty cash assignments for this job.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceStatus = async () => {
    try {
      const response = await apiClient.get('/billing');
      const bills = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      const hasInvoice = bills.some(
        (bill) => String(bill.jobId) === String(job.jobId)
      );
      setInvoiceGenerated(hasInvoice);
    } catch (err) {
      // Non-critical — default to false (no invoice) if the call fails
      setInvoiceGenerated(false);
    }
  };

  // ── Mount effect ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (job?.jobId) {
      fetchAssignments();
      fetchInvoiceStatus();
    }
    if (isClerkRole(user)) {
      pettyCashService.getMyThreshold().then(thresh => {
        if (thresh !== null && thresh !== undefined) {
          setClerkThreshold(parseFloat(thresh));
        }
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.jobId, user]);

  // ── Computed summary (only count issued/settled cash) ────────────────────────

  const issuedAssignments = assignments.filter(
    (a) => !['Requested', 'Approved', 'Rejected'].includes(a.status)
  );
  const { totalAssigned, totalSettled, balance } = computeSummary(issuedAssignments);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const toggleExpand = (assignmentId) => {
    setExpandedAssignments((prev) => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'Requested') return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (status === 'Approved') return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    if (status === 'Rejected') return 'bg-red-100 text-red-800 border border-red-200';
    if (status === 'Assigned') return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (
      status === 'Settled' ||
      status === 'Balance Returned' ||
      status === 'Overdue Collected'
    )
      return 'bg-green-100 text-green-800 border border-green-200';
    if (status === 'Over Due') return 'bg-red-100 text-red-800 border border-red-200';
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  // Check clerk's assignments status
  const pcSettledStatuses = [
    'Settled', 'Settled/Approved', 'Balance Returned', 'Overdue Collected',
    'Settled / Balance Returned', 'Settled / Over Due Collected', 'Closed',
    'Full Petty Cash Returned', 'Pending Approval / Balance', 'Pending Approval / Over Due'
  ];
  const clerkAssignments = assignments.filter(
    (a) => String(a.assignedTo) === String(user?.userId) || isClerkRole(user)
  );
  const allPcSettled = clerkAssignments.length > 0 && clerkAssignments.every((a) => pcSettledStatuses.includes(a.status));
  const hasPendingRequest = clerkAssignments.some((a) => a.status === 'Requested');
  const hasApprovedRequest = clerkAssignments.some((a) => a.status === 'Approved');

  // Can request until settling all items (as long as no unapproved request is currently pending)
  const canClerkRequest = isClerkRole(user) && !hasPendingRequest && !hasApprovedRequest && !allPcSettled;

  // ── Workflow Handlers ───────────────────────────────────────────────────────

  const handleRequestSubmit = async (e) => {
    if (e) e.preventDefault();
    const amount = parseFloat(requestFormData.requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Requested amount must be greater than zero.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    if (clerkThreshold !== null && clerkThreshold > 0 && amount > clerkThreshold) {
      setMessage(`❌ Requested amount of LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeds your allowed petty cash threshold limit of LKR ${clerkThreshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    try {
      await pettyCashService.requestPettyCash({
        jobId: job.jobId,
        requestedAmount: amount,
        notes: requestFormData.notes || null,
      });

      setMessage('✓ Petty cash request submitted successfully');
      setTimeout(() => setMessage(''), 3000);
      setRequestFormData({ requestedAmount: '', notes: '' });
      setShowRequestModal(false);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error submitting petty cash request.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleApproveSubmit = async (e) => {
    if (e) e.preventDefault();
    const amount = parseFloat(approveFormData.approvedAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Approved amount must be greater than zero.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      await pettyCashService.approvePettyCash(approveFormData.assignmentId, {
        approvedAmount: amount,
        notes: approveFormData.notes || null,
      });

      setMessage('✓ Petty cash request approved! Forwarded to Finance.');
      setTimeout(() => setMessage(''), 3000);
      setShowApproveModal(false);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error approving request.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleRejectSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!rejectFormData.rejectionReason.trim()) {
      setMessage('Please enter a rejection reason.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      await pettyCashService.rejectPettyCash(rejectFormData.assignmentId, {
        rejectionReason: rejectFormData.rejectionReason.trim(),
      });

      setMessage('✓ Petty cash request rejected.');
      setTimeout(() => setMessage(''), 3000);
      setShowRejectModal(false);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error rejecting request.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleReRequestSubmit = async (e) => {
    if (e) e.preventDefault();
    const amount = parseFloat(reRequestFormData.requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Requested amount must be greater than zero.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    if (clerkThreshold !== null && clerkThreshold > 0 && amount > clerkThreshold) {
      setMessage(`❌ Requested amount of LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeds your allowed petty cash threshold limit of LKR ${clerkThreshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    try {
      await pettyCashService.reRequestPettyCash(reRequestFormData.assignmentId, {
        requestedAmount: amount,
        notes: reRequestFormData.notes || null,
      });

      setMessage('✓ Revised petty cash request re-submitted!');
      setTimeout(() => setMessage(''), 3000);
      setShowReRequestModal(false);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error re-submitting request.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleIssueSubmit = async (e) => {
    if (e) e.preventDefault();
    const amount = parseFloat(issueFormData.issuedAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Issued amount must be greater than zero.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      await pettyCashService.issuePettyCash(issueFormData.assignmentId, {
        issuedAmount: amount,
        paymentMethod: issueFormData.paymentMethod || 'Cash',
        referenceNumber: issueFormData.referenceNumber || null,
        notes: issueFormData.notes || null,
      });

      setMessage('✓ Petty cash successfully issued to clerk!');
      setTimeout(() => setMessage(''), 3000);
      setShowIssueModal(false);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error issuing petty cash.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // ── Settle submit handler ──────────────────────────────────────────────────

  const handleSettleSubmit = async () => {
    const itemsToSubmit = settlementItems.filter((item) => !item.alreadyPaid && item.actualCost);

    if (itemsToSubmit.length > 0) {
      for (let i = 0; i < itemsToSubmit.length; i++) {
        const validationError = validateSettlementItem(itemsToSubmit[i]);
        if (validationError) {
          setMessage(`${itemsToSubmit[i].itemName || `Item ${i + 1}`}: ${validationError}`);
          setTimeout(() => setMessage(''), 4000);
          return;
        }
      }
    }

    try {
      const payload = {
        items: itemsToSubmit.map((item) => ({
          itemName: item.itemName.trim(),
          actualCost: parseFloat(item.actualCost),
          hasBill: item.hasBill || false,
        })),
      };

      await apiClient.post(
        `/petty-cash-assignments/${selectedAssignment.assignmentId}/settle`,
        payload
      );

      setMessage('✓ Settlement recorded successfully');
      setTimeout(() => setMessage(''), 3000);
      setSettlementItems([]);
      setSelectedAssignment(null);
      setShowSettleModal(false);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error recording settlement. Please try again.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // ── Settlement item helpers ────────────────────────────────────────────────

  const addSettlementItem = () => {
    if (settlementItems.length >= 50) return;
    setSettlementItems([...settlementItems, { itemName: '', actualCost: '' }]);
  };

  const removeSettlementItem = (index) => {
    setSettlementItems(settlementItems.filter((_, i) => i !== index));
  };

  const updateSettlementItem = (index, field, value) => {
    setSettlementItems(
      settlementItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const openSettleModal = async (assignment) => {
    setSelectedAssignment(assignment);
    setSettlementItems([]);

    if (job.shipmentCategory) {
      try {
        const response = await apiClient.get(
          `/pay-item-templates/category/${encodeURIComponent(job.shipmentCategory)}`
        );
        const templates = response.data;

        if (templates && templates.length > 0) {
          let existingItems = [];
          try {
            const existingRes = await apiClient.get(
              `/petty-cash-assignments/${assignment.assignmentId}/settlement-items`
            );
            existingItems = Array.isArray(existingRes.data) ? existingRes.data : [];
          } catch (err) {
            // Non-critical
          }

          const loadedItems = templates.map((template) => {
            const existingItem = existingItems.find((ei) => ei.itemName === template.itemName);
            if (existingItem) {
              return {
                itemName: template.itemName,
                actualCost: String(existingItem.actualCost),
                alreadyPaid: true,
              };
            }
            return {
              itemName: template.itemName,
              actualCost: '',
              alreadyPaid: false,
            };
          });

          setSettlementItems(loadedItems);
        }
      } catch (err) {
        console.error('Error loading pay item templates:', err);
      }
    }

    setShowSettleModal(true);
  };

  const handleInlineEditSave = async (assignmentId, itemId) => {
    const trimmedName = inlineEditName.trim();
    const cost = parseFloat(inlineEditCost);

    if (!trimmedName) {
      setMessage('Item name must not be empty.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      setMessage('Actual cost must be greater than zero.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      await apiClient.patch(
        `/petty-cash-assignments/${assignmentId}/settlement-items/${itemId}`,
        { itemName: trimmedName, actualCost: cost }
      );
      setInlineEditingItem(null);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error updating settlement item.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleInlineDelete = async (assignmentId, itemId, itemName) => {
    if (!window.confirm(`Delete "${itemName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(
        `/petty-cash-assignments/${assignmentId}/settlement-items/${itemId}`
      );
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error deleting settlement item.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleBalanceSubmit = async () => {
    if (!selectedAssignment) return;

    const amount =
      balanceAction === 'BALANCE_RETURN'
        ? parseFloat(selectedAssignment.balanceAmount || 0)
        : parseFloat(selectedAssignment.overAmount || 0);

    if (amount <= 0) {
      setMessage('No balance or overdue amount to process.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      await apiClient.post('/cash-balance-settlements', {
        relatedAssignments: [selectedAssignment.assignmentId],
        jobId: job.jobId,
        settlementType: balanceAction,
        amount: amount,
        notes:
          balanceNotes ||
          `${balanceAction === 'BALANCE_RETURN' ? 'Return balance' : 'Collect overdue'} for Assignment #${selectedAssignment.assignmentId}`,
      });

      setMessage(
        `✓ ${balanceAction === 'BALANCE_RETURN' ? 'Balance return' : 'Overdue collection'} submitted successfully`
      );
      setTimeout(() => setMessage(''), 3000);
      setShowBalanceModal(false);
      setBalanceAction(null);
      setBalanceNotes('');
      setSelectedAssignment(null);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      setMessage(apiMessage || 'Error submitting request. Please try again.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="job-petty-cash">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Petty Cash</h3>
          <p className="text-xs text-gray-500">
            Clerk request &bull; Admin approval &bull; Finance disbursement &bull; Settlement
          </p>
        </div>

        {/* Request Petty Cash Button (Waff Clerk) */}
        {isClerkRole(user) && (
          <button
            className={`px-4 py-2 rounded-lg transition font-medium text-sm flex items-center gap-1.5 shadow-sm ${
              canClerkRequest
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
            disabled={!canClerkRequest}
            title={
              allPcSettled
                ? 'All petty cash assignments are settled for this job'
                : hasPendingRequest
                ? 'A petty cash request is currently pending approval'
                : hasApprovedRequest
                ? 'A petty cash request is approved and pending finance disbursement'
                : 'Request petty cash for this job'
            }
            onClick={() => {
              setRequestFormData({ requestedAmount: '', notes: '' });
              setShowRequestModal(true);
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            {hasPendingRequest ? 'Request Pending Approval' : hasApprovedRequest ? 'Approved (Pending Finance)' : allPcSettled ? 'All Settled' : '+ Request Petty Cash'}
          </button>
        )}
      </div>

      {/* Inline message (shown when modals are closed) */}
      {message && !showRequestModal && !showApproveModal && !showRejectModal && !showReRequestModal && !showIssueModal && !showSettleModal && !showBalanceModal && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.includes('✓')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 py-8 justify-center text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="text-sm">Loading petty cash...</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="mb-4 p-4 rounded-lg border border-red-300 bg-red-50 text-red-700 flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button
            className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
            onClick={() => {
              fetchAssignments();
              fetchInvoiceStatus();
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && assignments.length === 0 && (
        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-sm text-gray-500 font-medium">No petty cash requests or assignments for this job.</p>
          {isClerkRole(user) && (
            <p className="text-xs text-gray-400 mt-1">
              Click &quot;+ Request Petty Cash&quot; above to submit an amount for approval.
            </p>
          )}
        </div>
      )}

      {/* Normal state — assignments exist */}
      {!loading && !error && assignments.length > 0 && (
        <>
          {/* Summary bar (for disbursed cash) */}
          <div className="job-petty-cash-summary mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-500">Total Disbursed: </span>
                <span className="font-semibold text-gray-900">
                  LKR {formatCurrency(totalAssigned)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total Settled: </span>
                <span className="font-semibold text-gray-900">
                  LKR {formatCurrency(totalSettled)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Balance: </span>
                <span className={`font-semibold ${getBalanceColorClass(balance)}`}>
                  LKR {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment rows */}
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const isRejected = assignment.status === 'Rejected';
              const isRequested = assignment.status === 'Requested';
              const isApproved = assignment.status === 'Approved';
              const isAssigned = assignment.status === 'Assigned';
              const isSettledOrBeyond = [
                'Settled',
                'Balance To Be Return',
                'Over Due',
                'Settled/Approved',
                'Settled/Rejected',
                'Balance Returned',
                'Overdue Collected',
              ].includes(assignment.status);

              return (
                <div
                  key={assignment.assignmentId}
                  className="job-petty-cash-assignment-row p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {/* Assigned-to / Requested-by user name */}
                    <span className="font-semibold text-gray-900">
                      {assignment.assignedToName || `User #${assignment.assignedTo}`}
                    </span>

                    {/* Amount */}
                    <span className="text-gray-700 font-medium">
                      LKR {formatCurrency(assignment.assignedAmount)}
                    </span>

                    {/* Status badge */}
                    {(() => {
                      const statusObj = getSpecificPettyCashStatus(assignment.status, assignment);
                      return (
                        <div className="flex flex-col items-start">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusObj.badgeClass}`}
                          >
                            {statusObj.label}
                          </span>
                          {statusObj.subtext && (
                            <span className="text-[10px] text-gray-500 mt-0.5 max-w-[150px] truncate" title={statusObj.subtext}>
                              {statusObj.subtext}
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Balance / Overdue (only for disbursed assignments) */}
                    {isSettledOrBeyond && (
                      parseFloat(assignment.overAmount || 0) > 0 ? (
                        <span className="font-medium text-red-600 text-xs">
                          Over Due: LKR {formatCurrency(assignment.overAmount)}
                        </span>
                      ) : (
                        <span
                          className={`font-medium text-xs ${getBalanceColorClass(
                            parseFloat(assignment.balanceAmount || 0)
                          )}`}
                        >
                          Balance: LKR {formatCurrency(assignment.balanceAmount || 0)}
                        </span>
                      )
                    )}

                    {/* Assigned / Requested date */}
                    <span className="text-gray-400 text-xs ml-auto sm:ml-0">
                      {assignment.assignedDate ? formatDate(assignment.assignedDate) : ''}
                    </span>

                    {/* Action buttons on the row */}
                    <div className="flex items-center gap-2 ml-auto">
                      {/* Requested -> Admin/Super Admin/Manager can Approve or Reject */}
                      {isRequested && isAdminRole(user) && (() => {
                        const isAssignedToOtherManager = user?.role === 'Manager' && assignment.assignedManagerId && String(assignment.assignedManagerId) !== String(user?.userId);
                        if (isAssignedToOtherManager) {
                          return (
                            <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 font-semibold" title={`Assigned to ${assignment.assignedManagerName || 'another manager'} for approval`}>
                              Assigned to {assignment.assignedManagerName || 'Manager'}
                            </span>
                          );
                        }
                        return (
                          <>
                            <button
                              className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition"
                              onClick={() => {
                                setApproveFormData({
                                  assignmentId: assignment.assignmentId,
                                  clerkName: assignment.assignedToName || `User #${assignment.assignedTo}`,
                                  approvedAmount: assignment.assignedAmount,
                                  notes: assignment.notes || '',
                                });
                                setShowApproveModal(true);
                              }}
                            >
                              Approve
                            </button>
                            <button
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition"
                              onClick={() => {
                                setRejectFormData({
                                  assignmentId: assignment.assignmentId,
                                  clerkName: assignment.assignedToName || `User #${assignment.assignedTo}`,
                                  rejectionReason: '',
                                });
                                setShowRejectModal(true);
                              }}
                            >
                              Reject
                            </button>
                          </>
                        );
                      })()}

                      {/* Approved -> Finance can Issue Petty Cash */}
                      {isApproved && isFinanceRole(user) && (
                        <button
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition shadow-sm"
                          onClick={() => {
                            setIssueFormData({
                              assignmentId: assignment.assignmentId,
                              clerkName: assignment.assignedToName || `User #${assignment.assignedTo}`,
                              issuedAmount: assignment.assignedAmount,
                              paymentMethod: 'Cash',
                              referenceNumber: '',
                              notes: assignment.notes || '',
                            });
                            setShowIssueModal(true);
                          }}
                        >
                          Issue Cash
                        </button>
                      )}

                      {/* Rejected -> Waff Clerk can Re-request */}
                      {isRejected &&
                        (isClerkRole(user) || user?.role === 'Manager') &&
                        assignment.assignedTo === user?.userId && (
                          <button
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition shadow-sm"
                            onClick={() => {
                              setReRequestFormData({
                                assignmentId: assignment.assignmentId,
                                requestedAmount: assignment.assignedAmount,
                                rejectionReason: assignment.rejectionReason || 'No reason specified',
                                notes: assignment.notes || '',
                              });
                              setShowReRequestModal(true);
                            }}
                          >
                            Re-request
                          </button>
                        )}

                      {/* Assigned -> Waff Clerk can Settle */}
                      {isAssigned &&
                        (isClerkRole(user) || user?.role === 'Manager') &&
                        assignment.assignedTo === user?.userId && (
                          <button
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition"
                            onClick={() => openSettleModal(assignment)}
                          >
                            Settle
                          </button>
                        )}

                      {/* Settled -> Return Balance */}
                      {parseFloat(assignment.balanceAmount || 0) > 0 &&
                        isSettledOrBeyond &&
                        (isClerkRole(user) || user?.role === 'Manager') &&
                        assignment.assignedTo === user?.userId && (
                          <button
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setBalanceAction('BALANCE_RETURN');
                              setBalanceNotes('');
                              setShowBalanceModal(true);
                            }}
                          >
                            Return Balance
                          </button>
                        )}

                      {/* Settled -> Collect Overdue */}
                      {parseFloat(assignment.overAmount || 0) > 0 &&
                        isSettledOrBeyond &&
                        (isClerkRole(user) || user?.role === 'Manager') &&
                        assignment.assignedTo === user?.userId && (
                          <button
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setBalanceAction('OVERDUE_COLLECTION');
                              setBalanceNotes('');
                              setShowBalanceModal(true);
                            }}
                          >
                            Collect Overdue
                          </button>
                        )}

                      {/* Expand/collapse toggle (if settled items exist or details available) */}
                      <button
                        className="text-gray-400 hover:text-gray-600 transition p-1"
                        onClick={() => toggleExpand(assignment.assignmentId)}
                        aria-label={
                          expandedAssignments.has(assignment.assignmentId)
                            ? 'Collapse assignment'
                            : 'Expand assignment'
                        }
                      >
                        {expandedAssignments.has(assignment.assignmentId) ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {/* Workflow audit banners */}
                  {isRejected && (
                    <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      <div className="flex items-center gap-1 font-semibold text-red-900 mb-1">
                        <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span>Request Rejected</span>
                        {assignment.rejectedByName && (
                          <span className="font-normal text-red-700">
                            by {assignment.rejectedByName} {assignment.rejectedDate ? `on ${formatDate(assignment.rejectedDate)}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-red-700">
                        <span className="font-medium">Reason: </span>
                        {assignment.rejectionReason || 'No specific reason given.'}
                      </p>
                    </div>
                  )}

                  {isApproved && (
                    <div className="mt-2.5 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
                      <div className="flex items-center gap-1 font-semibold text-indigo-900 mb-0.5">
                        <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Approved</span>
                        {assignment.approvedByName && (
                          <span className="font-normal text-indigo-700">
                            by {assignment.approvedByName} {assignment.approvedDate ? `on ${formatDate(assignment.approvedDate)}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-indigo-700">Forwarded to Finance. Awaiting cash disbursement.</p>
                    </div>
                  )}

                  {isRequested && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Pending review and approval by Super Admin, Admin, or Manager.</span>
                    </div>
                  )}

                  {assignment.issuedByName && (
                    <div className="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-x-3">
                      <span>
                        <strong className="text-gray-700 font-medium">Issued by:</strong> {assignment.issuedByName}
                        {assignment.issuedDate ? ` on ${formatDate(assignment.issuedDate)}` : ''}
                      </span>
                      {assignment.paymentMethod && (
                        <span>
                          <strong className="text-gray-700 font-medium">Method:</strong> {assignment.paymentMethod}
                        </span>
                      )}
                      {assignment.referenceNumber && (
                        <span>
                          <strong className="text-gray-700 font-medium">Ref:</strong> {assignment.referenceNumber}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded section */}
                  {expandedAssignments.has(assignment.assignmentId) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {/* Notes */}
                      {assignment.notes && (
                        <p className="text-xs text-gray-600 mb-2 italic">
                          <span className="font-semibold text-gray-700 not-italic">Notes:</span> {assignment.notes}
                        </p>
                      )}

                      {/* Settlement items */}
                      {assignment.settlementItems && assignment.settlementItems.length > 0 ? (
                        <div className="mt-3">
                          {(() => {
                            const canEdit = canEditSettlement(user, assignment, invoiceGenerated);
                            return (
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div
                                  className="bg-gray-100 border-b border-gray-200 grid gap-0"
                                  style={{
                                    gridTemplateColumns: canEdit ? '2rem 1fr 5rem 8rem 5rem' : '2rem 1fr 5rem 8rem',
                                  }}
                                >
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">#</div>
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-700">Item Name</div>
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-700">Bill</div>
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-700 text-right">Actual Cost</div>
                                  {canEdit && <div className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Actions</div>}
                                </div>

                                <div>
                                  {assignment.settlementItems.map((item, idx) => {
                                    const isEditing =
                                      inlineEditingItem &&
                                      inlineEditingItem.assignmentId === assignment.assignmentId &&
                                      inlineEditingItem.itemId === item.settlementItemId;

                                    return (
                                      <div
                                        key={item.settlementItemId}
                                        className="grid gap-0 border-b border-gray-200 hover:bg-blue-50 transition"
                                        style={{
                                          gridTemplateColumns: canEdit ? '2rem 1fr 5rem 8rem 5rem' : '2rem 1fr 5rem 8rem',
                                        }}
                                      >
                                        <div className="px-3 py-2 flex items-center justify-center text-xs text-gray-500">
                                          {idx + 1}
                                        </div>
                                        <div className="px-3 py-2 flex items-center">
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={inlineEditName}
                                              onChange={(e) => setInlineEditName(e.target.value)}
                                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                              autoFocus
                                            />
                                          ) : (
                                            <span className="text-sm text-gray-900">{item.itemName}</span>
                                          )}
                                        </div>
                                        <div className="px-3 py-2 flex items-center">
                                          {item.hasBill ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                              Bill
                                            </span>
                                          ) : (
                                            <span className="text-xs text-gray-400">No Bill</span>
                                          )}
                                        </div>
                                        <div className="px-3 py-2 flex items-center justify-end">
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={inlineEditCost}
                                              onChange={(e) => setInlineEditCost(e.target.value)}
                                              className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter')
                                                  handleInlineEditSave(assignment.assignmentId, item.settlementItemId);
                                                if (e.key === 'Escape') setInlineEditingItem(null);
                                              }}
                                            />
                                          ) : (
                                            <span className="text-sm font-medium text-gray-900">
                                              LKR {formatCurrency(item.actualCost)}
                                            </span>
                                          )}
                                        </div>
                                        {canEdit && (
                                          <div className="px-3 py-2 flex items-center justify-center">
                                            {isEditing ? (
                                              <div className="flex gap-1">
                                                <button
                                                  onClick={() =>
                                                    handleInlineEditSave(assignment.assignmentId, item.settlementItemId)
                                                  }
                                                  title="Save"
                                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 hover:bg-green-200 transition"
                                                >
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="20 6 9 17 4 12" />
                                                  </svg>
                                                </button>
                                                <button
                                                  onClick={() => setInlineEditingItem(null)}
                                                  title="Cancel"
                                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                >
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                  </svg>
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex gap-1">
                                                <button
                                                  onClick={() => {
                                                    setInlineEditingItem({
                                                      assignmentId: assignment.assignmentId,
                                                      itemId: item.settlementItemId,
                                                    });
                                                    setInlineEditName(item.itemName);
                                                    setInlineEditCost(String(item.actualCost));
                                                  }}
                                                  title="Edit item"
                                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                                                >
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                  </svg>
                                                </button>
                                                {canDeleteSettlementItem(
                                                  user,
                                                  assignment,
                                                  invoiceGenerated,
                                                  assignment.settlementItems.length
                                                ) && (
                                                  <button
                                                    onClick={() =>
                                                      handleInlineDelete(
                                                        assignment.assignmentId,
                                                        item.settlementItemId,
                                                        item.itemName
                                                      )
                                                    }
                                                    title="Delete item"
                                                    className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                  >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                      <polyline points="3 6 5 6 21 6" />
                                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Total row */}
                                  <div
                                    className="grid gap-0 border-t-2 border-gray-300 bg-gray-100"
                                    style={{
                                      gridTemplateColumns: canEdit ? '2rem 1fr 5rem 8rem 5rem' : '2rem 1fr 5rem 8rem',
                                    }}
                                  >
                                    <div className="px-3 py-2" />
                                    <div className="px-3 py-2">
                                      <strong className="text-sm text-gray-900">Total</strong>
                                    </div>
                                    <div className="px-3 py-2" />
                                    <div className="px-3 py-2 text-right">
                                      <strong className="text-sm text-gray-900">
                                        LKR {formatCurrency(
                                          assignment.settlementItems.reduce(
                                            (sum, i) => sum + parseFloat(i.actualCost || 0),
                                            0
                                          )
                                        )}
                                      </strong>
                                    </div>
                                    {canEdit && <div className="px-3 py-2" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="mt-3 pl-4 border-l-2 border-gray-200">
                          <p className="text-sm text-gray-400">No settlement items recorded yet.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Request Petty Cash Modal (Waff Clerk) ── */}
      {showRequestModal && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal" style={{ maxWidth: '32rem' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-50/60 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Request Petty Cash</h3>
                <p className="text-xs text-gray-500 mt-0.5">Job #{job.jobId}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
              {clerkThreshold !== null && clerkThreshold > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-xs text-purple-900 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span className="font-medium">Your Request Limit:</span>
                  </div>
                  <span className="font-bold text-sm text-purple-700">
                    LKR {clerkThreshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Amount (LKR) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={requestFormData.requestedAmount}
                  onChange={(e) =>
                    setRequestFormData({ ...requestFormData, requestedAmount: e.target.value })
                  }
                  placeholder="0.00"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-base font-semibold ${
                    clerkThreshold !== null && clerkThreshold > 0 && parseFloat(requestFormData.requestedAmount) > clerkThreshold
                      ? 'border-red-400 bg-red-50/30 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  required
                  autoFocus
                />
                {clerkThreshold !== null && clerkThreshold > 0 && parseFloat(requestFormData.requestedAmount) > clerkThreshold && (
                  <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                    ⚠️ Exceeds your allowed threshold limit of LKR {clerkThreshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Notes (Optional)</label>
                <textarea
                  value={requestFormData.notes}
                  onChange={(e) => setRequestFormData({ ...requestFormData, notes: e.target.value })}
                  maxLength={500}
                  placeholder="Describe items to be purchased or why cash is needed..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  rows="3"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                Your request will be submitted for Super Admin, Admin, or Manager review. Once approved, Finance will disburse the cash.
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.includes('✓')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold text-sm shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Approve Petty Cash Modal (Admin / Super Admin / Manager) ── */}
      {showApproveModal && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal" style={{ maxWidth: '32rem' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-50/60 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-green-900">Approve Petty Cash</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Job #{job.jobId} &bull; Clerk: {approveFormData.clerkName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                Approving this request will forward it to the <strong>Finance</strong> role for final cash disbursement.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approved Amount (LKR) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={approveFormData.approvedAmount}
                  onChange={(e) =>
                    setApproveFormData({ ...approveFormData, approvedAmount: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-base font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approval Notes (Optional)</label>
                <textarea
                  value={approveFormData.notes}
                  onChange={(e) => setApproveFormData({ ...approveFormData, notes: e.target.value })}
                  placeholder="Optional notes or instructions for Finance..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold text-sm shadow-sm"
                >
                  Approve &amp; Forward to Finance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject Petty Cash Modal (Admin / Super Admin / Manager) ── */}
      {showRejectModal && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal" style={{ maxWidth: '32rem' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50/60 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-red-900">Reject Petty Cash Request</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Job #{job.jobId} &bull; Clerk: {rejectFormData.clerkName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                Please specify why this petty cash request is being rejected. The clerk will be able to review your reason and submit a revised request.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectFormData.rejectionReason}
                  onChange={(e) =>
                    setRejectFormData({ ...rejectFormData, rejectionReason: e.target.value })
                  }
                  required
                  placeholder="Explain why the amount was rejected or what changes are required..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold text-sm shadow-sm"
                >
                  Reject Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Re-request Petty Cash Modal (Waff Clerk) ── */}
      {showReRequestModal && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal" style={{ maxWidth: '32rem' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-amber-50/60 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-amber-900">Re-submit Petty Cash Request</h3>
                <p className="text-xs text-gray-600 mt-0.5">Job #{job.jobId}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReRequestSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <strong className="block mb-1 font-semibold text-red-900">Previous Rejection Reason:</strong>
                {reRequestFormData.rejectionReason}
              </div>

              {clerkThreshold !== null && clerkThreshold > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-xs text-purple-900 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span className="font-medium">Your Request Limit:</span>
                  </div>
                  <span className="font-bold text-sm text-purple-700">
                    LKR {clerkThreshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Requested Amount (LKR) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={reRequestFormData.requestedAmount}
                  onChange={(e) =>
                    setReRequestFormData({ ...reRequestFormData, requestedAmount: e.target.value })
                  }
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-base font-semibold ${
                    clerkThreshold !== null && clerkThreshold > 0 && parseFloat(reRequestFormData.requestedAmount) > clerkThreshold
                      ? 'border-red-400 bg-red-50/30 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-amber-500 focus:border-transparent'
                  }`}
                />
                {clerkThreshold !== null && clerkThreshold > 0 && parseFloat(reRequestFormData.requestedAmount) > clerkThreshold && (
                  <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                    ⚠️ Exceeds your allowed threshold limit of LKR {clerkThreshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Updated Notes / Explanation</label>
                <textarea
                  value={reRequestFormData.notes}
                  onChange={(e) => setReRequestFormData({ ...reRequestFormData, notes: e.target.value })}
                  placeholder="Explain revisions made..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowReRequestModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition font-semibold text-sm shadow-sm"
                >
                  Re-submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Issue Petty Cash Modal (Finance Role ONLY) ── */}
      {showIssueModal && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal" style={{ maxWidth: '34rem' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-indigo-50/60 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold text-indigo-900">Issue Petty Cash</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Job #{job.jobId} &bull; Clerk: {issueFormData.clerkName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
                Issuing this petty cash records cash disbursement and enables the clerk to record expenditures and settle the job items.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issued Amount (LKR) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={issueFormData.issuedAmount}
                    onChange={(e) =>
                      setIssueFormData({ ...issueFormData, issuedAmount: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-base font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={issueFormData.paymentMethod}
                    onChange={(e) =>
                      setIssueFormData({ ...issueFormData, paymentMethod: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Cheque Number</label>
                <input
                  type="text"
                  value={issueFormData.referenceNumber}
                  onChange={(e) =>
                    setIssueFormData({ ...issueFormData, referenceNumber: e.target.value })
                  }
                  placeholder="Optional reference / voucher / cheque #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Finance Notes</label>
                <textarea
                  value={issueFormData.notes}
                  onChange={(e) => setIssueFormData({ ...issueFormData, notes: e.target.value })}
                  placeholder="Optional finance notes..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-semibold text-sm shadow-sm"
                >
                  Issue Petty Cash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settle Modal ── */}
      {showSettleModal && selectedAssignment && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal" style={{ maxWidth: '42rem' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Settle Petty Cash</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedAssignment.assignedToName} — LKR {formatCurrency(selectedAssignment.assignedAmount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSettleModal(false);
                  setSelectedAssignment(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Settlement items as cards */}
              {settlementItems.length > 0 && (
                <div className="space-y-4">
                  {settlementItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-500 mb-3">Item {index + 1}</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => updateSettlementItem(index, 'itemName', e.target.value)}
                          placeholder="Item name"
                          maxLength={200}
                          readOnly={item.alreadyPaid}
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                            item.alreadyPaid ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300'
                          }`}
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.actualCost}
                          onChange={(e) => updateSettlementItem(index, 'actualCost', e.target.value)}
                          placeholder="0.00"
                          readOnly={item.alreadyPaid}
                          className={`w-32 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                            item.alreadyPaid ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.hasBill || false}
                            onChange={(e) => updateSettlementItem(index, 'hasBill', e.target.checked)}
                            disabled={item.alreadyPaid}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>📄 Bill</span>
                        </label>
                        {!item.alreadyPaid ? (
                          <button
                            type="button"
                            onClick={() => removeSettlementItem(index)}
                            className="text-red-400 hover:text-red-600 transition text-lg"
                            title="Remove item"
                          >
                            ✕
                          </button>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">Paid</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Custom Item button */}
              <button
                type="button"
                onClick={addSettlementItem}
                disabled={settlementItems.length >= 50}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  settlementItems.length >= 50
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                + Add Custom Item {settlementItems.length > 0 && `(${settlementItems.length}/50)`}
              </button>

              {/* Summary section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600">Assigned Amount:</span>
                  <span className="text-gray-900">LKR {formatCurrency(selectedAssignment.assignedAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600">Total Spent:</span>
                  <span className="text-gray-900">
                    LKR{' '}
                    {formatCurrency(
                      settlementItems.reduce(
                        (sum, item) => sum + (parseFloat(item.actualCost) || 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="font-medium text-gray-600">Balance to Return:</span>
                  <span className="font-semibold text-red-600">
                    LKR{' '}
                    {formatCurrency(
                      selectedAssignment.assignedAmount -
                        settlementItems.reduce(
                          (sum, item) => sum + (parseFloat(item.actualCost) || 0),
                          0
                        )
                    )}
                  </span>
                </div>
              </div>

              {/* Message inside modal */}
              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.includes('✓')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowSettleModal(false);
                  setSelectedAssignment(null);
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettleSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
              >
                Settle Petty Cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Balance/Overdue Modal ── */}
      {showBalanceModal && selectedAssignment && balanceAction && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal" style={{ maxWidth: '36rem' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {balanceAction === 'BALANCE_RETURN' ? '💰 Return Balance' : '📋 Collect Overdue'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{selectedAssignment.assignedToName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBalanceModal(false);
                  setBalanceAction(null);
                  setSelectedAssignment(null);
                  setBalanceNotes('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {balanceAction === 'BALANCE_RETURN' ? 'Balance to Return:' : 'Overdue Amount to Collect:'}
                  </span>
                  <span
                    className={`font-semibold text-lg ${
                      balanceAction === 'BALANCE_RETURN' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    LKR{' '}
                    {formatCurrency(
                      balanceAction === 'BALANCE_RETURN'
                        ? parseFloat(selectedAssignment.balanceAmount || 0)
                        : parseFloat(selectedAssignment.overAmount || 0)
                    )}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Assigned: LKR {formatCurrency(selectedAssignment.assignedAmount)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={balanceNotes}
                  onChange={(e) => setBalanceNotes(e.target.value)}
                  maxLength={500}
                  placeholder="Enter any additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows="3"
                />
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.includes('✓')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowBalanceModal(false);
                  setBalanceAction(null);
                  setSelectedAssignment(null);
                  setBalanceNotes('');
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBalanceSubmit}
                className={`px-4 py-2 text-white rounded-lg transition font-medium ${
                  balanceAction === 'BALANCE_RETURN'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {balanceAction === 'BALANCE_RETURN' ? 'Request Balance Return' : 'Request Overdue Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PropTypes ────────────────────────────────────────────────────────────────

JobPettyCash.propTypes = {
  job: PropTypes.shape({
    jobId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    shipmentCategory: PropTypes.string,
    assignments: PropTypes.array,
  }).isRequired,
  users: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      fullName: PropTypes.string,
      role: PropTypes.string,
    })
  ).isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default JobPettyCash;
