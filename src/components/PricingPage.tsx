import React, { useState } from 'react';
import { Check, X, Building2, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { currentUser, logout } = useAuth();

  const handleCheckout = async (planName: string) => {
    if (!currentUser) return;
    
    try {
      setLoadingPlan(planName);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: currentUser.email,
          uid: currentUser.uid,
          planName: planName,
          amount: isYearly ? plans.find(p => p.name === planName)?.priceYearly : plans.find(p => p.name === planName)?.priceMonthly,
          interval: isYearly ? 'year' : 'month'
        }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, '_blank');
      } else if (data.error) {
        console.error('Checkout error:', data.error);
        alert('Failed to start checkout process. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for freelancers and small studios.',
      priceMonthly: 49,
      priceYearly: 39,
      features: [
        'Up to 3 active projects',
        'Basic 3D Viewer (BIM)',
        'Standard Finance Ledger',
        'Email Support',
      ],
      notIncluded: [
        'AI Concierge & Audits',
        'Pitch Deck Generator',
        'Custom Branding',
      ],
      icon: Building2,
      color: 'text-text-muted',
      bg: 'bg-surface',
      border: 'border-zinc-800',
      button: 'hover:bg-white/10 text-text-primary',
    },
    {
      name: 'Pro',
      description: 'For growing agencies that need AI power.',
      priceMonthly: 99,
      priceYearly: 79,
      features: [
        'Unlimited active projects',
        'Advanced 3D Viewer (BIM)',
        'Full Finance & Cashflow',
        'AI Concierge & Audits',
        'Pitch Deck Generator',
        'Priority Support',
      ],
      notIncluded: [
        'Custom Branding',
      ],
      icon: Zap,
      color: 'text-blue-500',
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/30',
      button: 'bg-blue-600 hover:bg-blue-500 text-text-primary shadow-lg shadow-blue-500/20',
      popular: true,
    },
    {
      name: 'Business',
      description: 'Enterprise-grade security and custom workflows.',
      priceMonthly: 199,
      priceYearly: 159,
      features: [
        'Everything in Pro',
        'Custom Branding',
        'Dedicated Account Manager',
        'SSO & Advanced Security',
        'Custom API Integrations',
        'On-premise deployment option',
      ],
      notIncluded: [],
      icon: Shield,
      color: 'text-emerald-500',
      bg: 'bg-surface',
      border: 'border-zinc-800',
      button: 'hover:bg-white/10 text-text-primary',
    }
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text-primary">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-text-muted">
            Your trial has expired. Choose a plan to unlock the full potential of Kreativ-Desk OS and continue managing your projects seamlessly.
          </p>
          
          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={`text-sm font-medium ${!isYearly ? 'text-text-primary' : 'text-text-muted'}`}>Monthly</span>
            <button 
              onClick={() => setIsYearly(!isYearly)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-background"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isYearly ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium flex items-center gap-2 ${isYearly ? 'text-text-primary' : 'text-text-muted'}`}>
              Yearly <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs">-20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-3xl border ${plan.bg} ${plan.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-text-primary text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className="mb-8">
                <plan.icon className={`w-10 h-10 mb-6 ${plan.color}`} />
                <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
                <p className="text-sm text-text-muted h-10">{plan.description}</p>
              </div>

              <div className="mb-8 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-text-primary">
                  €{isYearly ? plan.priceYearly : plan.priceMonthly}
                </span>
                <span className="text-text-muted font-medium">/mo</span>
              </div>

              <button 
                onClick={() => handleCheckout(plan.name)}
                disabled={loadingPlan === plan.name}
                className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${plan.button}`}
              >
                {loadingPlan === plan.name ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Select {plan.name}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="mt-8 space-y-4 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm text-text-primary">{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 opacity-50">
                    <X className="w-5 h-5 text-text-muted shrink-0" />
                    <span className="text-sm text-text-muted line-through">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-16 text-center">
          <button 
            onClick={logout}
            className="text-sm text-text-muted hover:text-text-primary transition-colors underline underline-offset-4"
          >
            Log out and decide later
          </button>
        </div>

      </div>
    </div>
  );
}
