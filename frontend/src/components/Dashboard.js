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

// Small labelled stat used in the revenue legend
function LegendStat({ color, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-base font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
}

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
    totalRevenue: 0,
    pendingRevenue: 0,
    pettyCashBalance: 0,
    userPettyCash: 0,
    mainAccountBalance: 0,
    pettyCashIssued: 0,
    uncollectedCash: 0,
    conversionRate: 0
  });
  const [accountingData, setAccountingData] = useState(null);

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
        totalRevenue,
        pendingRevenue,
        pettyCashBalance: pettyCashData.balance,
        userPettyCash:    pettyCashData.balance,
        mainAccountBalance: 0,
        pettyCashIssued:  pettyCashIssuedFiltered,
        uncollectedCash:  pendingRevenue,
        conversionRate
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [user, timePeriod, filterByDate]);

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

  const fmtShort = (amount) => {
    const n = parseFloat(amount || 0);
    if (n >= 1000000) return 'LKR ' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return 'LKR ' + (n / 1000).toFixed(1) + 'K';
    return 'LKR ' + n.toFixed(2);
  };

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
  const netProfit       = useAccounting ? accountingData.summary.totalProfit         : stats.totalRevenue;
  const profitMargin    = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const totalJobsAcc    = useAccounting ? accountingData.summary.totalJobs           : stats.totalJobs;
  const paidJobsCount   = useAccounting ? accountingData.summary.paidJobsCount       : stats.paidBills;
  const unpaidJobsCount = useAccounting ? accountingData.summary.unpaidJobsCount     : stats.unpaidBills;
  const overdueCount    = useAccounting ? accountingData.summary.overdueJobsCount    : 0;
  // Petty cash issued: use filtered stats value (calculated from jobs in period)
  const pettyCashIssued = useAccounting ? accountingData.summary.totalPettyCashIssued : stats.pettyCashIssued;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Shared page header
  const PageHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1E3F63] tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.fullName} — Super Shine Cargo Service</p>
      </div>
      <span className="text-xs font-medium text-gray-400">{today}</span>
    </div>
  );

  /* ── SUPER ADMIN / ADMIN ── */
  if (user?.role === 'Super Admin' || user?.role === 'Admin') {
    const pct = (part) => (totalRevenue > 0 ? Math.min((part / totalRevenue) * 100, 100) : 0);
    return (
      <div className="p-5 md:p-8 w-full min-h-screen bg-[#f3f5f9]">

        <PageHeader />

        {/* ── Period Filter ── */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Period</span>
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => handlePeriodChange(p.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                timePeriod === p.key
                  ? 'bg-[#1E3F63] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1E3F63] hover:text-[#1E3F63]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          <KpiCard label="Total Revenue"     value={fmtShort(totalRevenue)}                 sub={`${totalJobsAcc} jobs total`} accent="#1E3F63" icon={Icons.wallet} />
          <KpiCard label="Collected Revenue" value={fmtShort(collectedRev)}                 sub={`${paidJobsCount} jobs paid`} accent="#15803d" icon={Icons.check} />
          <KpiCard label="Outstanding"       value={fmtShort(outstandingRev + overdueRev)}  sub="Unpaid & overdue"             accent="#b45309" icon={Icons.clock} />
          <KpiCard label="Net Profit"        value={fmtShort(netProfit)}                    sub={`${profitMargin}% margin`}    accent="#0f766e" icon={Icons.trending} />
        </div>

        {/* ── Operational status row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          <OpsCard label="Total Jobs" value={stats.totalJobs}     accent="#1E3F63" icon={Icons.briefcase} />
          <OpsCard label="Open Jobs"  value={stats.openJobs}      accent="#b45309" icon={Icons.folder} />
          <OpsCard label="In Transit" value={stats.inTransitJobs} accent="#2f5e8f" icon={Icons.truck} />
          <OpsCard label="Completed"  value={stats.closedJobs}    accent="#15803d" icon={Icons.checkCircle} />
        </div>

        {/* ── Revenue breakdown + Invoice status ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

          {/* Revenue breakdown */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Revenue Breakdown</h2>
              {timePeriod !== 'all' && (
                <span className="text-xs font-medium text-gray-400">{periods.find(p => p.key === timePeriod)?.label}</span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-5">
              <span className="text-3xl font-bold text-[#1E3F63]">{fmtShort(totalRevenue)}</span>
              <span className="text-sm text-gray-400">total billed</span>
            </div>

            {/* Single meaningful stacked bar */}
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-gray-100 mb-5">
              <div style={{ width: `${pct(collectedRev)}%`,   backgroundColor: '#15803d' }} title="Collected" />
              <div style={{ width: `${pct(outstandingRev)}%`, backgroundColor: '#d4a017' }} title="Outstanding" />
              <div style={{ width: `${pct(overdueRev)}%`,     backgroundColor: '#b91c1c' }} title="Overdue" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <LegendStat color="#15803d" label="Collected"   value={fmtShort(collectedRev)} />
              <LegendStat color="#d4a017" label="Outstanding" value={fmtShort(outstandingRev)} />
              <LegendStat color="#b91c1c" label="Overdue"     value={fmtShort(overdueRev)} />
            </div>

            <div className="border-t border-gray-100 mt-5 pt-4 text-xs text-gray-400">
              Revenue source: billing data · approx. {fmtShort(totalJobsAcc > 0 ? totalRevenue / totalJobsAcc : 0)} avg / job
              {' · '}{unpaidJobsCount} unpaid · {overdueCount} overdue
            </div>
          </div>

          {/* Invoice status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5">Invoice Status</h2>
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#eef0f4" strokeWidth="3.5" />
                  {stats.totalBills > 0 && (
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#15803d" strokeWidth="3.5"
                      strokeDasharray={`${(stats.paidBills / stats.totalBills) * 100} ${100 - (stats.paidBills / stats.totalBills) * 100}`}
                      strokeDashoffset="25" strokeLinecap="round" />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-800">{stats.totalBills}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Invoices</span>
                </div>
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-[#15803d]" />Paid</span>
                  <span className="font-bold text-gray-800">{stats.paidBills}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-[#b91c1c]" />Unpaid</span>
                  <span className="font-bold text-gray-800">{stats.unpaidBills}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 mt-5 pt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Customers</p>
                <p className="text-2xl font-bold text-[#1E3F63] mt-1">{stats.totalCustomers}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Conversion</p>
                <p className="text-2xl font-bold text-[#15803d] mt-1">{stats.conversionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Cash Flow Tracking ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-5">Cash Flow Tracking</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <CashCard label="Main Account Balance" value={fmt(stats.mainAccountBalance)} sub="Total funds in main account" accent="#1E3F63" icon={Icons.bank} />
            <CashCard label="Petty Cash Balance"   value={fmt(stats.pettyCashBalance)}   sub="Available petty cash"        accent="#0f766e" icon={Icons.coins} />
            <CashCard
              label={`Petty Cash Issued ${timePeriod !== 'all' ? '(Period)' : '(To Date)'}`}
              value={fmt(pettyCashIssued)}
              sub={timePeriod !== 'all' ? 'Issued in selected period' : 'Total issued to date'}
              accent="#6d28d9" icon={Icons.send} />
            <CashCard
              label={`Uncollected Cash Due ${timePeriod !== 'all' ? '(Period)' : ''}`}
              value={fmtShort(stats.uncollectedCash)}
              sub="Sum of unpaid invoices"
              accent="#b91c1c" icon={Icons.alert} />
          </div>
        </div>

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
