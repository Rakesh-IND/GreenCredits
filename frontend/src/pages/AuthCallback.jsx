import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Finalizing secure sign-in...');
  const [error, setError] = useState('');

  useEffect(() => {
    const completeSignIn = async () => {
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured for this deployment.');
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        setError(sessionError?.message || 'Google sign-in session was not found.');
        return;
      }

      setStatus('Creating your Green Credits session...');
      const preferredRole = localStorage.getItem('preferredRole') || 'volunteer';

      const response = await fetch(`${API_BASE_URL}/api/auth/supabase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: data.session.access_token,
          role: preferredRole,
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || 'Unable to connect Google account.');
      }

      const tokenData = await response.json();
      localStorage.setItem('token', tokenData.access_token);

      const userResponse = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userResponse.json();
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.removeItem('preferredRole');

      navigate('/dashboard', { replace: true });
    };

    completeSignIn().catch((err) => setError(err.message || 'Google sign-in failed.'));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_34%),linear-gradient(135deg,#f8fffb_0%,#eef8f4_48%,#f8fbff_100%)] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/70 bg-white/75 p-8 text-center shadow-dashboard backdrop-blur-xl"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          {error ? <Leaf className="h-7 w-7" /> : <Loader2 className="h-7 w-7 animate-spin" />}
        </div>
        <h1 className="mb-2 font-display text-3xl text-foreground">Google Sign-In</h1>
        <p className="text-sm text-muted-foreground">{error || status}</p>
        {error && (
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Return to sign in
          </Link>
        )}
      </motion.div>
    </div>
  );
};

export default AuthCallback;
