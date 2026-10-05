import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import Pagination from './Pagination';
import apiClient from '../api/client';

function PaymentManagement() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [dbTransporterPayments, setDbTransporterPayments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'transporters'
  const [jobViewMode, setJobViewMode] = useState('all'); // 'all' | 'cheques'
  const [jobMethodFilter, setJobMethodFilter] = useState('All'); // 'All' | 'Cheque' | 'Bank Transfer' | 'Cash'
  const [jobStatusFilter, setJobStatusFilter] = useState('All'); // 'All' | 'Cleared' | 'Pending' | 'Bounced'
  const [searchTerm, setSearchTerm] = useState('');
  const [transporterMethodFilter, setTransporterMethodFilter] = useState('All');
  const [transporterStatusFilter, setTransporterStatusFilter] = useState('All');
  const [expandedCheque, setExpandedCheque] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);

  const hasAccess = () =>
    user && ['Admin', 'Super Admin', 'Manager'].includes(user.role);

  useEffect(() => {
    if (hasAccess()) fetchPayments();
  }, []);

  const fetchPayments = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [paymentsRes, tpRes, jobsRes, transportersRes] = await Promise.all([
        apiClient.get('/payments/all').catch(err => {
          console.warn('Could not fetch invoice payments:', err);
          return { data: [] };
        }),
        apiClient.get('/transporters/payments/all').catch(err => {
          console.warn('Could not fetch transporter payments:', err);
          return { data: { data: [] } };
        }),
        apiClient.get('/jobs').catch(err => {
          console.warn('Could not fetch jobs:', err);
          return { data: [] };
        }),
        apiClient.get('/transporters').catch(err => {
          console.warn('Could not fetch transporters:', err);
          return { data: [] };
        }),
      ]);

      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      setDbTransporterPayments(Array.isArray(tpRes.data?.data) ? tpRes.data.data : []);
      setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
      setTransporters(Array.isArray(transportersRes.data) ? transportersRes.data : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setMessage('Error loading payment data');
      setLoading(false);
    }
  };

  const formatCurrency = (v) =>
    `LKR ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB') : '-';

  const formatCusdecNumberForDisplay = (value) => {
    const rawValue = (value || '').trim();
    if (!rawValue) return '';
    const cleaned = rawValue.replace(/^i\s*-\s*/i, '').trim();
    return cleaned ? `I-${cleaned}` : '';
  };

  // ─── Transporter Payments Extractor & Deduplicator ─────────────────────────
  const transporterPayments = useMemo(() => {
    const list = [];
    const seenPaymentKeys = new Set();

    // 1. From database table TransporterPayments
    if (Array.isArray(dbTransporterPayments)) {
      dbTransporterPayments.forEach((p) => {
        const matchingJob = jobs.find(j => j.jobId === p.JobId);
        const matchingTransporter = transporters.find(t =>
          (t.transporterId && t.transporterId === p.TransporterId) ||
          (t.name && matchingJob?.transporter && t.name.toLowerCase() === matchingJob.transporter.toLowerCase())
        );

        let totalCost = 0;
        let paidAmount = 0;
        if (matchingJob) {
          const costItems = (Array.isArray(matchingJob.payItems) ? matchingJob.payItems : []).filter(item => {
            const label = (item?.description || item?.name || '').toLowerCase().trim();
            return label.startsWith('transporter cost') || label.startsWith('transport cost');
          });
          totalCost = costItems.reduce((s, it) => s + (parseFloat(it.actualCost || it.amount || it.billingAmount || 0) || 0), 0);
          paidAmount = costItems.reduce((s, it) => s + (parseFloat(it.paidAmount || 0) || 0), 0);
        }

        const dateStr = p.PaymentDate ? new Date(p.PaymentDate).toISOString().split('T')[0] : '';
        const key = `${p.JobId}-${p.Amount}-${dateStr}-${p.ChequeNumber || ''}`;
        seenPaymentKeys.add(key);

        list.push({
          paymentId: p.PaymentId,
          jobId: p.JobId,
          transporterId: p.TransporterId || matchingJob?.transporterId || '',
          transporterName: p.TransporterName || matchingTransporter?.name || matchingJob?.transporter || 'Transporter',
          shipmentCategory: p.ShipmentCategory || matchingJob?.shipmentCategory || '-',
          deliveryDate: p.TransportDeliveryDate || matchingJob?.transportDeliveryDate || null,
          customerName: p.CustomerName || matchingJob?.customerName || '',
          amount: parseFloat(p.Amount || 0),
          paymentMethod: p.PaymentMethod || 'Cash',
          paymentDate: p.PaymentDate || p.CreatedDate,
          chequeNumber: p.ChequeNumber || '',
          chequeDate: p.ChequeDate || '',
          chequeAmount: parseFloat(p.ChequeAmount || 0),
          bankName: p.BankName || '',
          paidByName: p.PaidByName || p.PaidBy || 'System',
          status: p.Status || (paidAmount >= totalCost && totalCost > 0 ? 'Paid' : 'Partially Paid'),
          totalCost: totalCost || parseFloat(p.Amount || 0),
          paidAmount: paidAmount || parseFloat(p.Amount || 0),
          remainingCost: Math.max(0, totalCost - paidAmount),
          notes: p.Notes || '',
        });
      });
    }

    // 2. From jobs' payItems
    if (Array.isArray(jobs)) {
      jobs.forEach((job) => {
        const costItems = (Array.isArray(job.payItems) ? job.payItems : []).filter(item => {
          const label = (item?.description || item?.name || '').toLowerCase().trim();
          return label.startsWith('transporter cost') || label.startsWith('transport cost');
        });

        const totalCost = costItems.reduce((s, it) => s + (parseFloat(it.actualCost || it.amount || it.billingAmount || 0) || 0), 0);
        const paidAmount = costItems.reduce((s, it) => s + (parseFloat(it.paidAmount || 0) || 0), 0);
        const remainingCost = Math.max(0, totalCost - paidAmount);

        const matchingTransporter = transporters.find(t =>
          (job.transporterId && t.transporterId === job.transporterId) ||
          (job.transporter && t.name && t.name.toLowerCase() === job.transporter.toLowerCase())
        );

        costItems.forEach((item) => {
          if (Array.isArray(item.paymentRecords) && item.paymentRecords.length > 0) {
            item.paymentRecords.forEach((pr, prIdx) => {
              const dateStr = pr.paymentDate ? new Date(pr.paymentDate).toISOString().split('T')[0] : '';
              const key = `${job.jobId}-${pr.amount}-${dateStr}-${pr.chequeNumber || ''}`;
              if (!seenPaymentKeys.has(key)) {
                seenPaymentKeys.add(key);
                list.push({
                  paymentId: `PAY-ITEM-${job.jobId}-${prIdx}-${dateStr}`,
                  jobId: job.jobId,
                  transporterId: job.transporterId || matchingTransporter?.transporterId || '',
                  transporterName: matchingTransporter?.name || job.transporter || 'Transporter',
                  shipmentCategory: job.shipmentCategory || '-',
                  deliveryDate: job.transportDeliveryDate || null,
                  customerName: job.customerName || '',
                  amount: parseFloat(pr.amount || 0),
                  paymentMethod: pr.paymentMethod || 'Cash',
                  paymentDate: pr.paymentDate,
                  chequeNumber: pr.chequeNumber || '',
                  chequeDate: pr.chequeDate || '',
                  chequeAmount: parseFloat(pr.chequeAmount || 0),
                  bankName: pr.bankName || '',
                  paidByName: pr.paidByName || pr.paidBy || 'System',
                  status: pr.status || (paidAmount >= totalCost && totalCost > 0 ? 'Paid' : 'Partially Paid'),
                  totalCost,
                  paidAmount,
                  remainingCost,
                  notes: pr.notes || '',
                });
              }
            });
          } else if (parseFloat(item.paidAmount || 0) > 0) {
            const dateStr = item.paymentDate ? new Date(item.paymentDate).toISOString().split('T')[0] : '';
            const key = `${job.jobId}-${item.paidAmount}-${dateStr}-${item.chequeNumber || ''}`;
            if (!seenPaymentKeys.has(key)) {
              seenPaymentKeys.add(key);
              list.push({
                paymentId: `PAY-LEGACY-${job.jobId}-${item.id || 0}`,
                jobId: job.jobId,
                transporterId: job.transporterId || matchingTransporter?.transporterId || '',
                transporterName: matchingTransporter?.name || job.transporter || 'Transporter',
                shipmentCategory: job.shipmentCategory || '-',
                deliveryDate: job.transportDeliveryDate || null,
                customerName: job.customerName || '',
                amount: parseFloat(item.paidAmount || 0),
                paymentMethod: item.paymentMethod || 'Cash',
                paymentDate: item.paymentDate,
                chequeNumber: item.chequeNumber || '',
                chequeDate: item.chequeDate || '',
                chequeAmount: parseFloat(item.chequeAmount || 0),
                bankName: item.bankName || '',
                paidByName: item.paidByName || item.paidBy || 'System',
                status: item.isPaid ? 'Paid' : 'Partially Paid',
                totalCost,
                paidAmount,
                remainingCost,
                notes: '',
              });
            }
          }
        });
      });
    }

    return list.sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));
  }, [dbTransporterPayments, jobs, transporters]);

  // ─── Group cheque payments into cheque records ───────────────────────────
  const chequeGroups = useMemo(() => {
    const chequePayments = payments.filter(p => p.paymentMethod === 'Cheque');
    const map = {};
    chequePayments.forEach(p => {
      const key = p.chequeNumber || p.paymentId;
      if (!map[key]) {
        map[key] = {
          chequeNumber: p.chequeNumber,
          chequeDate: p.chequeDate,
          paymentDate: p.paymentDate,
          chequeAmount: parseFloat(p.chequeAmount) || 0,
          bankName: p.bankName,
          customerName: p.customerName,
          customerId: p.customerId,
          status: p.status,
          invoices: [],
          transporterPayments: [],
        };
      }
      map[key].invoices.push(p);
      if (parseFloat(p.chequeAmount) > map[key].chequeAmount) {
        map[key].chequeAmount = parseFloat(p.chequeAmount);
      }
      if (p.paymentDate && (!map[key].paymentDate || new Date(p.paymentDate) < new Date(map[key].paymentDate))) {
        map[key].paymentDate = p.paymentDate;
      }
    });

    // Also include any transporter payments made via cheque
    transporterPayments.forEach(tp => {
      if (tp.paymentMethod === 'Cheque' && tp.chequeNumber) {
        const key = tp.chequeNumber;
        if (!map[key]) {
          map[key] = {
            chequeNumber: tp.chequeNumber,
            chequeDate: tp.chequeDate,
            paymentDate: tp.paymentDate,
            chequeAmount: parseFloat(tp.chequeAmount) || parseFloat(tp.amount) || 0,
            bankName: tp.bankName,
            customerName: `Transporter: ${tp.transporterName}`,
            customerId: tp.transporterId || '',
            status: tp.status || 'Cleared',
            invoices: [],
            transporterPayments: [],
          };
        }
        map[key].transporterPayments.push(tp);
        if (parseFloat(tp.chequeAmount) > map[key].chequeAmount) {
          map[key].chequeAmount = parseFloat(tp.chequeAmount);
        }
      }
    });

    return Object.values(map)
      .map(g => {
        const invAllocated = g.invoices.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const tpAllocated = g.transporterPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
        const totalAllocated = invAllocated + tpAllocated;
        return {
          ...g,
          totalAllocated,
          remainingBalance: g.chequeAmount - totalAllocated,
        };
      })
      .sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));
  }, [payments, transporterPayments]);

  // ─── Job Payments Summary KPI Stats ───────────────────────────────────────
  const jobPaymentsSummary = useMemo(() => {
    const totalAmount = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const chequeList = payments.filter(p => p.paymentMethod === 'Cheque');
    const bankList = payments.filter(p => p.paymentMethod === 'Bank Transfer');
    const cashList = payments.filter(p => p.paymentMethod === 'Cash');
    const uniqueJobs = new Set(payments.map(p => p.jobId).filter(Boolean)).size;

    return {
      totalAmount,
      totalCount: payments.length,
      chequeAmount: chequeList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      chequeCount: chequeList.length,
      bankAmount: bankList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      bankCount: bankList.length,
      cashAmount: cashList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      cashCount: cashList.length,
      uniqueJobs,
    };
  }, [payments]);

  // ─── Transporter Summary Stats ────────────────────────────────────────────
  const transporterSummary = useMemo(() => {
    const totalAmount = transporterPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const cashList = transporterPayments.filter(p => p.paymentMethod === 'Cash');
    const chequeList = transporterPayments.filter(p => p.paymentMethod === 'Cheque');
    const bankList = transporterPayments.filter(p => p.paymentMethod === 'Bank Transfer');
    const uniqueJobs = new Set(transporterPayments.map(p => p.jobId)).size;

    return {
      totalAmount,
      totalCount: transporterPayments.length,
      cashAmount: cashList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      cashCount: cashList.length,
      chequeAmount: chequeList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      chequeCount: chequeList.length,
      bankAmount: bankList.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      bankCount: bankList.length,
      uniqueJobs,
    };
  }, [transporterPayments]);

  // ─── Filtered Job Payments (Individual Transactions) ──────────────────────
  const filteredJobPayments = useMemo(() => {
    let list = payments;
    if (jobMethodFilter !== 'All') {
      list = list.filter(p => p.paymentMethod === jobMethodFilter);
    }
    if (jobStatusFilter !== 'All') {
      list = list.filter(p => (p.status || '').toLowerCase() === jobStatusFilter.toLowerCase());
    }
    if (searchTerm && activeTab === 'jobs' && jobViewMode === 'all') {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.customerId || '').toLowerCase().includes(q) ||
        (p.jobId || '').toLowerCase().includes(q) ||
        (p.cusdecNumber || '').toLowerCase().includes(q) ||
        (p.invoiceNumber || '').toLowerCase().includes(q) ||
        (p.chequeNumber || '').toLowerCase().includes(q) ||
        (p.bankName || '').toLowerCase().includes(q) ||
        (p.paymentMethod || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));
  }, [payments, jobMethodFilter, jobStatusFilter, searchTerm, activeTab, jobViewMode]);

  // ─── Filtered Cheques (Cheque Batches) ─────────────────────────────────────
  const filteredCheques = useMemo(() => {
    let list = chequeGroups;
    if (jobStatusFilter !== 'All') {
      list = list.filter(g => (g.status || '').toLowerCase() === jobStatusFilter.toLowerCase());
    }
    if (searchTerm && activeTab === 'jobs' && jobViewMode === 'cheques') {
      const q = searchTerm.toLowerCase();
      list = list.filter(g =>
        (g.chequeNumber || '').toLowerCase().includes(q) ||
        (g.customerName || '').toLowerCase().includes(q) ||
        (g.bankName || '').toLowerCase().includes(q) ||
        g.invoices.some(p => (p.jobId || '').toLowerCase().includes(q) || (p.invoiceNumber || '').toLowerCase().includes(q) || (p.cusdecNumber || '').toLowerCase().includes(q)) ||
        g.transporterPayments.some(p => (p.jobId || '').toLowerCase().includes(q) || (p.transporterName || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [chequeGroups, jobStatusFilter, searchTerm, activeTab, jobViewMode]);

  // ─── Filtered Transporter Payments ────────────────────────────────────────
  const filteredTransporterPayments = useMemo(() => {
    let list = transporterPayments;
    if (transporterMethodFilter !== 'All') {
      list = list.filter(p => p.paymentMethod === transporterMethodFilter);
    }
    if (transporterStatusFilter !== 'All') {
      list = list.filter(p => {
        if (transporterStatusFilter === 'Paid') return p.paidAmount >= p.totalCost && p.totalCost > 0;
        if (transporterStatusFilter === 'Partially Paid') return p.paidAmount < p.totalCost;
        return (p.status || '').toLowerCase() === transporterStatusFilter.toLowerCase();
      });
    }
    if (searchTerm && activeTab === 'transporters') {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.jobId || '').toLowerCase().includes(q) ||
        (p.transporterName || '').toLowerCase().includes(q) ||
        (p.transporterId || '').toLowerCase().includes(q) ||
        (p.chequeNumber || '').toLowerCase().includes(q) ||
        (p.bankName || '').toLowerCase().includes(q) ||
        (p.paidByName || '').toLowerCase().includes(q) ||
        (p.shipmentCategory || '').toLowerCase().includes(q) ||
        (p.customerName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [transporterPayments, transporterMethodFilter, transporterStatusFilter, searchTerm, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, jobMethodFilter, jobStatusFilter, jobViewMode, transporterMethodFilter, transporterStatusFilter, activeTab]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const updateChequeStatus = async (chequeNumber, status) => {
    const nowIso = new Date().toISOString();
    // Instant optimistic update
    setPayments(prev => prev.map(p => {
      if (p.chequeNumber === chequeNumber) {
        return {
          ...p,
          status,
          clearedDate: status === 'Cleared' ? nowIso : (status === 'Pending' ? null : p.clearedDate),
          bouncedDate: status === 'Bounced' ? nowIso : (status === 'Pending' ? null : p.bouncedDate)
        };
      }
      return p;
    }));

    try {
      await apiClient.put(`/payments/cheque/${chequeNumber}/status`, { status });
      setMessage(`Cheque ${chequeNumber} marked as ${status}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating cheque status');
      fetchPayments(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updatePaymentStatus = async (paymentId, status) => {
    const nowIso = new Date().toISOString();
    // Instant optimistic update
    setPayments(prev => prev.map(p => {
      if (p.paymentId === paymentId) {
        return {
          ...p,
          status,
          clearedDate: status === 'Cleared' ? nowIso : (status === 'Pending' ? null : p.clearedDate),
          bouncedDate: status === 'Bounced' ? nowIso : (status === 'Pending' ? null : p.bouncedDate)
        };
      }
      return p;
    }));

    try {
      await apiClient.put(`/payments/${paymentId}/status`, { status });
      setMessage(`Payment status updated to ${status}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error updating status');
      fetchPayments(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // ─── Pagination ───────────────────────────────────────────────────────────
  const activeList = activeTab === 'transporters'
    ? filteredTransporterPayments
    : (jobViewMode === 'cheques' ? filteredCheques : filteredJobPayments);

  const totalPages = Math.ceil(activeList.length / recordsPerPage) || 1;
  const paginatedList = activeList.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  if (!hasAccess()) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
        Access Denied: Admin, Super Admin, or Manager only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">

      {/* ── Header ── */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 text-sm mt-1">Track job payments, customer invoice settlements, and transporter disbursements</p>
        </div>
        <button onClick={fetchPayments} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium text-sm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {message && (
        <div className={`m-6 p-4 rounded-lg font-medium text-sm ${message.includes('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          {message}
        </div>
      )}

      {/* ── Tabs & Filter Controls ── */}
      <div className="p-6 space-y-4">
        {/* Top-Level Section Tabs: Job Payments vs Transporter Payments */}
        <div className="flex border-b border-gray-200 gap-0 overflow-x-auto">
          <button
            className={`flex items-center gap-2.5 px-6 py-4 font-semibold text-sm transition whitespace-nowrap ${
              activeTab === 'jobs'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/20'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => { setActiveTab('jobs'); setCurrentPage(1); }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Job Payments
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'jobs' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {payments.length}
            </span>
          </button>

          <button
            className={`flex items-center gap-2.5 px-6 py-4 font-semibold text-sm transition whitespace-nowrap ${
              activeTab === 'transporters'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/20'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => { setActiveTab('transporters'); setCurrentPage(1); }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Transporter Payments
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'transporters' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
            }`}>
              {transporterPayments.length}
            </span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex-1 relative">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-3 text-gray-400">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder={
                activeTab === 'transporters'
                  ? 'Search job ID, transporter, cheque no., bank, paid by...'
                  : (jobViewMode === 'cheques'
                    ? 'Search cheque no., customer, bank, job...'
                    : 'Search job ID, CUSDEC, customer, invoice no., cheque #, bank...')
              }
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          {/* Controls for Job Payments */}
          {activeTab === 'jobs' && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Toggle: All Payments vs Cheque Batches */}
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
                <button
                  type="button"
                  onClick={() => { setJobViewMode('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    jobViewMode === 'all'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Payments
                </button>
                <button
                  type="button"
                  onClick={() => { setJobViewMode('cheques'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                    jobViewMode === 'cheques'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Cheque Batches ({chequeGroups.length})
                </button>
              </div>

              {/* Method filter (shown in All Payments mode) */}
              {jobViewMode === 'all' && (
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium text-gray-700"
                  value={jobMethodFilter}
                  onChange={e => { setJobMethodFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="All">All Methods</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              )}

              {/* Status filter */}
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium text-gray-700"
                value={jobStatusFilter}
                onChange={e => { setJobStatusFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="All">All Status</option>
                <option value="Cleared">Cleared / Deposited</option>
                <option value="Pending">Pending</option>
                <option value="Bounced">Bounced</option>
              </select>
            </div>
          )}

          {/* Controls for Transporter Payments */}
          {activeTab === 'transporters' && (
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium text-gray-700"
                value={transporterMethodFilter}
                onChange={e => setTransporterMethodFilter(e.target.value)}
              >
                <option value="All">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium text-gray-700"
                value={transporterStatusFilter}
                onChange={e => setTransporterStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Paid">Fully Paid</option>
                <option value="Partially Paid">Partially Paid</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: JOB PAYMENTS
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'jobs' && (
        <div className="p-6 pt-0">
          {/* Job Payments KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div
              className={`border rounded-xl p-4 transition cursor-pointer shadow-xs ${
                jobMethodFilter === 'All' && jobViewMode === 'all'
                  ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-white border-gray-200 hover:border-blue-200'
              }`}
              onClick={() => { setJobMethodFilter('All'); setJobViewMode('all'); setCurrentPage(1); }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Received</span>
                <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(jobPaymentsSummary.totalAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {jobPaymentsSummary.totalCount} payment{jobPaymentsSummary.totalCount !== 1 ? 's' : ''} across {jobPaymentsSummary.uniqueJobs} job{jobPaymentsSummary.uniqueJobs !== 1 ? 's' : ''}
              </p>
            </div>

            <div
              className={`border rounded-xl p-4 transition cursor-pointer shadow-xs ${
                jobMethodFilter === 'Cheque' && jobViewMode === 'all'
                  ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20'
                  : 'bg-white border-gray-200 hover:border-indigo-200'
              }`}
              onClick={() => { setJobMethodFilter('Cheque'); setJobViewMode('all'); setCurrentPage(1); }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Cheques</span>
                <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(jobPaymentsSummary.chequeAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {jobPaymentsSummary.chequeCount} cheque payment{jobPaymentsSummary.chequeCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div
              className={`border rounded-xl p-4 transition cursor-pointer shadow-xs ${
                jobMethodFilter === 'Bank Transfer' && jobViewMode === 'all'
                  ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-500/20'
                  : 'bg-white border-gray-200 hover:border-purple-200'
              }`}
              onClick={() => { setJobMethodFilter('Bank Transfer'); setJobViewMode('all'); setCurrentPage(1); }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Bank Transfers</span>
                <span className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7h20L12 2z"/><rect x="4" y="10" width="16" height="10"/><line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/>
                  </svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(jobPaymentsSummary.bankAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {jobPaymentsSummary.bankCount} transfer{jobPaymentsSummary.bankCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div
              className={`border rounded-xl p-4 transition cursor-pointer shadow-xs ${
                jobMethodFilter === 'Cash' && jobViewMode === 'all'
                  ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white border-gray-200 hover:border-emerald-200'
              }`}
              onClick={() => { setJobMethodFilter('Cash'); setJobViewMode('all'); setCurrentPage(1); }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Cash Payments</span>
                <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(jobPaymentsSummary.cashAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {jobPaymentsSummary.cashCount} cash payment{jobPaymentsSummary.cashCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* VIEW MODE 1: All Payments (Individual Transactions) */}
          {jobViewMode === 'all' && (
            <div>
              {paginatedList.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-4xl mb-3">💳</div>
                  <p className="text-gray-600 font-medium">
                    {searchTerm || jobMethodFilter !== 'All' || jobStatusFilter !== 'All'
                      ? 'No job payments match your filter criteria'
                      : 'No job payments recorded yet'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Date</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Job ID / CUSDEC</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Invoice No.</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Method</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedList.map((p) => (
                          <tr key={p.paymentId} className="hover:bg-gray-50/80 transition">
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <span className="font-medium text-gray-900">{formatDate(p.paymentDate)}</span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex flex-col gap-0.5">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold w-fit">
                                  {p.jobId || '-'}
                                </span>
                                {p.cusdecNumber && p.cusdecNumber.trim() ? (
                                  <span className="text-[11px] font-medium text-gray-500">
                                    {formatCusdecNumberForDisplay(p.cusdecNumber)}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="font-semibold text-gray-900">{p.customerName || '-'}</div>
                              {p.customerId && <div className="text-xs text-gray-500">{p.customerId}</div>}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 font-mono text-xs">
                              {p.invoiceNumber || '—'}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                                  p.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-800' :
                                  p.paymentMethod === 'Cheque' ? 'bg-blue-100 text-blue-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {p.paymentMethod}
                                </span>
                                {p.paymentMethod === 'Cheque' && p.chequeNumber && (
                                  <span className="text-[11px] font-mono text-gray-600">
                                    #{p.chequeNumber}{p.bankName ? ` (${p.bankName})` : ''}
                                  </span>
                                )}
                                {p.paymentMethod === 'Bank Transfer' && p.bankName && (
                                  <span className="text-[11px] text-gray-500">{p.bankName}</span>
                                )}
                                {p.paymentMethod === 'Cash' && p.notes && (
                                  <span className="text-[11px] text-gray-400 italic truncate max-w-xs">{p.notes}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="text-emerald-700 font-bold text-base">
                                {formatCurrency(p.amount)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                (p.status || 'pending').toLowerCase() === 'cleared' ? 'bg-green-100 text-green-800' :
                                (p.status || 'pending').toLowerCase() === 'bounced' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {p.status || 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                {p.status === 'Pending' && (
                                  <button
                                    className="px-2.5 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition text-xs font-medium"
                                    onClick={() => updatePaymentStatus(p.paymentId, 'Cleared')}
                                  >
                                    Confirm
                                  </button>
                                )}
                                {p.paymentMethod === 'Cheque' && p.chequeNumber && (
                                  <button
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded transition text-xs font-medium"
                                    onClick={() => {
                                      setJobViewMode('cheques');
                                      setExpandedCheque(p.chequeNumber);
                                    }}
                                  >
                                    View Cheque
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {activeList.length > 0 && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalRecords={activeList.length}
                        recordsPerPage={recordsPerPage}
                        onPageChange={p => setCurrentPage(p)}
                        onRecordsPerPageChange={n => { setRecordsPerPage(n); setCurrentPage(1); }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* VIEW MODE 2: Cheque Batches (Grouped Envelopes) */}
          {jobViewMode === 'cheques' && (
            <div>
              {paginatedList.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-600 font-medium">
                    {searchTerm ? 'No cheques match your search' : 'No cheque records found'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cheque No.</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cheque Date</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Customer / Entity</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cheque Amount</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Allocated</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Balance</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Allocations</th>
                          <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedList.map((group) => (
                          <React.Fragment key={group.chequeNumber}>
                            <tr className="hover:bg-gray-50/80 transition">
                              <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                <span className="font-mono">{group.chequeNumber || '-'}</span>
                                {group.bankName && <div className="text-xs text-gray-500 font-normal">{group.bankName}</div>}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(group.chequeDate)}</td>
                              <td className="px-6 py-4 text-sm">
                                <div className="font-semibold text-gray-900">{group.customerName || '-'}</div>
                                {group.customerId && <div className="text-xs text-gray-500">{group.customerId}</div>}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(group.chequeAmount)}</td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-medium">{formatCurrency(group.totalAllocated)}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`font-bold ${group.remainingBalance < 0 ? 'text-red-700' : group.remainingBalance === 0 ? 'text-green-700' : 'text-gray-900'}`}>
                                  {formatCurrency(group.remainingBalance)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                                  {group.invoices.length + group.transporterPayments.length} item{(group.invoices.length + group.transporterPayments.length) !== 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                    className={`px-3 py-1 rounded transition text-xs font-medium ${
                                      expandedCheque === group.chequeNumber
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                                    onClick={() => setExpandedCheque(expandedCheque === group.chequeNumber ? null : group.chequeNumber)}
                                  >
                                    {expandedCheque === group.chequeNumber ? 'Hide' : 'View'}
                                  </button>
                                  {group.status === 'Pending' && (
                                    <button
                                      className="px-2.5 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition text-xs font-medium"
                                      onClick={() => updateChequeStatus(group.chequeNumber, 'Cleared')}
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Cheque Details Drawer */}
                            {expandedCheque === group.chequeNumber && (
                              <tr className="border-b border-gray-200 bg-gray-50/70">
                                <td colSpan="8" className="px-6 py-6">
                                  <div className="space-y-4">
                                    {group.invoices.length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-3 font-semibold text-gray-900 text-sm">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                                          </svg>
                                          Covered Invoices ({group.invoices.length})
                                        </div>

                                        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                                          <table className="w-full text-sm">
                                            <thead>
                                              <tr className="border-b border-gray-200 bg-gray-100">
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">#</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Job ID / CUSDEC</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Invoice No.</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Invoice Amount</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Payment Date</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {group.invoices.map((inv, i) => (
                                                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                                  <td className="px-4 py-2 text-gray-900 font-medium">{i + 1}</td>
                                                  <td className="px-4 py-2 text-gray-900">
                                                    {inv.cusdecNumber && inv.cusdecNumber.trim() ? (
                                                      <span>{inv.jobId || '-'} / {formatCusdecNumberForDisplay(inv.cusdecNumber)}</span>
                                                    ) : (
                                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">{inv.jobId}</span>
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-2 text-gray-600 font-mono text-xs">{inv.invoiceNumber || '—'}</td>
                                                  <td className="px-4 py-2 text-gray-900 font-semibold">{formatCurrency(inv.amount)}</td>
                                                  <td className="px-4 py-2 text-gray-600">{formatDate(inv.paymentDate)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {group.transporterPayments.length > 0 && (
                                      <div>
                                        <div className="flex items-center gap-2 mb-3 font-semibold text-gray-900 text-sm">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="1" y="3" width="15" height="13"/>
                                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                                          </svg>
                                          Transporter Disbursements Covered ({group.transporterPayments.length})
                                        </div>

                                        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                                          <table className="w-full text-sm">
                                            <thead>
                                              <tr className="border-b border-gray-200 bg-gray-100">
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">#</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Job ID</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Transporter</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Disbursed Amount</th>
                                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Payment Date</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {group.transporterPayments.map((tp, i) => (
                                                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                                  <td className="px-4 py-2 text-gray-900 font-medium">{i + 1}</td>
                                                  <td className="px-4 py-2">
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">{tp.jobId}</span>
                                                  </td>
                                                  <td className="px-4 py-2 text-gray-900 font-medium">{tp.transporterName}</td>
                                                  <td className="px-4 py-2 text-green-700 font-semibold">{formatCurrency(tp.amount)}</td>
                                                  <td className="px-4 py-2 text-gray-600">{formatDate(tp.paymentDate)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex justify-between items-center bg-gray-100 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-900">
                                      <span>Total Allocated from Cheque:</span>
                                      <span>{formatCurrency(group.totalAllocated)}</span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {activeList.length > 0 && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalRecords={activeList.length}
                        recordsPerPage={recordsPerPage}
                        onPageChange={p => setCurrentPage(p)}
                        onRecordsPerPageChange={n => { setRecordsPerPage(n); setCurrentPage(1); }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: TRANSPORTER PAYMENTS
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transporters' && (
        <div className="p-6 pt-0">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Disbursed</span>
                <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(transporterSummary.totalAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">{transporterSummary.totalCount} payment{transporterSummary.totalCount !== 1 ? 's' : ''} across {transporterSummary.uniqueJobs} job{transporterSummary.uniqueJobs !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Cash Payments</span>
                <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(transporterSummary.cashAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">{transporterSummary.cashCount} cash disbursement{transporterSummary.cashCount !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Cheque Payments</span>
                <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(transporterSummary.chequeAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">{transporterSummary.chequeCount} cheque disbursement{transporterSummary.chequeCount !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Bank Transfers</span>
                <span className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7h20L12 2z"/><rect x="4" y="10" width="16" height="10"/><line x1="8" y1="10" x2="8" y2="20"/><line x1="16" y1="10" x2="16" y2="20"/></svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(transporterSummary.bankAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">{transporterSummary.bankCount} transfer{transporterSummary.bankCount !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Table */}
          {paginatedList.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-4xl mb-3">🚚</div>
              <p className="text-gray-600 font-medium">
                {searchTerm || transporterMethodFilter !== 'All' || transporterStatusFilter !== 'All'
                  ? 'No transporter payments match your filter criteria'
                  : 'No transporter payments recorded yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Payment Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Job ID</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Transporter</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount Paid</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Cost & Balance</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Paid By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedList.map((p, idx) => (
                      <tr key={p.paymentId || idx} className="hover:bg-gray-50/80 transition">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="font-medium text-gray-900">{formatDate(p.paymentDate)}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-xs">{p.jobId}</span>
                            {p.shipmentCategory && p.shipmentCategory !== '-' && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-medium">{p.shipmentCategory}</span>
                            )}
                          </div>
                          {p.deliveryDate && (
                            <div className="text-[11px] text-gray-500 mt-0.5">Del: {formatDate(p.deliveryDate)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-semibold text-gray-900">{p.transporterName || 'Transporter'}</div>
                          {p.transporterId && <div className="text-xs text-gray-500">{p.transporterId}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                              p.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-800' :
                              p.paymentMethod === 'Cheque' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {p.paymentMethod}
                            </span>
                            {p.paymentMethod === 'Cheque' && p.chequeNumber && (
                              <span className="text-[11px] font-mono text-gray-600">
                                #{p.chequeNumber}{p.bankName ? ` (${p.bankName})` : ''}
                              </span>
                            )}
                            {p.paymentMethod === 'Bank Transfer' && p.bankName && (
                              <span className="text-[11px] text-gray-500">{p.bankName}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="text-green-700 font-bold text-base">
                            {formatCurrency(p.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-xs space-y-0.5">
                            <div className="text-gray-500">Cost: <span className="font-semibold text-gray-900">{formatCurrency(p.totalCost)}</span></div>
                            <div className={p.remainingCost > 0 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                              {p.remainingCost > 0 ? `Rem: ${formatCurrency(p.remainingCost)}` : 'Fully Settled'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {p.paidByName || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeList.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={activeList.length}
                    recordsPerPage={recordsPerPage}
                    onPageChange={p => setCurrentPage(p)}
                    onRecordsPerPageChange={n => { setRecordsPerPage(n); setCurrentPage(1); }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PaymentManagement;
