import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Command, Loader2, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';

const BOOT_SEQUENCE = [
  "Initializing AI Core...",
  "Syncing CAD & Finance Modules...",
  "Establishing Secure Connection...",
  "Loading Workspace..."
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootStep, setBootStep] = useState(-1);
  
  // Forgot Password State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  if (currentUser) {
    if (currentUser.email?.toLowerCase() === 'cv1@gmx.ch') {
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/app" />;
  }

  const handleBootSequence = async (isAdmin: boolean) => {
    for (let i = 0; i < BOOT_SEQUENCE.length; i++) {
      setBootStep(i);
      await new Promise(resolve => setTimeout(resolve, 800)); // 800ms per step
    }
    if (isAdmin) {
      navigate('/admin');
    } else {
      navigate('/app');
    }
  };

  async function handleGoogleSignIn() {
    if (!auth) {
      return setError('Firebase is not configured.');
    }
    try {
      setError('');
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const isAdmin = result.user.email?.toLowerCase() === 'cv1@gmx.ch';
      await handleBootSequence(isAdmin);
    } catch (err: any) {
      setError('Failed to log in with Google: ' + err.message);
      setLoading(false);
      setBootStep(-1);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!auth) {
      return setError('Firebase is not configured. Please add your Firebase credentials to the environment variables.');
    }

    try {
      setError('');
      setLoading(true);
      
      let userCredential;
      try {
        // Authenticate first
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        // Auto-create admin or demo account if it doesn't exist
        if (err.code === 'auth/invalid-credential' && (email.toLowerCase() === 'cv1@gmx.ch' || email.toLowerCase() === 'demo@kreativdesk.com')) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Calculate trial end date (30 days from now)
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);

          // Create user document
          try {
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              role: email.toLowerCase() === 'cv1@gmx.ch' ? 'Admin' : 'Internal',
              trialEndsAt: trialEndsAt.toISOString(),
              hasActiveSubscription: false,
              createdAt: new Date().toISOString()
            });
          } catch (docErr) {
            handleFirestoreError(docErr, OperationType.CREATE, 'users/' + userCredential.user.uid);
          }
        } else {
          throw err;
        }
      }

      const isAdmin = userCredential.user.email?.toLowerCase() === 'cv1@gmx.ch';
      
      await handleBootSequence(isAdmin);
    } catch (err: any) {
      setError('Failed to log in: ' + err.message + (err.code === 'auth/invalid-credential' ? ' (Please check your password or sign up first)' : ''));
      setLoading(false);
      setBootStep(-1);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return setResetError('Firebase is not configured.');
    if (!resetEmail) return setResetError('Please enter your email address.');

    try {
      setResetError('');
      setResetMessage('');
      setResetLoading(true);
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage('Password reset email sent. Check your inbox.');
    } catch (err: any) {
      setResetError('Failed to reset password: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  }

  if (bootStep >= 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-[#fafafa] font-mono selection:bg-blue-500/30">
        <div className="flex flex-col items-center max-w-md w-full px-6">
          <Command className="h-12 w-12 text-blue-500 mb-8 animate-pulse" />
          
          <div className="w-full space-y-4">
            {BOOT_SEQUENCE.map((step, index) => (
              <div 
                key={step} 
                className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                  index <= bootStep ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                } ${index === bootStep ? 'text-blue-400' : 'text-text-muted'}`}
              >
                {index === bootStep ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : index < bootStep ? (
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </div>
                ) : (
                  <div className="h-4 w-4" />
                )}
                {step}
              </div>
            ))}
          </div>
          
          <div className="w-full h-1 bg-surface rounded-full mt-12 overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${((bootStep + 1) / BOOT_SEQUENCE.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-md w-full space-y-8 bg-[#18181b]/80 backdrop-blur-xl p-10 rounded-2xl border border-[#27272a] shadow-2xl relative z-10">
        <div className="flex flex-col items-center">
          <div className="p-4 bg-[#09090b] rounded-2xl border border-[#27272a] shadow-inner mb-6">
            <Command className="h-8 w-8 text-[#fafafa]" />
          </div>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-[#fafafa]">
            Kreativ-Desk OS
          </h2>
          <p className="mt-2 text-center text-sm text-[#a1a1aa]">
            The Operating System for Visionaries
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl text-center">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-xl border border-[#27272a] py-3 px-4 text-[#fafafa] bg-[#09090b] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-xl border border-[#27272a] py-3 px-4 text-[#fafafa] bg-[#09090b] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="text-sm font-medium text-[#a1a1aa] hover:text-blue-400 transition-colors"
            >
              Forgot your password?
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-[#fafafa] px-4 py-3 text-sm font-semibold text-[#09090b] hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#09090b] focus:ring-[#fafafa] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Authenticating...' : 'Enter Workspace'}
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setEmail('demo@kreativdesk.com');
                setPassword('demo123');
                // We use a small timeout to allow state to update before submitting
                setTimeout(() => {
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }, 100);
              }}
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-[#27272a] px-4 py-3 text-sm font-semibold text-[#fafafa] hover:bg-[#3f3f46] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#09090b] focus:ring-[#27272a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Demo Login
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#27272a]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#18181b] text-[#a1a1aa]">Or continue with</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-[#09090b] border border-[#27272a] px-4 py-3 text-sm font-semibold text-[#fafafa] hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#09090b] focus:ring-[#fafafa] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </div>
          
          <p className="text-center text-xs text-[#a1a1aa]">
            Don't have an access key?{' '}
            <Link to="/signup" className="font-medium text-[#fafafa] hover:text-blue-400 transition-colors">
              Request access
            </Link>
          </p>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between bg-[#09090b]">
              <h3 className="font-semibold text-lg text-[#fafafa]">Reset Password</h3>
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {resetError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                  {resetError}
                </div>
              )}
              {resetMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-3 rounded-lg">
                  {resetMessage}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#fafafa]">Email Address</label>
                <input 
                  type="email"
                  required
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-[#fafafa] placeholder:text-[#a1a1aa] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <p className="text-xs text-[#a1a1aa]">We will send you a link to reset your password.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={resetLoading || !resetEmail}
                  className="px-4 py-2 bg-[#fafafa] text-[#09090b] rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
