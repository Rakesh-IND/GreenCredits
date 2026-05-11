import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft, Medal, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/volunteer/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setLeaders(data);
      } else {
        toast.error("Failed to load leaderboard");
      }
    } catch (e) {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank) => {
    switch(rank) {
      case 1: return { bg: 'bg-yellow-500/10 border-yellow-500/50', text: 'text-yellow-600', icon: <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" /> };
      case 2: return { bg: 'bg-slate-300/20 border-slate-400/50', text: 'text-slate-600', icon: <Medal className="w-6 h-6 text-slate-500 fill-slate-300" /> };
      case 3: return { bg: 'bg-amber-600/10 border-amber-600/50', text: 'text-amber-700', icon: <Medal className="w-6 h-6 text-amber-600 fill-amber-200" /> };
      default: return { bg: 'bg-white/60 border-white hover:bg-white/80', text: 'text-slate-500', icon: <span className="font-bold text-lg w-6 h-6 flex items-center justify-center">{rank}</span> };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative overflow-hidden">
      {/* Immersive Animated Background Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[60%] rounded-full bg-emerald-200/30 blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute top-[20%] -right-[10%] w-[45%] h-[55%] rounded-full bg-teal-200/30 blur-[100px] animate-pulse-slow mix-blend-multiply" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-cyan-200/20 blur-[120px] animate-pulse-slow mix-blend-multiply" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 bg-grid-black opacity-[0.03]" />
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors bg-white/50 px-4 py-2 rounded-full border border-white backdrop-blur-md">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <Star className="w-8 h-8 text-white fill-white" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4 drop-shadow-sm">
            Global Impact <span className="text-gradient">Leaderboard</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-muted-foreground max-w-lg mx-auto">
            Celebrating our most active volunteers making a tangible difference around the world.
          </motion.p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent"></div></div>
        ) : (
          <div className="flex flex-col gap-4">
            {leaders.map((leader, index) => {
              const style = getRankStyle(leader.rank);
              const isTop3 = leader.rank <= 3;
              
              return (
                <motion.div
                  key={leader.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center p-4 md:p-6 rounded-2xl backdrop-blur-md border shadow-sm transition-all duration-300 transform hover:-translate-y-1 ${style.bg} ${isTop3 ? 'shadow-lg ' + style.bg.split(' ')[0].replace('/10', '/30') : ''}`}
                >
                  <div className="flex items-center justify-center w-12 shrink-0">
                    {style.icon}
                  </div>
                  
                  <div className="ml-4 flex-1">
                    <h3 className={`font-semibold text-lg ${isTop3 ? 'text-foreground font-bold' : 'text-foreground'}`}>
                      {leader.email.split('@')[0]}
                    </h3>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-mono text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">
                      {leader.total_credits.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Credits</div>
                  </div>
                </motion.div>
              );
            })}
            
            {leaders.length === 0 && (
              <div className="text-center py-20 text-muted-foreground bg-white/50 rounded-2xl border border-white">
                No volunteers found yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
