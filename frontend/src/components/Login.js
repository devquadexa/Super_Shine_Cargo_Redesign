import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const userData = await login(username, password);
      
      if (userData.isTemporaryPassword || userData.passwordResetRequired) {
        navigate('/reset-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        setError(err.response.data.message || 'Invalid username or password');
      } else if (err.request) {
        setError('Cannot connect to server. Please ensure the backend is running on port 5000.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-100 to-gray-200 font-serif">
      {/* Left Side - Exact replica of reference image */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0b1c33] flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1c33] via-[#0d2238] to-[#0d2744]"></div>

        {/* Geometric constellation / network mesh pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <g stroke="rgba(120, 170, 240, 0.35)" strokeWidth="0.6" fill="none">
            <polyline points="0,60 90,120 60,230 150,300 70,400 130,520 40,620 120,720" />
            <polyline points="90,120 200,90 280,180 210,290 150,300" />
            <polyline points="280,180 360,110 430,210 340,300 210,290" />
            <polyline points="430,210 520,150 600,250" />
            <polyline points="150,300 250,380 210,490 130,520" />
            <polyline points="250,380 360,360 420,470 340,560 210,490" />
            <polyline points="0,60 120,30 230,70 320,30" />
            <polyline points="40,620 140,680 90,760" />
          </g>
          <g fill="rgba(150, 195, 255, 0.85)">
            <circle cx="90" cy="120" r="2.5" />
            <circle cx="150" cy="300" r="2.5" />
            <circle cx="280" cy="180" r="2.5" />
            <circle cx="210" cy="290" r="2" />
            <circle cx="430" cy="210" r="2.5" />
            <circle cx="250" cy="380" r="2" />
            <circle cx="130" cy="520" r="2.5" />
            <circle cx="40" cy="620" r="2" />
            <circle cx="340" cy="300" r="2" />
            <circle cx="200" cy="90" r="2" />
            <circle cx="70" cy="400" r="2.5" />
            <circle cx="360" cy="360" r="2" />
          </g>
        </svg>

        <div className="max-w-md w-full text-center relative z-10">
          {/* Logo Circle - full white background */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center relative shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-white">
              <img
                src={`${process.env.PUBLIC_URL}/logo.png?v=${Date.now()}`}
                alt="Super Shine Cargo"
                className="h-24 w-24 object-contain relative z-10"
              />
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-12 tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">Welcome Back</h1>

          <div className="space-y-4">
            {/* Feature 1 - Real-time shipment tracking */}
            <div className="flex items-center bg-white/[0.08] backdrop-blur-md px-5 py-4 rounded-xl border border-white/15 hover:bg-white/[0.12] transition-all duration-300 shadow-lg">
              <div className="flex-shrink-0 mr-4">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 shadow-md">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-white text-left font-medium">Real-time shipment tracking</p>
            </div>

            {/* Feature 2 - Secure and reliable service */}
            <div className="flex items-center bg-white/[0.08] backdrop-blur-md px-5 py-4 rounded-xl border border-white/15 hover:bg-white/[0.12] transition-all duration-300 shadow-lg">
              <div className="flex-shrink-0 mr-4">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 shadow-md">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <p className="text-white text-left font-medium">Secure and reliable service</p>
            </div>

            {/* Feature 3 - 24/7 customer support */}
            <div className="flex items-center bg-white/[0.08] backdrop-blur-md px-5 py-4 rounded-xl border border-white/15 hover:bg-white/[0.12] transition-all duration-300 shadow-lg">
              <div className="flex-shrink-0 mr-4">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 shadow-md">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636A9 9 0 0112 21a9 9 0 01-6.364-15.364M21 12a9 9 0 00-9-9 9 9 0 00-9 9m18 0v3a2 2 0 01-2 2h-1v-5h3zM3 12v3a2 2 0 002 2h1v-5H3z" />
                  </svg>
                </div>
              </div>
              <p className="text-white text-left font-medium">24/7 customer support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 py-12 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif uppercase tracking-[0.15em] text-3xl font-bold text-[#1e3f63] mb-2">Super Shine Cargo</h1>
            <p className="uppercase tracking-[0.2em] text-[#2f5e8f] text-xs font-semibold">Sri Lankan Premier Cargo Solutions</p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            {/* Form Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
              <p className="text-gray-600 text-sm">Enter your credentials to access your account</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start text-sm">
                <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-gray-50 outline-none transition placeholder-gray-500 text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-100 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-gray-50 outline-none transition placeholder-gray-500 text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{ background: isLoading ? '#9ca3af' : 'linear-gradient(to bottom, #2f5e8f 0%, #1e3f63 100%)' }}
                className="w-full hover:brightness-110 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Login To The System'
                )}
              </button>

              {/* Forgot Password Link */}
              <div className="text-center pt-2">
                <Link
                  to="/forgot-password"
                  className="text-[#1e3f63] hover:text-[#2f5e8f] text-sm font-semibold transition hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </form>
          </div>

          {/* Footer text */}
          <p className="text-center text-gray-500 text-xs mt-6">
            Super Shine Cargo © 2024. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
