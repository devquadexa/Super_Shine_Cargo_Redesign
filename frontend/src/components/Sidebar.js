import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ──────────────────────────────────────────────────────────────
   Group / section icons (inherit currentColor)
   ────────────────────────────────────────────────────────────── */
const Icon = {
  container: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <rect x="2" y="6" width="20" height="12" rx="1" />
      <line x1="6" y1="6" x2="6" y2="18" /><line x1="10" y1="6" x2="10" y2="18" />
      <line x1="14" y1="6" x2="14" y2="18" /><line x1="18" y1="6" x2="18" y2="18" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  operations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  financial: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 3h13l3 3v15a0 0 0 0 1 0 0H4a0 0 0 0 1 0 0V3z" />
      <line x1="8" y1="9" x2="14" y2="9" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="18" cy="6" r="2.3" /><path d="M18 1.5v1.2M18 9.3v1.2M21.2 6h-1.2M15.2 6H14" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  // Accordion: only one section open at a time. Collapsed by default.
  const [openGroup, setOpenGroup] = useState(null);

  const isActive = (path) => location.pathname === path;

  const toggleGroup = (group) =>
    setOpenGroup((prev) => (prev === group ? null : group));

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  /* ── Role-based access ── */
  const isSuperAdmin = user?.role === 'Super Admin';
  const canAccessReports = user?.role === 'Admin' || isSuperAdmin;
  const canAccessTransporters = ['Admin', 'Super Admin', 'Manager', 'Office Executive'].includes(user?.role);
  const canAccessBilling = ['Admin', 'Super Admin', 'Manager'].includes(user?.role);
  const canAccessPettyCash = ['Admin', 'Super Admin', 'Manager', 'Waff Clerk'].includes(user?.role);
  const canAccessInvoiceReviews = user?.role === 'Waff Clerk';
  const canAccessOtherExpenses = ['Admin', 'Super Admin', 'Manager'].includes(user?.role);
  const canAccessAccounting = isSuperAdmin;

  /* ── Reusable presentational pieces ── */
  const NavItem = ({ to, label }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        onClick={handleLinkClick}
        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-[14px] transition border ${
          active
            ? 'bg-white/[0.07] border-sky-400/60 text-white font-medium'
            : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-sky-400' : 'bg-slate-400/70'}`} />
        <span className="leading-snug">{label}</span>
      </Link>
    );
  };

  const GroupHeader = ({ id, label, icon }) => (
    <button
      onClick={() => toggleGroup(id)}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-white/90 hover:text-white hover:bg-white/5 transition"
    >
      <span className="flex items-center gap-3 font-semibold text-[15px]">
        <span className="text-slate-200">{icon}</span>
        {label}
      </span>
      <span className={`text-slate-400 transition-transform duration-300 ${openGroup === id ? 'rotate-180' : ''}`}>
        {Icon.chevron}
      </span>
    </button>
  );

  // Group with header + smoothly animated collapsible panel (accordion)
  const NavGroup = ({ id, label, icon, children }) => {
    const open = openGroup === id;
    return (
      <div className="space-y-1">
        <GroupHeader id={id} label={label} icon={icon} />
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-1 pl-3 pt-1">{children}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30" onClick={onClose}></div>}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-[#1a3553] to-[#0f2338] border-r border-[#21405f] overflow-y-auto z-40 transform transition-transform duration-300 lg:translate-x-0 pt-16 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile-only close button (brand header removed) */}
        <div className="lg:hidden flex justify-end px-3 pt-3">
          <button
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 transition"
            onClick={onClose}
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 py-5 space-y-5">

          {/* DASHBOARD (standalone link) */}
          <Link
            to="/"
            onClick={handleLinkClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-[15px] transition border ${
              isActive('/')
                ? 'bg-white/[0.07] border-sky-400/60 text-white'
                : 'border-transparent text-white/90 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-slate-200">{Icon.dashboard}</span>
            Dashboard
          </Link>

          {/* OPERATIONS */}
          <NavGroup id="operations" label="Operations" icon={Icon.operations}>
            <NavItem to="/customers" label="Customers" />
            {canAccessTransporters && <NavItem to="/transporters" label="Transporters" />}
            <NavItem to="/jobs" label="Jobs" />
            {canAccessPettyCash && <NavItem to="/petty-cash" label="Petty Cash" />}
            {canAccessInvoiceReviews && <NavItem to="/invoice-reviews" label="Invoice Reviews" />}
            {canAccessBilling && <NavItem to="/billing" label="Invoicing" />}
          </NavGroup>

          {/* FINANCIAL */}
          {(canAccessOtherExpenses || canAccessAccounting) && (
            <NavGroup id="financial" label="Financial" icon={Icon.financial}>
              {canAccessOtherExpenses && <NavItem to="/other-expenses" label="Other Expenses" />}
              {canAccessAccounting && <NavItem to="/accounting" label="Accounting" />}
            </NavGroup>
          )}

          {/* REPORTS */}
          {canAccessReports && (
            <NavGroup id="reports" label="Reports" icon={Icon.reports}>
              <NavItem to="/reports" label="All Reports" />
              <NavItem to="/reports/petty-cash" label="Petty Cash Report" />
              <NavItem to="/reports/pending-payments" label="Pending Payments" />
              <NavItem to="/reports/other-expenses" label="Other Expenses Report" />
              <NavItem to="/reports/transporters" label="Transporters Report" />
              <NavItem to="/reports/invoices" label="Invoice Report" />
            </NavGroup>
          )}

          {/* ADMINISTRATION */}
          {isSuperAdmin && (
            <NavGroup id="admin" label="Administration" icon={Icon.admin}>
              <NavItem to="/users" label="Users" />
              <NavItem to="/password-reset-requests" label="Password Resets" />
              <NavItem to="/settings" label="Settings" />
            </NavGroup>
          )}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
