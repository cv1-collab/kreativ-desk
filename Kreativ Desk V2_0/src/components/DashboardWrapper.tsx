import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import PricingPage from './PricingPage';
import { AlertCircle, Clock, Mail } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UserData {
  trialEndsAt?: string;
  hasActiveSubscription?: boolean;
}

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleResendVerification = async () => {
    if (currentUser) {
      try {
        await sendEmailVerification(currentUser);
        setVerificationSent(true);
        setTimeout(() => setVerificationSent(false), 5000);
      } catch (error) {
        console.error("Error sending verification email", error);
      }
    }
  };

  useEffect(() => {
    if (!currentUser || !db) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        
        // Check for Stripe success redirect
        const searchParams = new URLSearchParams(location.search);
        const sessionId = searchParams.get('session_id');
        
        if (sessionId) {
          // In a real production app, this should ONLY be handled by the Stripe Webhook.
          // For this prototype, we update it client-side to avoid needing a webhook setup immediately.
          try {
            await updateDoc(docRef, {
              hasActiveSubscription: true
            });
          } catch (e) {
            console.error("Failed to update subscription status", e);
          }
          
          // Clean up URL
          navigate(location.pathname, { replace: true });
        }

        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, location.search, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If no user data or no trial info, we just render children (fallback for existing users without trial data)
  if (!userData || !userData.trialEndsAt) {
    return <>{children}</>;
  }

  const trialEndsAt = new Date(userData.trialEndsAt);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const isTrialExpired = daysRemaining <= 0;
  const hasSubscription = userData.hasActiveSubscription === true;

  // Scenario B: HARD PAYWALL
  if (isTrialExpired && !hasSubscription) {
    return <PricingPage />;
  }

  // Scenario A: Trial is still active
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {currentUser && !currentUser.emailVerified && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 flex items-center justify-center gap-3 shrink-0 rounded-none">
          <Mail size={16} className="text-orange-400" />
          <span className="text-sm font-medium text-orange-100">
            Please verify your email address.
          </span>
          <button 
            onClick={handleResendVerification}
            disabled={verificationSent}
            className="text-sm font-bold text-orange-400 hover:text-orange-300 underline underline-offset-2 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verificationSent ? 'Verification sent!' : 'Resend email'}
          </button>
        </div>
      )}
      {!hasSubscription && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-center gap-3 shrink-0 rounded-none">
          <Clock size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-blue-100">
            Your free trial ends in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.
          </span>
          <button 
            onClick={() => navigate('/pricing')}
            className="text-sm font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 ml-2"
          >
            Upgrade now
          </button>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
