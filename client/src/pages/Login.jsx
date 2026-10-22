import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid administrator username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full bg-cover bg-left md:bg-center bg-no-repeat relative flex items-center justify-center lg:justify-end p-4 sm:p-8 lg:pr-20 xl:pr-28"
      style={{ backgroundImage: `url('/murugan-bg.png')` }}
    >
      {/* Subtle overlay for mobile responsiveness */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-900/30 lg:hidden pointer-events-none" />

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        
        {/* Main Card with Premium Navy Blue, White, and Gold Trim */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 sm:p-10 shadow-2xl border border-amber-300/60 shadow-amber-900/10 ring-1 ring-black/5">
          
          {/* Logo & Brand Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center p-3.5 bg-white rounded-2xl border border-amber-200/80 shadow-md shadow-amber-500/5 mb-3">
              <img 
                src="/logo.png" 
                alt="Vishva Finance" 
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Vishva Finance
            </h1>
            <p className="text-[11px] font-bold text-amber-600 tracking-widest uppercase mt-0.5">
              Personal Loan Management Portal
            </p>
          </div>

          <div className="mb-6 text-center sm:text-left">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              Administrator Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your authorized staff credentials to securely access financial records and loan administration.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium animate-in shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-amber-600/70" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter administrator username"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-amber-600/70" />
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 hover:from-blue-800 hover:to-slate-900 text-white font-bold text-sm shadow-xl shadow-slate-950/20 border border-amber-400/40 hover:border-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              )}
              <span>{loading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
              {!loading && <ArrowRight className="w-3.5 h-3.5 text-amber-300 ml-1" />}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-7 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed flex items-center justify-center gap-1.5">
              <span className="text-amber-600 font-bold">🔒 Secure Staff Portal:</span>
              <span>Encrypted Session • Audit Trail Enabled</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
