import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Play,
  ChevronDown,
  Bell,
  Plus,
  MoreVertical,
  Search,
  CheckCircle
} from 'lucide-react';

// --- Shadcn UI Button mock --- //
const Button = ({ children, variant = 'default', className = '', ...props }) => {
  const base = "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5",
    ghost: "hover:bg-accent hover:text-accent-foreground px-5 py-2.5",
    play: "h-11 w-11 p-0 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-background/80 border-0 flex items-center justify-center"
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// --- Mock Dashboard For Landing Page --- //
const DashboardPreview = () => {
  return (
    <div className="w-full h-[600px] flex flex-col font-body text-foreground text-left">
      {/* Top Bar */}
      <div className="h-12 border-b border-border/50 bg-background/50 backdrop-blur-[2px] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center font-bold text-[10px]">G</div>
          <span className="text-[12px] font-semibold tracking-tight">Green Credits</span>
          <ChevronDown className="text-muted-foreground w-3 h-3" />
        </div>

        <div className="flex items-center gap-1.5 flex-1 max-w-[200px] mx-4 bg-muted/50 rounded-md px-2 py-1 text-muted-foreground border border-border/50">
          <Search className="w-3 h-3" />
          <span className="text-[10px]">Search activities...</span>
          <span className="ml-auto text-[8px] bg-background border border-border px-1 rounded">⌘K</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium hidden sm:inline-block cursor-pointer hover:text-accent">Award Credits</span>
          <Bell className="text-muted-foreground w-3.5 h-3.5" />
          <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold border border-accent/20">JB</div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-40 border-r border-border/50 p-3 flex-col gap-1 shrink-0 bg-background/20 hidden md:flex">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2">Platform</div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded bg-secondary/80 text-[11px] font-medium">
            <span>Dashboard</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50 text-[11px] text-muted-foreground">
            <span>Activities</span>
            <span className="bg-accent/10 text-accent text-[9px] px-1.5 py-0.5 rounded-full font-medium">12 active</span>
          </div>
          <div className="flex items-center px-2 py-1.5 rounded hover:bg-muted/50 text-[11px] text-muted-foreground">Ledger</div>
          <div className="flex items-center px-2 py-1.5 rounded hover:bg-muted/50 text-[11px] text-muted-foreground">Volunteers</div>
          <div className="flex items-center px-2 py-1.5 rounded hover:bg-muted/50 text-[11px] text-muted-foreground">Reports</div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-secondary/30 p-4 md:p-6 overflow-hidden flex flex-col">
          <h1 className="text-sm font-semibold mb-3 tracking-tight">Welcome back, Jane</h1>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            <button className="whitespace-nowrap rounded-full bg-accent text-white px-3 py-1.5 text-[10px] font-medium shadow-sm">Create Activity</button>
            <button className="whitespace-nowrap rounded-full bg-background border border-border px-3 py-1.5 text-[10px] font-medium shadow-sm hover:bg-muted/50">Approve Check-ins</button>
            <button className="whitespace-nowrap rounded-full bg-background border border-border px-3 py-1.5 text-[10px] font-medium shadow-sm hover:bg-muted/50">Generate Report</button>
            <span className="text-[10px] text-muted-foreground ml-2 cursor-pointer border-b border-dotted pb-[1px] hidden sm:inline-block">Customize</span>
          </div>

          {/* Top Cards */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* Balance Card */}
            <div className="flex-1 rounded-xl bg-background border border-border p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <span className="text-[11px] font-medium">Credits Distributed</span>
                <CheckCircle className="w-3 h-3 text-accent" />
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-semibold tracking-tight leading-none text-foreground">
                  24,500<span className="text-xs text-muted-foreground font-medium">.00</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Last 30 Days</span>
                <div className="flex gap-2">
                  <span className="text-accent font-medium">+12,500</span>
                  <span className="text-red-500 font-medium">-4,200</span>
                </div>
              </div>

              {/* Custom SVG Chart */}
              <div className="absolute bottom-0 left-0 right-0 h-16 w-full opacity-60">
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,30 L0,20 C10,15 20,25 30,15 C45,0 60,25 75,10 C85,0 95,5 100,2 L100,30 Z" fill="url(#chart-gradient)" />
                  <path d="M0,20 C10,15 20,25 30,15 C45,0 60,25 75,10 C85,0 95,5 100,2" fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            </div>

            {/* Accounts/Campaigns Card */}
            <div className="flex-1 rounded-xl bg-background border border-border p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                <span className="text-[11px] font-semibold">Active Campaigns</span>
                <div className="flex gap-2 text-muted-foreground">
                  <Plus className="w-3.5 h-3.5 cursor-pointer" />
                  <MoreVertical className="w-3.5 h-3.5 cursor-pointer" />
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[11px] font-medium text-foreground">Tree Planting Drive</span>
                  <span className="text-[11px] font-mono text-muted-foreground">12/50 vols</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[11px] font-medium text-foreground">Beach Cleanup</span>
                  <span className="text-[11px] font-mono text-muted-foreground">4/20 vols</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[11px] font-medium text-foreground">Food Bank Sorting</span>
                  <span className="text-[11px] font-mono text-muted-foreground">Fully Booked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="rounded-xl bg-background border border-border shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border/60">
              <h3 className="text-xs font-semibold">Recent Check-ins (Pending Credits)</h3>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Volunteer</th>
                    <th className="px-4 py-2 font-medium">Activity</th>
                    <th className="px-4 py-2 font-medium">Time</th>
                    <th className="px-4 py-2 font-medium text-right">Credits</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  <tr className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground">Alex Johnson</td>
                    <td className="px-4 py-2 text-muted-foreground">Park Cleanup</td>
                    <td className="px-4 py-2 text-muted-foreground">Today 9:42 AM</td>
                    <td className="px-4 py-2 font-mono text-right text-accent">+150</td>
                    <td className="px-4 py-2"><span className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px] font-medium">Pending</span></td>
                  </tr>
                  <tr className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground">Maria Garcia</td>
                    <td className="px-4 py-2 text-muted-foreground">Tree Planting Drop</td>
                    <td className="px-4 py-2 text-muted-foreground">Yesterday 2:15 PM</td>
                    <td className="px-4 py-2 font-mono text-right text-accent">+200</td>
                    <td className="px-4 py-2"><span className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-[9px] font-medium">Awarded</span></td>
                  </tr>
                  <tr className="border-t border-border/40 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground">David Chen</td>
                    <td className="px-4 py-2 text-muted-foreground">Food Bank Sorting</td>
                    <td className="px-4 py-2 text-muted-foreground">Yesterday 11:30 AM</td>
                    <td className="px-4 py-2 font-mono text-right text-accent">+100</td>
                    <td className="px-4 py-2"><span className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-[9px] font-medium">Awarded</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Landing Page Layout --- //
const Landing = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <div className="min-h-screen h-[100vh] w-full flex flex-col bg-background overflow-hidden relative">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-80 mix-blend-multiply"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background/90 via-background/60 to-background/90" />

      <div className="relative z-10 flex flex-col h-full w-full">
        <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 w-full shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="" className="h-10 w-auto" />
            <span className="font-display text-2xl tracking-tight text-foreground">Green Credits</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link to="/" className="text-foreground transition-colors hover:text-accent">Home</Link>
            <Link to="/about" className="text-muted-foreground transition-colors hover:text-accent">About</Link>
            <Link to="/register" state={{ role: 'organizer' }} className="text-muted-foreground transition-colors hover:text-accent">Organizations</Link>
            <Link to="/register" state={{ role: 'volunteer' }} className="text-muted-foreground transition-colors hover:text-accent">Volunteers</Link>
          </div>
          <div>
            <Link to="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </nav>

        <main className="flex-1 flex flex-col items-center pt-12 md:pt-16 lg:pt-20 px-4 w-full h-full flex-nowrap">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 backdrop-blur-md px-4 py-1.5 text-sm font-medium text-muted-foreground mb-6 shadow-sm"
          >
            <span>Empowering communities</span>
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-2xl px-2"
          >
            The Future of <span className="italic font-display font-medium text-primary">Smarter</span> Volunteering
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-center text-base md:text-[1.1rem] text-muted-foreground max-w-[650px] leading-relaxed font-body"
          >
            Organize social activities, track real-world impact, and reward volunteers seamlessly—all in one intelligent platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mt-8 flex items-center gap-3"
          >
            <Link to="/login">
              <Button className="px-8 py-6 text-[15px] shadow-sm">Get Started</Button>
            </Link>
            <Button variant="play" aria-label="Play Video" onClick={() => setIsVideoOpen(true)}>
              <Play className="fill-foreground w-4 h-4 ml-0.5" fill="currentColor" />
            </Button>
          </motion.div>

          {isVideoOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setIsVideoOpen(false)}>
              <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video border border-border/10" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setIsVideoOpen(false)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-background/20 text-white backdrop-blur-md hover:bg-background/40 transition-colors"
                >
                  ✕
                </button>
                <video
                  src="/green-credits.mp4"
                  autoPlay
                  controls
                  className="w-full h-full object-contain bg-black"
                />
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="mt-12 md:mt-16 w-full max-w-5xl px-4 md:px-0 shrink min-h-0"
          >
            <div
              className="w-full rounded-2xl overflow-hidden p-3 md:p-4 select-none pointer-events-none"
              style={{
                background: 'rgba(255, 255, 255, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: 'var(--shadow-dashboard)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)'
              }}
            >
              <div className="rounded-xl overflow-hidden border border-border/40 shadow-sm bg-background">
                <DashboardPreview />
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Landing;
