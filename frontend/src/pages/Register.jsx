import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const [role, setRole] = useState(location.state?.role || 'volunteer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        const userData = await userResponse.json();
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link to="/" className="fixed top-8 left-8 flex items-center gap-2">
        <img src="/logo-icon.png" alt="" className="h-10 w-auto" />
        <span className="font-display text-2xl tracking-tight text-foreground">Green Credits</span>
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-secondary/50 border border-border rounded-2xl p-8 shadow-sm"
      >
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
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="text-accent cursor-pointer hover:underline">Sign In here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
