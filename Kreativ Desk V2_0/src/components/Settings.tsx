import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, CreditCard, Shield, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { updateProfile, updatePassword, sendEmailVerification } from 'firebase/auth';

export default function Settings() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing'>('profile');
  
  // Profile State
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      setProfileError('');
      setProfileMessage('');
      setIsSavingProfile(true);
      
      await updateProfile(currentUser, {
        displayName: displayName
      });
      
      setProfileMessage('Profile updated successfully.');
    } catch (err: any) {
      setProfileError('Failed to update profile: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('File size must be less than 2MB.');
      return;
    }

    try {
      setProfileError('');
      setProfileMessage('');
      setIsSavingProfile(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('ownerId', currentUser.uid);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      await updateProfile(currentUser, {
        photoURL: data.url
      });

      setProfileMessage('Profile picture updated successfully.');
    } catch (err: any) {
      setProfileError('Failed to upload profile picture: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassword !== confirmPassword) {
      return setSecurityError('Passwords do not match.');
    }
    if (newPassword.length < 6) {
      return setSecurityError('Password must be at least 6 characters.');
    }
    
    try {
      setSecurityError('');
      setSecurityMessage('');
      setIsSavingSecurity(true);
      
      await updatePassword(currentUser, newPassword);
      
      setSecurityMessage('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityError('Failed to update password. You may need to log in again. ' + err.message);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleSendVerification = async () => {
    if (!currentUser) return;
    try {
      setSecurityError('');
      setSecurityMessage('');
      setIsSendingVerification(true);
      await sendEmailVerification(currentUser);
      setSecurityMessage('Verification email sent. Please check your inbox.');
    } catch (err: any) {
      setSecurityError('Failed to send verification email: ' + err.message);
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings & Profile</h1>
        <p className="text-text-muted text-sm mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'bg-white/5 text-text-primary' 
                : 'text-text-muted hover:bg-surface hover:text-text-primary'
            }`}
          >
            <User size={18} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'security' 
                ? 'bg-white/5 text-text-primary' 
                : 'text-text-muted hover:bg-surface hover:text-text-primary'
            }`}
          >
            <Shield size={18} />
            Security
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'billing' 
                ? 'bg-white/5 text-text-primary' 
                : 'text-text-muted hover:bg-surface hover:text-text-primary'
            }`}
          >
            <CreditCard size={18} />
            Billing & Subscription
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-surface border border-border rounded-xl p-6 shadow-sm">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-lg font-medium">Public Profile</h2>
                <p className="text-sm text-text-muted">This information will be displayed to your team.</p>
              </div>
              
              <div className="h-px w-full bg-border" />

              <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-md">
                {profileError && (
                  <div className="bg-accent-error/10 border border-accent-error/20 text-accent-error text-sm p-3 rounded-lg">
                    {profileError}
                  </div>
                )}
                {profileMessage && (
                  <div className="bg-accent-success/10 border border-accent-success/20 text-accent-success text-sm p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {profileMessage}
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <label className="relative group cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/gif" 
                      className="hidden" 
                      onChange={handleProfilePictureUpload}
                      disabled={isSavingProfile}
                    />
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-border overflow-hidden">
                      {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-2xl font-medium text-text-muted">
                          {displayName ? displayName.charAt(0).toUpperCase() : currentUser?.email?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-text-primary" />
                    </div>
                  </label>
                  <div className="text-sm">
                    <p className="font-medium">Profile Picture</p>
                    <p className="text-text-muted text-xs mt-1">JPG, GIF or PNG. Max size of 2MB.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <input 
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-muted cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-text-muted">Email addresses cannot be changed directly.</p>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-4 py-2 bg-text-primary text-surface rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-lg font-medium">Security & Authentication</h2>
                <p className="text-sm text-text-muted">Manage your password and account security.</p>
              </div>
              
              <div className="h-px w-full bg-border" />

              <div className="max-w-md space-y-8">
                {securityError && (
                  <div className="bg-accent-error/10 border border-accent-error/20 text-accent-error text-sm p-3 rounded-lg">
                    {securityError}
                  </div>
                )}
                {securityMessage && (
                  <div className="bg-accent-success/10 border border-accent-success/20 text-accent-success text-sm p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {securityMessage}
                  </div>
                )}

                {/* Email Verification Status */}
                <div className="p-4 rounded-xl border border-border bg-surface">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        Email Verification
                        {currentUser?.emailVerified ? (
                          <span className="px-2 py-0.5 rounded-full bg-accent-success/10 text-accent-success text-[10px] uppercase tracking-wider">Verified</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-accent-warning/10 text-accent-warning text-[10px] uppercase tracking-wider">Unverified</span>
                        )}
                      </h3>
                      <p className="text-xs text-text-muted mt-1">
                        {currentUser?.emailVerified 
                          ? "Your email address has been verified." 
                          : "Please verify your email address to access all features."}
                      </p>
                    </div>
                    {!currentUser?.emailVerified && (
                      <button 
                        onClick={handleSendVerification}
                        disabled={isSendingVerification}
                        className="px-3 py-1.5 bg-background border border-border rounded-md text-xs font-medium hover:bg-white/5 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSendingVerification ? 'Sending...' : 'Send Link'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Change Password */}
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <h3 className="text-sm font-medium">Change Password</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-muted">New Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-text-muted">Confirm New Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input 
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={isSavingSecurity || !newPassword || !confirmPassword}
                      className="px-4 py-2 bg-text-primary text-surface rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingSecurity ? <Loader2 size={16} className="animate-spin" /> : null}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-lg font-medium">Billing & Subscription</h2>
                <p className="text-sm text-text-muted">Manage your Kreativ-Desk OS subscription.</p>
              </div>
              
              <div className="h-px w-full bg-border" />

              <div className="max-w-2xl space-y-6">
                <div className="p-6 rounded-xl border border-accent-ai/30 bg-accent-ai/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <span className="px-3 py-1 rounded-full bg-accent-ai/20 text-accent-ai text-xs font-medium border border-accent-ai/30">
                      30-Day Trial Active
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2">Pro Plan (Trial)</h3>
                  <p className="text-sm text-text-muted mb-6 max-w-md">
                    You are currently on the free 30-day trial. Upgrade to a paid subscription to keep access to all premium features including the AI Concierge and 3D Viewer.
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => alert('Stripe Checkout Integration pending...')}
                      className="px-6 py-2.5 bg-accent-ai text-text-primary rounded-lg text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20"
                    >
                      Upgrade to Pro
                    </button>
                    <span className="text-sm font-medium text-text-muted">€49 / month</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-4">Payment Methods</h3>
                  <div className="p-8 rounded-xl border border-border border-dashed flex flex-col items-center justify-center text-center">
                    <CreditCard size={32} className="text-text-muted mb-3" />
                    <p className="text-sm font-medium">No payment methods added</p>
                    <p className="text-xs text-text-muted mt-1 max-w-sm">
                      Add a payment method to ensure uninterrupted access after your trial ends. Payments are securely processed by Stripe.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>
    </div>
  );
}
