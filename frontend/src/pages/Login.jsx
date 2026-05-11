import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      setError('Google sign-in is not configured yet.');
      return;
    }

    setGoogleLoading(true);
    setError('');
    localStorage.setItem('preferredRole', 'volunteer');

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 expects 'username' instead of 'email'
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) {
        let errorData = null;
        try {
           errorData = await response.json();
        } catch (e) {
           throw new Error(`Server error: ${response.statusText} (Is backend running?)`);
        }
        throw new Error(errorData?.detail || 'Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      
      // Fetch user profile to know the role
      const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      
      const userData = await userResponse.json();
      localStorage.setItem('user', JSON.stringify(userData));
      
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_90%_12%,rgba(14,165,233,0.12),transparent_24%),linear-gradient(135deg,#f8fffb_0%,#eef8f4_48%,#f8fbff_100%)] flex flex-col items-center justify-center p-4">
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
          Secure Supabase authentication
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your Green Credits account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md disabled:opacity-70"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold shadow-sm">G</span>
          {googleLoading ? 'Opening Google...' : 'Continue with Google'}
        </button>

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-muted-foreground">
          <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>Google accounts join as volunteers by default. Choose Organizer on sign up when creating an organization account.</span>
        </div>
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/register" className="text-accent cursor-pointer hover:underline">Sign Up here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
