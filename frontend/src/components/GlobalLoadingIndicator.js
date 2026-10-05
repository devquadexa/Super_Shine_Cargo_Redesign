import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeToLoading } from '../api/client';

/**
 * GlobalLoadingIndicator
 * Provides a top progress bar and a floating status badge
 * for all API operations and CRUD actions across the application.
 * Automatically adapts messages for requests, saves, deletions, and approvals.
 * Suppresses floating messages during login.
 */
const GlobalLoadingIndicator = () => {
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    isMutating: false,
    count: 0,
    actionType: 'save',
    loadingText: 'Saving changes...',
    successText: 'Saved successfully',
  });
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastInfo, setToastInfo] = useState({
    actionType: 'save',
    successText: 'Saved successfully',
  });

  let location;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    location = useLocation();
  } catch (e) {
    location = { pathname: typeof window !== 'undefined' ? window.location.pathname : '' };
  }

  const isLoginPage = location?.pathname === '/login' || (typeof window !== 'undefined' && window.location.pathname === '/login');

  useEffect(() => {
    let wasMutating = false;
    let timer = null;

    const unsubscribe = subscribeToLoading((state) => {
      setLoadingState(state);

      if (state.isMutating) {
        wasMutating = true;
        setShowSuccessToast(false);
        if (timer) clearTimeout(timer);
      } else if (wasMutating && !state.isLoading) {
        // Just finished a mutation
        wasMutating = false;
        if (state.successText) {
          setToastInfo({
            actionType: state.actionType,
            successText: state.successText,
          });
          setShowSuccessToast(true);
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            setShowSuccessToast(false);
          }, 1800);
        }
      }
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const { isLoading, isMutating, loadingText, actionType } = loadingState;

  if (isLoginPage) {
    // On the login page, never show the floating action badge
    return isLoading ? (
      <div className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[3px] bg-transparent overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 animate-pulse w-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
      </div>
    ) : null;
  }

  if (!isLoading && !showSuccessToast) return null;

  return (
    <>
      {/* 1. Top Glowing Progress Bar */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[3px] bg-transparent overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 animate-pulse w-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
        </div>
      )}

      {/* 2. Floating Action Badge (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-[999999] pointer-events-none transition-all duration-300 ease-out transform translate-y-0 opacity-100">
        {isMutating && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gray-900/95 backdrop-blur-md text-white text-xs font-semibold shadow-2xl border border-gray-700/70 animate-in fade-in slide-in-from-bottom-2">
            <svg
              className={`animate-spin w-4 h-4 ${
                actionType === 'delete'
                  ? 'text-rose-400'
                  : actionType === 'request'
                  ? 'text-indigo-400'
                  : actionType === 'approve'
                  ? 'text-emerald-400'
                  : 'text-blue-400'
              }`}
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>{loadingText || 'Saving changes...'}</span>
          </div>
        )}

        {!isMutating && showSuccessToast && (
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md text-xs font-semibold shadow-2xl border animate-in fade-in slide-in-from-bottom-2 ${
              toastInfo.actionType === 'delete'
                ? 'bg-rose-950/95 text-rose-200 border-rose-600/60 shadow-rose-950/40'
                : toastInfo.actionType === 'request'
                ? 'bg-indigo-950/95 text-indigo-200 border-indigo-600/60 shadow-indigo-950/40'
                : 'bg-emerald-950/95 text-emerald-200 border-emerald-600/60 shadow-emerald-950/40'
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                toastInfo.actionType === 'delete'
                  ? 'text-rose-400'
                  : toastInfo.actionType === 'request'
                  ? 'text-indigo-300'
                  : 'text-emerald-400'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{toastInfo.successText || 'Saved successfully'}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default GlobalLoadingIndicator;
