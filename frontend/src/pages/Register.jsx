import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { supabase, isGoogleAuthEnabled } from '../lib/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const [role, setRole] = useState(location.state?.role || 'volunteer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleRegister = async () => {
    if (!isGoogleAuthEnabled) {
      setError('Google sign-up is being configured. Please use email and password for now.');
      return;
    }

    setGoogleLoading(true);
    setError('');
    localStorage.setItem('preferredRole', role);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          throw new Error(`Server error: ${response.statusText} (Please ensure backend is running)`);
        }
        throw new Error(errorData.detail || 'Registration failed');
      }

      // Automatically login after successful registration
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      if (loginResponse.ok) {
        const data = await loginResponse.json();
        localStorage.setItem('token', data.access_token);
        
        const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        if (!userResponse.ok) {
          throw new Error('Account was created, but profile loading failed. Please sign in.');
        }

        const userData = await userResponse.json();
        if (userData.role !== role) {
          throw new Error(`Expected ${role} account but received ${userData.role}. Please contact support.`);
        }
        localStorage.setItem('user', JSON.stringify(userData));
        
        navigate('/dashboard');
      } else {
        throw new Error('Failed to auto-login. Backend might be down.');
      }

    } catch (err) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_14%_18%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(14,165,233,0.12),transparent_24%),linear-gradient(135deg,#f8fffb_0%,#eef8f4_48%,#f8fbff_100%)] flex flex-col items-center justify-center p-4">
      <Link to="/" className="fixed top-8 left-8 flex items-center gap-2">
        <img src="/logo-icon.png" alt="" className="h-10 w-auto" />
        <span className="font-display text-2xl tracking-tight text-foreground">Green Credits</span>
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/80 border border-white/70 rounded-2xl p-8 shadow-dashboard backdrop-blur-xl"
      >
        <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          Connected with Supabase Auth
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground text-sm">Join Green Credits to make an impact</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Account Type</label>
            <div className="flex gap-4 mb-2">
              <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${role === 'volunteer' ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-border bg-background hover:bg-secondary'}`}>
                <input type="radio" value="volunteer" checked={role === 'volunteer'} onChange={() => setRole('volunteer')} className="hidden" />
                Volunteer
              </label>
              <label className={`flex-1 flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${role === 'organizer' ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-background hover:bg-secondary'}`}>
                <input type="radio" value="organizer" checked={role === 'organizer'} onChange={() => setRole('organizer')} className="hidden" />
                Organizer
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background border border-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all text-sm"
              placeholder="jane@example.com"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background border border-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-colors disabled:opacity-70"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        {isGoogleAuthEnabled ? (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md disabled:opacity-70"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold shadow-sm">G</span>
              {googleLoading ? 'Opening Google...' : `Continue with Google as ${role}`}
            </button>
          </>
        ) : (
          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-muted-foreground">
            Google sign-up will appear after the Google provider is enabled in Supabase. Email registration below is fully active for both roles.
          </div>
        )}
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-accent cursor-pointer hover:underline">Sign In here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
