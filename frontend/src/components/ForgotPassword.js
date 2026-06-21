import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { passwordResetService } from '../api/services/passwordResetService';

function ForgotPassword() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setMessage('Please enter your username');
      setMessageType('error');
      return;
    }
    
    try {
      setLoading(true);
      const result = await passwordResetService.requestPasswordReset(username);
      
      setMessage(result.message);
      setMessageType('success');
      setSubmitted(true);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error requesting password reset');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Decorative Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="max-w-md text-center relative z-10">
          <div className="mb-8">
            <svg className="w-20 h-20 mx-auto text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">Need Help?</h1>
          <p className="text-xl text-blue-100 mb-12 leading-relaxed">
            Don't worry, we'll help you get back into your account quickly and securely
          </p>
          
          <div className="space-y-6 mt-16">
            <div className="flex items-start bg-white bg-opacity-10 p-4 rounded-lg backdrop-blur-sm border border-white border-opacity-20 hover:bg-opacity-20 transition">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-200 mr-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-blue-50 text-sm font-medium">Submit a reset request to your admin</p>
            </div>
            
            <div className="flex items-start bg-white bg-opacity-10 p-4 rounded-lg backdrop-blur-sm border border-white border-opacity-20 hover:bg-opacity-20 transition">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-200 mr-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-blue-50 text-sm font-medium">Receive a secure temporary password</p>
            </div>
            
            <div className="flex items-start bg-white bg-opacity-10 p-4 rounded-lg backdrop-blur-sm border border-white border-opacity-20 hover:bg-opacity-20 transition">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-200 mr-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-blue-50 text-sm font-medium">Set a new password on next login</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className="p-4 bg-blue-50 rounded-full border-2 border-blue-200">
                <svg className="h-10 w-10 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Forgot Password?</h1>
            <p className="text-gray-600 text-sm font-medium">
              {submitted 
                ? "Your request has been sent to the administrator."
                : "Enter your username and we'll send a reset request to the admin."
              }
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-8 hover:border-blue-300 transition duration-300">
            {/* Alert Messages */}
            {message && messageType === 'success' && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-4 rounded-r-lg flex items-start">
                <svg className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span className="text-sm font-medium">{message}</span>
              </div>
            )}
            {message && messageType === 'error' && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-r-lg flex items-start animate-pulse">
                <svg className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{message}</span>
              </div>
            )}

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 placeholder-gray-400 hover:border-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <svg className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  </div>
                </div>

                {/* Info Note */}
                <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-700 px-4 py-4 rounded-r-lg flex items-start">
                  <svg className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <div className="text-sm">
                    <span className="font-semibold">Note:</span> Your password reset request will be sent to the Super Administrator. Once approved, you will receive a temporary password to log in.
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg border border-blue-800"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                      Send Reset Request
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Request Sent Successfully!
                </h3>
                <p className="text-gray-600 text-sm mb-8">
                  Please wait for the administrator to process your request. You will be contacted with a temporary password.
                </p>
              </div>
            )}

            {/* Back to Login */}
            <div className="text-center pt-4 mt-4 border-t border-gray-200">
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition hover:underline inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Login
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-xs mt-6">
            Super Shine Cargo © 2024. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
