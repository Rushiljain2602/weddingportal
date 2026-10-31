/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart, Lock, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import TectellLogo from './TectellLogo';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const { admins, currentWedding, selectWeddingId } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    
    // Look for matching credentials from the active database/local administrator records
    const matchedAdmin = admins.find(
      a => a.email.trim().toLowerCase() === email.trim().toLowerCase() && 
           a.password === password.trim()
    );

    if (matchedAdmin) {
      localStorage.setItem('wedding_logged_in_admin_id', matchedAdmin.id);
      onLoginSuccess();
    } else {
      setError('Invalid admin credentials. Please verify your credentials.');
    }
  };

  return (
    <div id="login-screen" className="min-h-screen flex items-center justify-center bg-[#faf9f6] px-4 py-12 relative overflow-hidden">
      {/* Delicate Decorative Background Elements */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-emerald-600/5 blur-3xl"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-emerald-600/5 blur-3xl"></div>
      
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-amber-100/60 relative z-10">
        
        {/* Back navigation option */}
        <div className="flex justify-between items-center -mt-2">
          <button
            type="button"
            onClick={() => selectWeddingId(null)}
            className="text-[10px] font-mono font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-widest"
          >
            ← SaaS Home
          </button>
          <span className="text-[9px] font-mono font-semibold bg-stone-100 text-stone-500 px-2 py-0.5 rounded uppercase">
            ID: {currentWedding?.id}
          </span>
        </div>

        {/* Wedding Graphic Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-800">
            <Heart className="h-6 w-6 fill-emerald-800 animate-pulse text-emerald-800" />
          </div>
          <div>
            <span className="font-serif italic text-sm text-emerald-800 tracking-widest block uppercase">Wedding Coordinator Registry</span>
            <h1 className="font-serif text-2xl font-bold tracking-wide mt-1 text-[#1a2f26]">
              {currentWedding?.title || "Exclusive Portal"}
            </h1>
            <p className="text-xs text-stone-500 font-mono tracking-wider mt-2">
              {currentWedding?.resortName || "Luxury Resort Hub"}
            </p>
          </div>
          <div className="h-[1px] w-24 bg-amber-200/60 mx-auto my-3"></div>
          <h2 className="text-xs font-semibold text-stone-700 tracking-wide uppercase">Admin Portal Access</h2>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-lg border border-rose-100 text-center font-medium">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 text-sm bg-stone-50/50"
                  placeholder="admin@wedding.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-stone-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 text-sm bg-stone-50/50"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-emerald-800 focus:ring-emerald-700 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-stone-600">
                Remember credentials
              </label>
            </div>
            <div className="text-xs">
              <span className="font-medium text-stone-400">
                Contact Coordinator
              </span>
            </div>
          </div>

          <div>
            <button
              id="signin-btn"
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 transition-all duration-200 shadow-md shadow-emerald-800/10 active:scale-[0.98]"
            >
              Sign In to Dashboard
            </button>
          </div>
        </form>

        <div className="pt-6 border-t border-stone-100 flex flex-col items-center gap-1.5 text-center">
          <span className="text-[9px] text-stone-400 font-mono font-bold uppercase tracking-widest">
            Licensed System Platform
          </span>
          <TectellLogo variant="color" size="sm" showText={true} />
        </div>
      </div>
    </div>
  );
}
