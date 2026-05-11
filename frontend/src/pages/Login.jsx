import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/register" className="text-accent cursor-pointer hover:underline">Sign Up here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
