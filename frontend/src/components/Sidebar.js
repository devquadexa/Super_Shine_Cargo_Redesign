import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState({
    dashboard: true,
    operations: true,
    financial: true,
    reports: true,
    admin: true
  });

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix);

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const canAccessReports = user?.role === 'Admin' || user?.role === 'Super Admin';
  const isSuperAdmin = user?.role === 'Super Admin';
  const canAccessTransporters = ['Admin', 'Super Admin', 'Manager', 'Office Executive'].includes(user?.role);
  const canAccessBilling = ['Admin', 'Super Admin', 'Manager'].includes(user?.role);
  const canAccessPettyCash = ['Admin', 'Super Admin', 'Manager', 'Waff Clerk'].includes(user?.role);
  const canAccessInvoiceReviews = user?.role === 'Waff Clerk';
  const canAccessOtherExpenses = ['Admin', 'Super Admin', 'Manager'].includes(user?.role);
  const canAccessAccounting = isSuperAdmin;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30" onClick={onClose}></div>}
      
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-blue-50 to-white border-r-2 border-gray-200 overflow-y-auto z-40 transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} pt-20`}>
        {/* Logo Section */}
        <div className="px-6 py-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Logo" className="h-10 w-10" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Super Shine</h2>
              <p className="text-xs text-gray-600 leading-tight">Cargo Solutions</p>
            </div>
          </div>
          <button 
            className="lg:hidden w-full p-2 rounded-lg hover:bg-gray-200 transition text-gray-600"
            onClick={onClose}
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 mx-auto">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 py-6 space-y-2">
          
          {/* DASHBOARD & OVERVIEW */}
          <div className="space-y-1">
            <button 
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition font-semibold text-sm ${expandedGroups.dashboard ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => toggleGroup('dashboard')}
            >
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Dashboard
              </span>
              <svg className={`w-4 h-4 transition-transform ${expandedGroups.dashboard ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {expandedGroups.dashboard && (
              <div className="space-y-1 pl-4">
                <Link 
                  to="/" 
                  className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={handleLinkClick}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    Dashboard
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* CORE OPERATIONS */}
          <div className="space-y-1">
            <button 
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition font-semibold text-sm ${expandedGroups.operations ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => toggleGroup('operations')}
            >
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
                Operations
              </span>
              <svg className={`w-4 h-4 transition-transform ${expandedGroups.operations ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {expandedGroups.operations && (
              <div className="space-y-1 pl-4">
                <Link 
                  to="/customers" 
                  className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/customers') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={handleLinkClick}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    Customers
                  </div>
                </Link>

                {canAccessTransporters && (
                  <Link 
                    to="/transporters" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/transporters') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Transporters
                    </div>
                  </Link>
                )}

                <Link 
                  to="/jobs" 
                  className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/jobs') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={handleLinkClick}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-current"></div>
                    Jobs
                  </div>
                </Link>

                {canAccessPettyCash && (
                  <Link 
                    to="/petty-cash" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/petty-cash') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Petty Cash
                    </div>
                  </Link>
                )}

                {canAccessInvoiceReviews && (
                  <Link 
                    to="/invoice-reviews" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/invoice-reviews') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Invoice Reviews
                    </div>
                  </Link>
                )}

                {canAccessBilling && (
                  <Link 
                    to="/billing" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/billing') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Invoicing
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* FINANCIAL MANAGEMENT */}
          {(canAccessOtherExpenses || canAccessAccounting) && (
            <div className="space-y-1">
              <button 
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition font-semibold text-sm ${expandedGroups.financial ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => toggleGroup('financial')}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  Financial
                </span>
                <svg className={`w-4 h-4 transition-transform ${expandedGroups.financial ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {expandedGroups.financial && (
                <div className="space-y-1 pl-4">
                  {canAccessOtherExpenses && (
                    <Link 
                      to="/other-expenses" 
                      className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/other-expenses') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                      onClick={handleLinkClick}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        Other Expenses
                      </div>
                    </Link>
                  )}

                  {canAccessAccounting && (
                    <Link 
                      to="/accounting" 
                      className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/accounting') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                      onClick={handleLinkClick}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        Accounting
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* REPORTS & ANALYTICS */}
          {canAccessReports && (
            <div className="space-y-1">
              <button 
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition font-semibold text-sm ${expandedGroups.reports ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => toggleGroup('reports')}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                  Reports
                </span>
                <svg className={`w-4 h-4 transition-transform ${expandedGroups.reports ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {expandedGroups.reports && (
                <div className="space-y-1 pl-4">
                  <Link 
                    to="/reports" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/reports') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      All Reports
                    </div>
                  </Link>

                  <Link 
                    to="/reports/petty-cash" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/reports/petty-cash') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Petty Cash Report
                    </div>
                  </Link>

                  <Link 
                    to="/reports/pending-payments" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/reports/pending-payments') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Pending Payments
                    </div>
                  </Link>

                  <Link 
                    to="/reports/other-expenses" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/reports/other-expenses') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Other Expenses Report
                    </div>
                  </Link>

                  <Link 
                    to="/reports/transporters" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/reports/transporters') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Transporters Report
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* SYSTEM ADMINISTRATION */}
          {isSuperAdmin && (
            <div className="space-y-1">
              <button 
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition font-semibold text-sm ${expandedGroups.admin ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => toggleGroup('admin')}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2m11-5.2h-6m-6 0H1"></path>
                  </svg>
                  Administration
                </span>
                <svg className={`w-4 h-4 transition-transform ${expandedGroups.admin ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {expandedGroups.admin && (
                <div className="space-y-1 pl-4">
                  <Link 
                    to="/users" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/users') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Users
                    </div>
                  </Link>

                  <Link 
                    to="/password-reset-requests" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/password-reset-requests') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Password Resets
                    </div>
                  </Link>

                  <Link 
                    to="/settings" 
                    className={`block px-4 py-2 rounded-lg text-sm transition ${isActive('/settings') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={handleLinkClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                      Settings
                    </div>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
