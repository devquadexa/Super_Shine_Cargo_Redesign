import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { customerService } from '../api/services/customerService';
import { jobService } from '../api/services/jobService';
import { billingService } from '../api/services/billingService';
import { pettyCashService } from '../api/services/pettyCashService';
import { accountingService } from '../api/services/accountingService';

/* ──────────────────────────────────────────────────────────────
   Theme + reusable presentational components
   Primary brand color: #1E3F63 (dark blue, matches login)
   ────────────────────────────────────────────────────────────── */
const tint = (hex) => `${hex}14`; // ~8% alpha background tint

const Icons = {
  wallet:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M21 12h-6a2 2 0 0 0 0 4h6v-4Z"/></svg>,
  check:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M20 6 9 17l-5-5"/></svg>,
  clock:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  trending:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m3 17 6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>,
  briefcase:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  folder:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>,
  truck:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  checkCircle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>,
  bank:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m3 10 9-6 9 6"/><path d="M4 10v10h16V10"/><path d="M9 20v-6h6v6"/></svg>,
  coins:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="8" cy="8" r="5"/><path d="M15 6.5a5 5 0 1 1 0 11"/></svg>,
  send:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
  alert:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  users:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

// Large headline metric card (financials)
function KpiCard({ label, value, sub, accent = '#1E3F63', icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between transition-shadow hover:shadow-md">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-2 truncate" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ml-3"
           style={{ backgroundColor: tint(accent), color: accent }}>
        {icon}
      </div>
    </div>
  );
}

// Compact operational count card
function OpsCard({ label, value, accent = '#1E3F63', icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
           style={{ backgroundColor: tint(accent), color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1.5">{label}</p>
      </div>
    </div>
  );
}

// Cash flow card with accent left border
function CashCard({ label, value, sub, accent = '#1E3F63', icon }) {
  return (
    <div className="rounded-xl border border-gray-100 p-5 bg-gray-50" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: tint(accent), color: accent }}>{icon}</span>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide leading-tight">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// Dashboard sections that can be toggled on/off per user
const DASHBOARD_SECTIONS = [
  { key: 'kpi',        label: 'Revenue KPIs' },
  { key: 'operations', label: 'Operational Stats' },
  { key: 'invoices',   label: 'Invoice Overview' },
  { key: 'cashflow',   label: 'Cash Flow Tracking' },
];

const DEFAULT_SECTIONS = { kpi: true, operations: true, invoices: true, cashflow: true };

function Dashboard() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalJobs: 0,
    openJobs: 0,
    inTransitJobs: 0,
    closedJobs: 0,
    totalBills: 0,
    unpaidBills: 0,
    paidBills: 0,
    fullyPaidBills: 0,
    partiallyPaidBills: 0,
    strictUnpaidBills: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    pettyCashBalance: 0,
    userPettyCash: 0,
    mainAccountBalance: 0,
    totalAssignedPettyCash: 0,
    totalSettled: 0,
    balanceReturned: 0,
    overdueCollected: 0,
    pettyCashIssued: 0,
    uncollectedCash: 0,
    conversionRate: 0
  });
  const [accountingData, setAccountingData] = useState(null);

  // Per-user dashboard customization (section visibility)
  const prefsKey = `dashboardSections_${user?.username || user?.fullName || 'default'}`;
  const [visibleSections, setVisibleSections] = useState(() => {
    try {
      const saved = localStorage.getItem(`dashboardSections_${user?.username || user?.fullName || 'default'}`);
      if (saved) return { ...DEFAULT_SECTIONS, ...JSON.parse(saved) };
    } catch (e) { /* ignore */ }
    return DEFAULT_SECTIONS;
  });
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(prefsKey, JSON.stringify(visibleSections)); } catch (e) { /* ignore */ }
  }, [prefsKey, visibleSections]);

  const toggleSection = (key) =>
    setVisibleSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const getDateRange = useCallback(() => {
    const now = new Date();
    // End of today (inclusive)
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    switch (timePeriod) {
      case 'today': {
        const s = new Date(now); s.setHours(0, 0, 0, 0);
        return { startDate: s, endDate: dayEnd };
      }
      // Last 7 days (including today)
      case 'week': {
        const s = new Date(now); s.setDate(now.getDate() - 6); s.setHours(0, 0, 0, 0);
        return { startDate: s, endDate: dayEnd };
      }
      // Last 30 days (including today)
      case 'month': {
        const s = new Date(now); s.setDate(now.getDate() - 29); s.setHours(0, 0, 0, 0);
        return { startDate: s, endDate: dayEnd };
      }
      // Last 12 months (approx - include today)
      case 'year': {
        const s = new Date(now); s.setFullYear(now.getFullYear() - 1); s.setHours(0, 0, 0, 0);
        return { startDate: s, endDate: dayEnd };
      }
      case 'custom':
        if (customDateRange.startDate && customDateRange.endDate) {
          return {
            startDate: new Date(new Date(customDateRange.startDate).setHours(0, 0, 0, 0)),
            endDate: new Date(customDateRange.endDate + 'T23:59:59')
          };
        }
        return null;
      default:
        return null;
    }
  }, [timePeriod, customDateRange]);

  const filterByDate = useCallback((items, primaryField, fallbackFields = []) => {
    const range = getDateRange();
    if (!range || !items) return items;
    
    console.log('🔍 filterByDate called:', { 
      primaryField,
      itemCount: items.length, 
      startDate: range.startDate.toISOString(), 
      endDate: range.endDate.toISOString() 
    });
    
    const filtered = items.filter(item => {
      if (!item) return false;
      
      // Try primary field first, then fallbacks
      let dateValue = item[primaryField];
      if (!dateValue) {
        for (const fallback of fallbackFields) {
          if (item[fallback]) {
            dateValue = item[fallback];
            break;
          }
        }
      }
      
      if (!dateValue) {
        console.log('⚠️ No date field found for item:', { 
          itemId: item.jobId || item.billId || item.customerId, 
          tried: [primaryField, ...fallbackFields]
        });
        return false;
      }
      
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) {
        console.log('❌ Invalid date:', dateValue);
        return false;
      }
      
      const isInRange = d >= range.startDate && d <= range.endDate;
      if (!isInRange) {
        console.log(`❌ Out of range: ${d.toISOString()} (field: ${primaryField})`);
      }
      
      return isInRange;
    });
    
    console.log(`✅ Filtered ${filtered.length} of ${items.length} items`);
    return filtered;
  }, [getDateRange]);

  const fetchStats = useCallback(async () => {
    try {
      let pettyCashData = { balance: 0 };
      if (['Super Admin', 'Admin', 'Manager', 'Office Executive'].includes(user?.role)) {
        pettyCashData = await pettyCashService.getBalance();
      } else if (user?.role === 'Waff Clerk') {
        pettyCashData = await pettyCashService.getUserAssignedBalance();
      }

      // Petty cash settlement summary (admins) — assigned / settled / balance returned / overdue collected
      let pcSummary = { totalAssigned: 0, totalSettled: 0, balanceReturned: 0, overdueCollected: 0 };
      if (['Super Admin', 'Admin'].includes(user?.role)) {
        try {
          const grouped = await pettyCashService.getGroupedAssignments();
          const list = Array.isArray(grouped) ? grouped : [];
          const range = getDateRange();
          const inRange = (g) => {
            if (timePeriod === 'all' || !range) return true;
            const times = (g.assignments || [])
              .map(a => new Date(a.assignedDate).getTime())
              .filter(t => !Number.isNaN(t));
            if (times.length === 0) return false;
            const latest = new Date(Math.max(...times));
            return latest >= range.startDate && latest <= range.endDate;
          };
          pcSummary = list.filter(inRange).reduce((acc, g) => ({
            totalAssigned:    acc.totalAssigned    + (parseFloat(g.totalAssigned) || 0),
            totalSettled:     acc.totalSettled     + (parseFloat(g.totalSpent)    || 0),
            balanceReturned:  acc.balanceReturned  + (parseFloat(g.totalBalance)  || 0),
            overdueCollected: acc.overdueCollected + (parseFloat(g.totalOver)     || 0),
          }), pcSummary);
        } catch (e) {
          console.error('Error fetching petty cash assignments summary:', e);
        }
      }

      const [customers, jobs, bills] = await Promise.all([
        user?.role !== 'Waff Clerk' ? customerService.getAll() : Promise.resolve([]),
        jobService.getAll(),
        user?.role !== 'Waff Clerk' ? billingService.getBills() : Promise.resolve([])
      ]);

      console.log('📊 fetchStats - timePeriod:', timePeriod);
      console.log('📊 Raw data counts:', { customers: customers.length, jobs: jobs.length, bills: bills.length });
      
      // Filter data by date - use openDate for jobs (when job started), billDate for bills, registrationDate for customers
      const fCustomers = timePeriod === 'all' ? customers : filterByDate(customers, 'registrationDate', ['createdDate']);
      const fJobs      = timePeriod === 'all' ? jobs      : filterByDate(jobs, 'openDate', ['createdDate']);
      const fBills     = timePeriod === 'all' ? bills     : filterByDate(bills, 'billDate', ['invoiceDate', 'createdDate']);
      
      console.log('📊 Filtered data counts:', { customers: fCustomers.length, jobs: fJobs.length, bills: fBills.length });

      const paidBills    = fBills.filter(b => b.paymentStatus === 'Paid' || b.paymentStatus === 'Partially Paid');
      const unpaidBills  = fBills.filter(b => b.paymentStatus === 'Unpaid' || b.paymentStatus === 'Partially Paid');

      // Mutually-exclusive invoice counts (each invoice falls into exactly one bucket).
      // These add up to the total: fullyPaid + partiallyPaid + strictUnpaid = totalBills
      const fullyPaidBills     = fBills.filter(b => b.paymentStatus === 'Paid').length;
      const partiallyPaidBills = fBills.filter(b => b.paymentStatus === 'Partially Paid').length;
      const strictUnpaidBills  = fBills.filter(b => b.paymentStatus === 'Unpaid').length;

      const totalRevenue   = paidBills.reduce((s, b) => s + (parseFloat(b.paidAmount) || parseFloat(b.netTotal) || parseFloat(b.total) || parseFloat(b.billingAmount) || 0), 0);
      const pendingRevenue = unpaidBills.reduce((s, b) => s + (parseFloat(b.remainingAmount) || parseFloat(b.netTotal) || parseFloat(b.total) || parseFloat(b.billingAmount) || 0), 0);
      const conversionRate = fBills.length > 0 ? Math.round((paidBills.length / fBills.length) * 100) : 0;

      // Note: Petty cash issued calculation requires petty cash assignments data
      // For now, when filtering by date, we cannot accurately calculate this without additional API support
      // TODO: Add API endpoint to get petty cash assignments filtered by date
      const pettyCashIssuedFiltered = 0; // Placeholder - requires petty cash assignments API

      setStats({
        totalCustomers:   fCustomers.length,
        totalJobs:        fJobs.length,
        openJobs:         fJobs.filter(j => j.status === 'Open').length,
        inTransitJobs:    fJobs.filter(j => j.status === 'In Transit').length,
        closedJobs:       fJobs.filter(j => j.status === 'Completed').length,
        totalBills:       fBills.length,
        unpaidBills:      unpaidBills.length,
        paidBills:        paidBills.length,
        fullyPaidBills,
        partiallyPaidBills,
        strictUnpaidBills,
        totalRevenue,
        pendingRevenue,
        pettyCashBalance: pettyCashData.balance,
        userPettyCash:    pettyCashData.balance,
        mainAccountBalance: 0,
        totalAssignedPettyCash: pcSummary.totalAssigned,
        totalSettled:           pcSummary.totalSettled,
        balanceReturned:        pcSummary.balanceReturned,
        overdueCollected:       pcSummary.overdueCollected,
        pettyCashIssued:  pettyCashIssuedFiltered,
        uncollectedCash:  pendingRevenue,
        conversionRate
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [user, timePeriod, filterByDate, getDateRange]);

  const fetchAccountingData = useCallback(async () => {
    try {
      const data = await accountingService.getDashboard();
      setAccountingData(data);
    } catch (err) {
      console.error('Error fetching accounting data:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    if (user?.role === 'Super Admin' || user?.role === 'Admin') fetchAccountingData();
  }, [fetchStats, fetchAccountingData, user]);

  const fmt = (amount) =>
    'LKR ' + parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const periods = [
    { key: 'all',    label: 'All Time' },
    { key: 'today',  label: 'Today' },
    { key: 'week',   label: 'Last 7 Days' },
    { key: 'month',  label: 'Last 30 Days' },
    { key: 'year',   label: 'Last 12 Months' },
    { key: 'custom', label: 'Custom' },
  ];

  const handlePeriodChange = (key) => {
    setTimePeriod(key);
    if (key !== 'custom') setCustomDateRange({ startDate: '', endDate: '' });
  };

  // Use accounting data ONLY when "All Time" is selected (it's always all-time data)
  // When a period filter is active, always use the date-filtered `stats`
  const useAccounting = accountingData && timePeriod === 'all';

  const totalRevenue    = useAccounting ? accountingData.summary.totalBillingAmount  : (stats.totalRevenue + stats.pendingRevenue);
  const collectedRev    = useAccounting ? accountingData.summary.totalPaid           : stats.totalRevenue;
  const outstandingRev  = useAccounting ? accountingData.summary.totalOutstanding    : stats.pendingRevenue;
  const overdueRev      = useAccounting ? accountingData.summary.totalOverdue        : 0;
  const totalJobsAcc    = useAccounting ? accountingData.summary.totalJobs           : stats.totalJobs;
  const paidJobsCount   = useAccounting ? accountingData.summary.paidJobsCount       : stats.paidBills;
  const overdueCount    = useAccounting ? accountingData.summary.overdueJobsCount    : 0;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Shared page header
  const PageHeader = ({ actions }) => (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E3F63] tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.fullName} — Super Shine Cargo Service</p>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <span className="hidden md:inline text-xs font-medium text-gray-400">{today}</span>
      </div>
    </div>
  );

  // Top-right controls: period dropdown + dashboard customize menu
  const HeaderControls = () => (
    <>
      {/* Period dropdown */}
      <select
        value={timePeriod}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none focus:border-[#1E3F63] focus:ring-1 focus:ring-[#1E3F63] cursor-pointer"
        title="Filter period"
      >
        {periods.map((p) => (
          <option key={p.key} value={p.key}>{p.label}</option>
        ))}
      </select>

      {/* Customize dashboard */}
      <div className="relative">
        <button
          onClick={() => setShowCustomize((s) => !s)}
          className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-[#1E3F63] hover:border-[#1E3F63] transition"
          title="Customize dashboard"
          aria-label="Customize dashboard"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {showCustomize && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowCustomize(false)} />
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-40 p-4 text-left">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Customize Dashboard</p>
              <div className="space-y-3">
                {DASHBOARD_SECTIONS.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{s.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={visibleSections[s.key]}
                      onClick={() => toggleSection(s.key)}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${visibleSections[s.key] ? 'bg-[#15803d]' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${visibleSections[s.key] ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  /* ── SUPER ADMIN / ADMIN ── */
  if (user?.role === 'Super Admin' || user?.role === 'Admin') {
    return (
      <div className="p-5 md:p-8 w-full min-h-screen bg-[#f3f5f9]">

        <PageHeader actions={<HeaderControls />} />

        {timePeriod === 'custom' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                value={customDateRange.startDate}
                onChange={e => setCustomDateRange(p => ({ ...p, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-[#1E3F63] focus:ring-1 focus:ring-[#1E3F63]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">End Date</label>
              <input
                type="date"
                value={customDateRange.endDate}
                onChange={e => setCustomDateRange(p => ({ ...p, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-[#1E3F63] focus:ring-1 focus:ring-[#1E3F63]"
              />
            </div>
          </div>
        )}

        {/* ── KPI hero row ── */}
        {visibleSections.kpi && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
            <KpiCard label="Total Revenue"     value={fmt(totalRevenue)}                 sub={`${totalJobsAcc} jobs total`} accent="#1E3F63" icon={Icons.wallet} />
            <KpiCard label="Collected Revenue" value={fmt(collectedRev)}                 sub={`${paidJobsCount} jobs paid`} accent="#15803d" icon={Icons.check} />
            <KpiCard label="Outstanding"       value={fmt(outstandingRev + overdueRev)}  sub="Unpaid & overdue"             accent="#b45309" icon={Icons.clock} />
          </div>
        )}

        {/* ── Operational status row ── */}
        {visibleSections.operations && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <OpsCard label="Total Customers" value={stats.totalCustomers} accent="#0f766e" icon={Icons.users} />
            <OpsCard label="Total Jobs"      value={stats.totalJobs}      accent="#1E3F63" icon={Icons.briefcase} />
            <OpsCard label="Open Jobs"       value={stats.openJobs}       accent="#b45309" icon={Icons.folder} />
          </div>
        )}

        {/* ── Invoice Overview (bar graph) ── */}
        {visibleSections.invoices && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Invoice Overview</h2>
            {timePeriod !== 'all' && (
              <span className="text-xs font-medium text-gray-400">{periods.find(p => p.key === timePeriod)?.label}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-6">
            {stats.fullyPaidBills} paid · {stats.partiallyPaidBills} partially paid · {stats.strictUnpaidBills} unpaid · {overdueCount} overdue
          </p>

          {(() => {
            const bars = [
              { label: 'Total Invoices', value: stats.totalBills,          color: '#1E3F63' },
              { label: 'Paid',           value: stats.fullyPaidBills,      color: '#15803d' },
              { label: 'Partially Paid', value: stats.partiallyPaidBills,  color: '#0e7490' },
              { label: 'Unpaid',         value: stats.strictUnpaidBills,   color: '#b45309' },
              { label: 'Overdue',        value: overdueCount,              color: '#b91c1c' },
            ];
            const max = Math.max(...bars.map(b => b.value), 1);
            return (
              <>
                <div className="flex items-end gap-6 h-52 px-2">
                  {bars.map(b => (
                    <div key={b.label} className="flex-1 h-full flex flex-col items-center justify-end">
                      <span className="text-lg font-bold text-gray-800 mb-2">{b.value}</span>
                      <div
                        className="w-full max-w-[84px] rounded-t-lg transition-[height] duration-700 ease-out"
                        style={{
                          height: `${Math.max((b.value / max) * 80, b.value > 0 ? 4 : 1)}%`,
                          backgroundColor: b.color,
                        }}
                        title={`${b.label}: ${b.value}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-6 border-t border-gray-100 mt-3 pt-3 px-2">
                  {bars.map(b => (
                    <div key={b.label} className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 text-center">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                      {b.label}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
        )}

        {/* ── Cash Flow Tracking ── */}
        {visibleSections.cashflow && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5">Cash Flow Tracking</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <CashCard label="Total Assigned Petty Cash" value={fmt(stats.totalAssignedPettyCash)} sub="Issued to staff"            accent="#1E3F63" icon={Icons.send} />
            <CashCard label="Total Settled"             value={fmt(stats.totalSettled)}           sub="Spent & accounted for"     accent="#15803d" icon={Icons.checkCircle} />
            <CashCard label="Balance Returned"          value={fmt(stats.balanceReturned)}        sub="Unspent cash returned"     accent="#0f766e" icon={Icons.coins} />
            <CashCard label="Overdue Collected"         value={fmt(stats.overdueCollected)}       sub="Overspend recovered"      accent="#b91c1c" icon={Icons.alert} />
          </div>
        </div>
        )}

      </div>
    );
  }

  /* ── WAFF CLERK ── */
  if (user?.role === 'Waff Clerk') {
    return (
      <div className="p-5 md:p-8 w-full min-h-screen bg-[#f3f5f9]">
        <PageHeader />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard label="Open Jobs"      value={stats.openJobs}          sub="Pending"          accent="#b45309" icon={Icons.folder} />
          <KpiCard label="Completed Jobs" value={stats.closedJobs}        sub="Finished"         accent="#15803d" icon={Icons.checkCircle} />
          <KpiCard label="Paid Invoices"  value={stats.paidBills}         sub="Total paid"       accent="#1E3F63" icon={Icons.check} />
          <KpiCard label="Petty Cash"     value={fmt(stats.userPettyCash)} sub="Assigned to you" accent="#0f766e" icon={Icons.coins} />
        </div>
      </div>
    );
  }

  /* ── REGULAR USER ── */
  return (
    <div className="p-5 md:p-8 w-full min-h-screen bg-[#f3f5f9]">
      <PageHeader />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard label="Total Jobs"      value={stats.totalJobs}            sub="Assigned to you"  accent="#1E3F63" icon={Icons.briefcase} />
        <KpiCard label="Open Jobs"       value={stats.openJobs}             sub="Pending"          accent="#b45309" icon={Icons.folder} />
        <KpiCard label="Completed Jobs"  value={stats.closedJobs}           sub="Finished"         accent="#15803d" icon={Icons.checkCircle} />
        <KpiCard label="Petty Cash"      value={fmt(stats.pettyCashBalance)} sub="Current balance" accent="#0f766e" icon={Icons.coins} />
      </div>
    </div>
  );
}

export default Dashboard;
