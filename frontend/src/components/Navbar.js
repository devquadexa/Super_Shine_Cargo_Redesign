import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePassword from './ChangePassword';
import NotificationBell from './NotificationBell';

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  const toggleProfileDropdown = () => setIsProfileDropdownOpen(!isProfileDropdownOpen);
  const closeProfileDropdown  = () => setIsProfileDropdownOpen(false);

  const handleChangePasswordClick = () => {
    closeProfileDropdown();
    setShowChangePasswordModal(true);
  };

  const handleLogout = () => {
    closeProfileDropdown();
    logout();
  };

  const toggleSidebar = () => {
    setIsSidebarHidden(!isSidebarHidden);
    window.dispatchEvent(new CustomEvent('toggleSidebarVisibility', { detail: { hidden: !isSidebarHidden } }));
  };

  const getUserInitials = () => {
    if (!user?.fullName) return 'U';
    const names = user.fullName.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const canAccessSettings = user?.role === 'Admin' || user?.role === 'Super Admin';

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b-2 border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Left Section - Brand block (same width as the 16rem sidebar) */}
          <div className="flex items-center gap-3 lg:w-64 lg:-ml-8 lg:pl-6 lg:pr-4 lg:border-r lg:border-gray-200 self-stretch">
            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
              onClick={onMenuClick}
              aria-label="Toggle menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Logo + Brand → Home link */}
            <Link to="/" className="flex items-center gap-2.5 min-w-0" title="Go to Dashboard">
              <img
                src={`${process.env.PUBLIC_URL}/logo.png`}
                alt="Super Shine Cargo"
                className="h-8 w-8 object-contain shrink-0"
              />
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-gray-900 leading-tight whitespace-nowrap">Super Shine Cargo</h1>
                <p className="text-xs text-gray-600 leading-tight whitespace-nowrap">Cargo Management System</p>
              </div>
            </Link>
          </div>

          {/* Right Section - Actions & Profile */}
          <div className="flex items-center gap-6">
            {/* Sidebar hide/show toggle (desktop) */}
            {user && (
              <button
                className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition text-gray-600 hover:text-blue-600"
                onClick={toggleSidebar}
                title="Hide / show sidebar"
                aria-label="Hide or show sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </button>
            )}

            {/* Welcome Message - Desktop Only */}
            {user && (
              <div className="hidden md:flex flex-col items-end">
                <p className="text-sm text-gray-900 font-semibold">Welcome, {user.fullName?.split(' ')[0]}</p>
                <p className="text-xs text-gray-600">{user.role}</p>
              </div>
            )}

            {/* Refresh Button */}
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600 hover:text-blue-600"
              onClick={() => window.location.reload()}
              title="Refresh page"
              aria-label="Refresh page"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
              </svg>
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition"
                onClick={toggleProfileDropdown}
                aria-label="User menu"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">
                  {getUserInitials()}
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <>
                  {/* Overlay */}
                  <div 
                    className="fixed inset-0 z-30"
                    onClick={closeProfileDropdown}
                  ></div>

                  {/* Dropdown Panel */}
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-40 animate-in fade-in slide-in-from-top-2">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 text-lg font-bold shadow-md">
                          {getUserInitials()}
                        </div>
                        <div>
                          <p className="font-semibold">{user?.fullName}</p>
                          <p className="text-sm text-blue-100">{user?.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200"></div>

                    {/* Menu Items */}
                    <div className="py-2">
                      {canAccessSettings && (
                        <Link 
                          to="/settings" 
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 hover:text-blue-600"
                          onClick={closeProfileDropdown}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                          </svg>
                          <span className="text-sm font-medium">Settings</span>
                        </Link>
                      )}

                      <button 
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-gray-700 hover:text-blue-600 text-left"
                        onClick={handleChangePasswordClick}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        <span className="text-sm font-medium">Change Password</span>
                      </button>

                      {/* Divider */}
                      <div className="h-px bg-gray-200 my-2"></div>

                      <button 
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition text-red-600 hover:text-red-700 text-left"
                        onClick={handleLogout}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Change Password Modal */}
      <ChangePassword 
        isOpen={showChangePasswordModal} 
        onClose={() => setShowChangePasswordModal(false)} 
      />
    </>
  );
}

export default Navbar;
