import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PropTypes from 'prop-types';
import apiClient from '../api/client';
import {
  sortAssignmentsDesc,
  computeSummary,
  getBalanceColorClass,
  validateAssignForm,
  validateSettlementItem,
  isAdminRole,
  isClerkRole,
  canEditSettlement,
  canDeleteSettlementItem,
} from '../utils/pettyCashUtils';
import '../styles/JobPettyCash.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (val) =>
  parseFloat(val || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (d) => new Date(d).toLocaleDateString();

// ─── Component ────────────────────────────────────────────────────────────────

function JobPettyCash({ job, users, onUpdate }) {
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [expandedAssignments, setExpandedAssignments] = useState(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignFormData, setAssignFormData] = useState({
    assignedTo: '',
    assignedAmount: '',
    notes: '',
  });
  const [settlementItems, setSettlementItems] = useState([]);
  const [inlineEditingItem, setInlineEditingItem] = useState(null);
  const [inlineEditName, setInlineEditName] = useState('');
  const [inlineEditCost, setInlineEditCost] = useState('');
  const [message, setMessage] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAction, setBalanceAction] = useState(null); // 'BALANCE_RETURN' or 'OVERDUE_COLLECTION'
  const [balanceNotes, setBalanceNotes] = useState('');

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (isAdminRole(user)) {
        // Admin / Manager: fetch ALL assignments for the job
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.jobId]);

  // ── Computed summary ───────────────────────────────────────────────────────

  const { totalAssigned, totalSettled, balance } = computeSummary(assignments);

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
    if (status === 'Assigned') return 'bg-blue-100 text-blue-800';
    if (
      status === 'Settled' ||
      status === 'Balance Returned' ||
      status === 'Overdue Collected'
    )
      return 'bg-green-100 text-green-800';
    if (status === 'Over Due') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-700';
  };

  // ── Assign submit handler ────────────────────────────────────────────────────

  const handleAssignSubmit = async (e) => {
    if (e) e.preventDefault();

    const validationError = validateAssignForm(assignFormData);
    if (validationError) {
      setMessage(validationError);
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      await apiClient.post('/petty-cash-assignments', {
        jobId: job.jobId,
        assignedTo: assignFormData.assignedTo,
        assignedAmount: parseFloat(assignFormData.assignedAmount),
        notes: assignFormData.notes || null,
      });

      setMessage('✓ Petty cash assigned successfully');
      setTimeout(() => setMessage(''), 3000);
      setAssignFormData({ assignedTo: '', assignedAmount: '', notes: '' });
      setShowAssignModal(false);
      await fetchAssignments();
      if (onUpdate) onUpdate();
    } catch (err) {
      const status = err.response?.status;
      const apiMessage = err.response?.data?.message;

      if (status === 400 && apiMessage?.toLowerCase().includes('bill')) {
        setMessage('Cannot assign petty cash — a bill already exists for this job.');
      } else {
        setMessage(apiMessage || 'Error assigning petty cash. Please try again.');
      }
      setTimeout(() => setMessage(''), 4000);
      // Modal stays open, form data preserved
    }
  };

  // ── Settle submit handler ──────────────────────────────────────────────────

  const handleSettleSubmit = async () => {
    // Filter to only items that need to be submitted (not already paid, and have values)
    const itemsToSubmit = settlementItems.filter(item => !item.alreadyPaid && item.actualCost);

    // Validate items to submit
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
        items: itemsToSubmit.map(item => ({
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
      // Modal stays open, items preserved
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

  // ── Open settle modal with pay item templates ──────────────────────────────

  const openSettleModal = async (assignment) => {
    setSelectedAssignment(assignment);
    setSettlementItems([]);

    // Load pay item templates for this job's shipment category
    if (job.shipmentCategory) {
      try {
        const response = await apiClient.get(
          `/pay-item-templates/category/${encodeURIComponent(job.shipmentCategory)}`
        );
        const templates = response.data;

        if (templates && templates.length > 0) {
          // Also fetch existing settlement items for this assignment
          let existingItems = [];
          try {
            const existingRes = await apiClient.get(
              `/petty-cash-assignments/${assignment.assignmentId}/settlement-items`
            );
            existingItems = Array.isArray(existingRes.data) ? existingRes.data : [];
          } catch (err) {
            // Non-critical
          }

          // Convert templates to settlement items, marking already-paid ones
          const loadedItems = templates.map(template => {
            const existingItem = existingItems.find(ei => ei.itemName === template.itemName);
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
        // If templates fail to load, just show empty modal
        console.error('Error loading pay item templates:', err);
      }
    }

    setShowSettleModal(true);
  };

  // ── Inline edit save handler ──────────────────────────────────────────────────

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

  // ── Inline delete handler ─────────────────────────────────────────────────────

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

  // ── Balance/Overdue return handler ────────────────────────────────────────────

  const handleBalanceSubmit = async () => {
    if (!selectedAssignment) return;

    const amount = balanceAction === 'BALANCE_RETURN' 
      ? parseFloat(selectedAssignment.balanceAmount || 0)
      : parseFloat(selectedAssignment.overAmount || 0);

    if (amount <= 0) {
      setMessage('No balance or overdue amount to process.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      await apiClient.post('/cash-balance-settlements', {
        assignmentId: selectedAssignment.assignmentId,
        settlementType: balanceAction,
        amount: amount,
        notes: balanceNotes || `${balanceAction === 'BALANCE_RETURN' ? 'Return balance' : 'Collect overdue'} for Assignment #${selectedAssignment.assignmentId}`,
      });

      setMessage(`✓ ${balanceAction === 'BALANCE_RETURN' ? 'Balance return' : 'Overdue collection'} submitted successfully`);
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
        <h3 className="text-base font-semibold text-gray-900">Petty Cash</h3>
        {isAdminRole(user) && (
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm"
            onClick={() => setShowAssignModal(true)}
          >
            + Assign Petty Cash
          </button>
        )}
      </div>

      {/* Inline message (shown when modals are closed) */}
      {message && !showAssignModal && !showSettleModal && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
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
            onClick={() => { fetchAssignments(); fetchInvoiceStatus(); }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && assignments.length === 0 && (
        <p className="text-sm text-gray-500 py-4">
          No petty cash assignments for this job.
        </p>
      )}

      {/* Normal state — assignments exist */}
      {!loading && !error && assignments.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="job-petty-cash-summary mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-500">Total Assigned: </span>
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
            {assignments.map((assignment) => (
              <div
                key={assignment.assignmentId}
                className="job-petty-cash-assignment-row p-4 bg-white rounded-lg border border-gray-200"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {/* Assigned-to user name */}
                  <span className="font-medium text-gray-900">
                    {assignment.assignedToName || `User #${assignment.assignedTo}`}
                  </span>

                  {/* Assigned amount */}
                  <span className="text-gray-700">
                    LKR {formatCurrency(assignment.assignedAmount)}
                  </span>

                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(assignment.status)}`}
                  >
                    {assignment.status}
                  </span>

                  {/* Balance / Overdue */}
                  {parseFloat(assignment.overAmount || 0) > 0 ? (
                    <span className="font-medium text-red-600">
                      Over Due: LKR {formatCurrency(assignment.overAmount)}
                    </span>
                  ) : (
                    <span className={`font-medium ${getBalanceColorClass(parseFloat(assignment.balanceAmount || 0))}`}>
                      Balance: LKR {formatCurrency(assignment.balanceAmount || 0)}
                    </span>
                  )}

                  {/* Assigned date */}
                  <span className="text-gray-400">
                    {assignment.assignedDate ? formatDate(assignment.assignedDate) : ''}
                  </span>

                  {/* Expand/collapse toggle */}
                  <button
                    className="ml-auto text-gray-400 hover:text-gray-600 transition"
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

                {/* Expanded section */}
                {expandedAssignments.has(assignment.assignmentId) && (
                  <div className="mt-3">
                    {/* Settlement items */}
                    {assignment.settlementItems && assignment.settlementItems.length > 0 ? (
                      <div className="mt-3">
                        {(() => {
                          const canEdit = canEditSettlement(user, assignment, invoiceGenerated);
                          return (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              {/* Table header */}
                              <div className="bg-gray-100 border-b border-gray-200 grid gap-0" style={{gridTemplateColumns: canEdit ? '2rem 1fr 5rem 8rem 5rem' : '2rem 1fr 5rem 8rem'}}>
                                <div className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">#</div>
                                <div className="px-3 py-2 text-xs font-semibold text-gray-700">Item Name</div>
                                <div className="px-3 py-2 text-xs font-semibold text-gray-700">Bill</div>
                                <div className="px-3 py-2 text-xs font-semibold text-gray-700 text-right">Actual Cost</div>
                                {canEdit && <div className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Actions</div>}
                              </div>
                              {/* Table rows */}
                              <div>
                                {assignment.settlementItems.map((item, idx) => {
                                  const isEditing = inlineEditingItem && 
                                    inlineEditingItem.assignmentId === assignment.assignmentId && 
                                    inlineEditingItem.itemId === item.settlementItemId;
                                  return (
                                    <div key={item.settlementItemId} className="grid gap-0 border-b border-gray-200 hover:bg-blue-50 transition" style={{gridTemplateColumns: canEdit ? '2rem 1fr 5rem 8rem 5rem' : '2rem 1fr 5rem 8rem'}}>
                                      <div className="px-3 py-2 flex items-center justify-center text-xs text-gray-500">{idx + 1}</div>
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
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">Bill</span>
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
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleInlineEditSave(assignment.assignmentId, item.settlementItemId); if (e.key === 'Escape') setInlineEditingItem(null); }}
                                          />
                                        ) : (
                                          <span className="text-sm font-medium text-gray-900">LKR {formatCurrency(item.actualCost)}</span>
                                        )}
                                      </div>
                                      {canEdit && (
                                        <div className="px-3 py-2 flex items-center justify-center">
                                          {isEditing ? (
                                            <div className="flex gap-1">
                                              <button onClick={() => handleInlineEditSave(assignment.assignmentId, item.settlementItemId)} title="Save" className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 hover:bg-green-200 transition">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                              </button>
                                              <button onClick={() => setInlineEditingItem(null)} title="Cancel" className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex gap-1">
                                              <button
                                                onClick={() => {
                                                  setInlineEditingItem({ assignmentId: assignment.assignmentId, itemId: item.settlementItemId });
                                                  setInlineEditName(item.itemName);
                                                  setInlineEditCost(String(item.actualCost));
                                                }}
                                                title="Edit item"
                                                className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                                              >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                              </button>
                                              {canDeleteSettlementItem(user, assignment, invoiceGenerated, assignment.settlementItems.length) && (
                                                <button
                                                  onClick={() => handleInlineDelete(assignment.assignmentId, item.settlementItemId, item.itemName)}
                                                  title="Delete item"
                                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                >
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
                                <div className="grid gap-0 border-t-2 border-gray-300 bg-gray-100" style={{gridTemplateColumns: canEdit ? '2rem 1fr 5rem 8rem 5rem' : '2rem 1fr 5rem 8rem'}}>
                                  <div className="px-3 py-2"></div>
                                  <div className="px-3 py-2"><strong className="text-sm text-gray-900">Total</strong></div>
                                  <div className="px-3 py-2"></div>
                                  <div className="px-3 py-2 text-right"><strong className="text-sm text-gray-900">LKR {formatCurrency(assignment.settlementItems.reduce((sum, i) => sum + parseFloat(i.actualCost || 0), 0))}</strong></div>
                                  {canEdit && <div className="px-3 py-2"></div>}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="mt-3 pl-4 border-l-2 border-gray-200">
                        <p className="text-sm text-gray-400">No settlement items yet.</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* Settle button: shown for Waff Clerk or Manager assigned to this assignment */}
                      {assignment.status === 'Assigned' && 
                        (isClerkRole(user) || user?.role === 'Manager') && assignment.assignedTo === user?.userId && (
                          <button
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition"
                            onClick={() => openSettleModal(assignment)}
                          >
                            Settle
                          </button>
                      )}

                      {/* Return Balance button: shown when there's a positive balance and assignment is settled */}
                      {parseFloat(assignment.balanceAmount || 0) > 0 && 
                        ['Settled', 'Balance To Be Return', 'Settled/Approved', 'Settled/Rejected'].includes(assignment.status) &&
                        (isClerkRole(user) || user?.role === 'Manager') && assignment.assignedTo === user?.userId && (
                          <button
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition"
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

                      {/* Collect Overdue button: shown when there's an overdue amount */}
                      {parseFloat(assignment.overAmount || 0) > 0 && 
                        ['Settled', 'Over Due', 'Settled/Approved', 'Settled/Rejected'].includes(assignment.status) &&
                        (isClerkRole(user) || user?.role === 'Manager') && assignment.assignedTo === user?.userId && (
                          <button
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition"
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
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Assign Petty Cash Modal */}
      {showAssignModal && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Assign Petty Cash</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >×</button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              {/* Job Reference — read only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Reference</label>
                <input
                  type="text"
                  value={job.jobId}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To <span className="text-red-600">*</span>
                </label>
                <select
                  value={assignFormData.assignedTo}
                  onChange={(e) => setAssignFormData({ ...assignFormData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select User</option>
                  {(job.assignments || []).map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.userName || users.find(u => String(u.userId) === String(a.userId))?.fullName || `User #${a.userId}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (LKR) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={assignFormData.assignedAmount}
                  onChange={(e) => setAssignFormData({ ...assignFormData, assignedAmount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={assignFormData.notes}
                  onChange={(e) => setAssignFormData({ ...assignFormData, notes: e.target.value })}
                  maxLength={500}
                  placeholder="Enter any notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows="3"
                />
              </div>

              {/* Message */}
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message}
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
              >Cancel</button>
              <button
                type="button"
                onClick={handleAssignSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
              >Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Settle Modal */}
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
                onClick={() => { setShowSettleModal(false); setSelectedAssignment(null); }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >×</button>
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
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${item.alreadyPaid ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300'}`}
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.actualCost}
                          onChange={(e) => updateSettlementItem(index, 'actualCost', e.target.value)}
                          placeholder="0.00"
                          readOnly={item.alreadyPaid}
                          className={`w-32 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${item.alreadyPaid ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-300'}`}
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
                          >✕</button>
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
                  <span className="text-gray-900">LKR {formatCurrency(
                    settlementItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0)
                  )}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="font-medium text-gray-600">Balance to Return:</span>
                  <span className="font-semibold text-red-600">
                    LKR {formatCurrency(
                      selectedAssignment.assignedAmount - settlementItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Message inside modal */}
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => { setShowSettleModal(false); setSelectedAssignment(null); }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg transition font-medium"
              >Cancel</button>
              <button
                type="button"
                onClick={handleSettleSubmit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
              >Settle Petty Cash</button>
            </div>
          </div>
        </div>
      )}

      {/* Balance/Overdue Modal */}
      {showBalanceModal && selectedAssignment && balanceAction && (
        <div className="job-petty-cash-modal-overlay">
          <div className="job-petty-cash-modal" style={{ maxWidth: '36rem' }}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {balanceAction === 'BALANCE_RETURN' ? '💰 Return Balance' : '📋 Collect Overdue'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedAssignment.assignedToName}
                </p>
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
              >×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Amount Display */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">
                    {balanceAction === 'BALANCE_RETURN' ? 'Balance to Return:' : 'Overdue Amount to Collect:'}
                  </span>
                  <span className={`font-semibold text-lg ${balanceAction === 'BALANCE_RETURN' ? 'text-green-600' : 'text-red-600'}`}>
                    LKR {formatCurrency(balanceAction === 'BALANCE_RETURN' ? parseFloat(selectedAssignment.balanceAmount || 0) : parseFloat(selectedAssignment.overAmount || 0))}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Assigned: LKR {formatCurrency(selectedAssignment.assignedAmount)}
                </div>
              </div>

              {/* Notes */}
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

              {/* Message inside modal */}
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
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
              >Cancel</button>
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
