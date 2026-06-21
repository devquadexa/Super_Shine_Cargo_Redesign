import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const REPORT_CARDS = [
  {
    id: 'petty-cash-report',
    path: '/reports/petty-cash',
    category: 'Financial',
    title: 'Petty Cash Report',
    description: 'Job-wise petty cash assignment breakdown for any selected date. Includes assigned amounts, settlements, outstanding balances and PDF / Excel export.',
    available: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ),
    color: 'blue',
    tags: ['Daily', 'Export', 'Job-wise'],
  },
  {
    id: 'pending-payments-report',
    path: '/reports/pending-payments',
    category: 'Financial',
    title: 'Pending Payments Report',
    description: 'View all pending and overdue payment invoices with date range filtering. Track unpaid and partially paid invoices with PDF / Excel export.',
    available: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    ),
    color: 'red',
    tags: ['Invoices', 'Export', 'Overdue'],
  },
  {
    id: 'other-expenses-report',
    path: '/reports/other-expenses',
    category: 'Financial',
    title: 'Other Expenses Report',
    description: 'Track office expenses like food, utilities, WiFi and phone cards. Filter by date range and category with PDF / Excel export.',
    available: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    ),
    color: 'amber',
    tags: ['Expenses', 'Export', 'Category-wise'],
  },
  {
    id: 'cash-summary-report',
    path: '/reports/cash-summary',
    category: 'Financial',
    title: 'Cash Summary Report',
    description: 'Comprehensive cash flow overview showing withdrawals and deposits, petty cash issued amounts and other expenses with date range filtering.',
    available: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    ),
    color: 'green',
    tags: ['Cash Flow', 'Export', 'Summary'],
  },
  {
    id: 'invoice-report',
    path: null,
    category: 'Financial',
    title: 'Invoice Report',
    description: 'Invoice summary, aging analysis and payment status overview across all customers and jobs.',
    available: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    ),
    color: 'green',
    tags: ['Aging', 'Export', 'Customer-wise'],
  },
  {
    id: 'cheque-report',
    path: null,
    category: 'Financial',
    title: 'Cheque Report',
    description: 'Cheque and bank transfer tracking with status breakdown — pending, cleared and bounced payments.',
    available: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="13" rx="2"></rect>
        <path d="M3 10h18"></path>
        <path d="M8 6V4"></path>
        <path d="M16 6V4"></path>
      </svg>
    ),
    color: 'amber',
    tags: ['Payments', 'Export', 'Bank-wise'],
  },
  {
    id: 'job-report',
    path: null,
    category: 'Operations',
    title: 'Job Report',
    description: 'Job status and performance overview — open, in-progress, completed and overdue jobs with shipment category breakdown.',
    available: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    ),
    color: 'purple',
    tags: ['Status', 'Export', 'Category-wise'],
  },
  {
    id: 'customer-report',
    path: null,
    category: 'Operations',
    title: 'Customer Report',
    description: 'Customer-wise billing summary, outstanding balances and payment history across all jobs.',
    available: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
    color: 'teal',
    tags: ['Billing', 'Export', 'Customer-wise'],
  },
  {
    id: 'accounting-report',
    path: null,
    category: 'Operations',
    title: 'Accounting Summary',
    description: 'Profit and loss overview, revenue vs cost analysis and financial performance metrics by period.',
    available: false,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
        <polyline points="3 20 21 20"></polyline>
      </svg>
    ),
    color: 'red',
    tags: ['P&L', 'Export', 'Period-wise'],
  },
  {
    id: 'transporters-report',
    path: '/reports/transporters',
    category: 'Financial',
    title: 'Transporters Report',
    description: 'Transporter-wise payment details, job assignments, paid amounts, balances and outstanding payments.',
    available: true,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 18 16 18 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
    ),
    color: 'orange',
    tags: ['Payments', 'Export', 'Transporter-wise'],
  },
];

const CATEGORIES = ['Financial', 'Operations'];

function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const canAccess = user?.role === 'Admin' || user?.role === 'Super Admin';

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">Only Super Admin and Admin users can access the Reports section.</p>
        </div>
      </div>
    );
  }

  const handleCardClick = (card) => {
    if (card.available && card.path) {
      navigate(card.path);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Page header */}
      <div className="mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">
              Select a report to view detailed data, apply filters and export results.
            </p>
          </div>
          <div className="flex gap-6">
            <div className="bg-white px-6 py-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-4xl font-bold text-blue-600 text-center">{REPORT_CARDS.filter(r => r.available).length}</div>
              <div className="text-sm font-medium text-gray-600 text-center mt-2">Available</div>
            </div>
            <div className="bg-white px-6 py-4 rounded-lg shadow-sm border border-gray-100">
              <div className="text-4xl font-bold text-gray-900 text-center">{REPORT_CARDS.length}</div>
              <div className="text-sm font-medium text-gray-600 text-center mt-2">Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category sections */}
      {CATEGORIES.map(category => {
        const cards = REPORT_CARDS.filter(r => r.category === category);
        return (
          <section key={category} className="mb-16">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">{category} Reports</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-blue-600 to-blue-400 mt-3 rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cards.map(card => (
                <div
                  key={card.id}
                  className={`relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group ${
                    !card.available ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1'
                  } ${
                    card.color === 'blue' ? 'border-t-4 border-blue-500' :
                    card.color === 'red' ? 'border-t-4 border-red-500' :
                    card.color === 'amber' ? 'border-t-4 border-amber-500' :
                    card.color === 'green' ? 'border-t-4 border-green-500' :
                    card.color === 'purple' ? 'border-t-4 border-purple-500' :
                    card.color === 'teal' ? 'border-t-4 border-teal-500' :
                    'border-t-4 border-orange-500'
                  }`}
                  onClick={() => handleCardClick(card)}
                  role={card.available ? 'button' : undefined}
                  tabIndex={card.available ? 0 : undefined}
                  onKeyDown={card.available ? (e) => e.key === 'Enter' && handleCardClick(card) : undefined}
                  aria-label={card.available ? `Open ${card.title}` : `${card.title} — coming soon`}
                >
                  {/* Availability badge */}
                  {card.available ? (
                    <span className="absolute top-4 right-4 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Available</span>
                  ) : (
                    <span className="absolute top-4 right-4 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">Coming Soon</span>
                  )}

                  {/* Icon */}
                  <div className={`p-4 flex items-center justify-center ${
                    card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                    card.color === 'red' ? 'bg-red-50 text-red-600' :
                    card.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                    card.color === 'green' ? 'bg-green-50 text-green-600' :
                    card.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                    card.color === 'teal' ? 'bg-teal-50 text-teal-600' :
                    'bg-orange-50 text-orange-600'
                  }`}>
                    {card.icon}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{card.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {card.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">{tag}</span>
                      ))}
                    </div>

                    {/* Arrow — only for available */}
                    {card.available && (
                      <div className="flex items-center text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        <span>View Report</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 group-hover:translate-x-1 transition-transform">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default Reports;
