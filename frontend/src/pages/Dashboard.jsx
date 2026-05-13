import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronDown, Bell, Plus, MoreVertical, Search, CheckCircle, LogOut, Sparkles, Star, Trophy,
  Gift, Award, Leaf, Heart, Zap, ShoppingBag, Coffee, TreePine, Droplets, MapPin, BarChart3, CalendarCheck, ShieldCheck
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const parseApiError = (data, fallback) => {
  if (Array.isArray(data?.detail)) {
    return data.detail.map(item => item.msg).filter(Boolean).join(', ') || fallback;
  }
  return data?.detail || data?.message || fallback;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Modal state
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Profile Editable state
  const [profileName, setProfileName] = useState('');
  const [profileLocation, setProfileLocation] = useState('Chennai, IN');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Volunteer specific
  const [checkinQr, setCheckinQr] = useState('');
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [claimingId, setClaimingId] = useState(null);

  // Organizer specific
  const [newActivity, setNewActivity] = useState({ title: '', credits_reward: 100, image_url: '' });
  const [isUploading, setIsUploading] = useState(false);

  // Rewards Organizer Specific
  const [newReward, setNewReward] = useState({ name: '', description: '', cost: 100, icon_emoji: '🎁', color_gradient: 'from-emerald-500 to-teal-500' });
  const [newBadge, setNewBadge] = useState({ name: '', description: '', icon_emoji: '🏆', required_credits: 500 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSessionExpired = () => {
    localStorage.clear();
    toast.error('Session expired. Please sign in again.');
    navigate('/login');
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check type png, jpg, jpeg
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only PNG and JPG are supported.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/organizer/activities/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setNewActivity(prev => ({ ...prev, image_url: data.image_url }));
        toast.success('Image uploaded successfully!');
      } else if (res.status === 401) {
        handleSessionExpired();
      } else {
        toast.error(parseApiError(data, 'Image upload failed. You can still create the activity without it.'));
      }
    } catch (err) {
      toast.error('Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  // Dynamic Catalog Data
  const [catalogRewards, setCatalogRewards] = useState([
    { id: 101, name: 'Eco Water Bottle', description: 'Premium BPA-free reusable water bottle', cost: 150, icon_emoji: '💧', color_gradient: 'from-cyan-500 to-blue-500', is_active: true, organizer_id: 1 },
    { id: 102, name: 'Plant a Tree Certificate', description: 'We plant a real tree in your name', cost: 200, icon_emoji: '🌳', color_gradient: 'from-emerald-500 to-teal-500', is_active: true, organizer_id: 1 },
    { id: 103, name: 'Coffee Shop Voucher', description: '₹100 off at partner eco-cafés', cost: 100, icon_emoji: '☕', color_gradient: 'from-amber-500 to-orange-500', is_active: true, organizer_id: 1 },
    { id: 104, name: 'Organic Seeds Kit', description: 'Grow your own herbs & vegetables', cost: 250, icon_emoji: '🌿', color_gradient: 'from-lime-500 to-green-500', is_active: true, organizer_id: 1 },
    { id: 105, name: 'NGO Donation (₹50)', description: 'Donate ₹50 to a verified green NGO', cost: 300, icon_emoji: '❤️', color_gradient: 'from-rose-500 to-pink-500', is_active: true, organizer_id: 1 },
    { id: 106, name: 'E-Commerce Voucher ₹150', description: 'Use on eco-friendly product stores', cost: 400, icon_emoji: '🛍️', color_gradient: 'from-violet-500 to-purple-500', is_active: true, organizer_id: 1 }
  ]);
  const [catalogBadges, setCatalogBadges] = useState([
    { id: 101, name: 'First Step', description: 'Complete your first activity', icon_emoji: '🌱', required_credits: 0, organizer_id: 1 },
    { id: 102, name: 'Green Starter', description: 'Earn 100 Green Credits', icon_emoji: '🌿', required_credits: 100, organizer_id: 1 },
    { id: 103, name: 'Eco Warrior', description: 'Earn 500 Green Credits', icon_emoji: '🌳', required_credits: 500, organizer_id: 1 },
    { id: 104, name: 'Champion', description: 'Earn 1,000 Green Credits', icon_emoji: '🏆', required_credits: 1000, organizer_id: 1 }
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      fetchData(token);
    }
  }, []);

  const DEFAULT_REWARDS = [
    { id: 101, name: 'Eco Water Bottle', description: 'Premium BPA-free reusable water bottle', cost: 150, icon_emoji: '💧', color_gradient: 'from-cyan-500 to-blue-500', is_active: true, organizer_id: 1 },
    { id: 102, name: 'Plant a Tree Certificate', description: 'We plant a real tree in your name', cost: 200, icon_emoji: '🌳', color_gradient: 'from-emerald-500 to-teal-500', is_active: true, organizer_id: 1 },
    { id: 103, name: 'Coffee Shop Voucher', description: '₹100 off at partner eco-cafés', cost: 100, icon_emoji: '☕', color_gradient: 'from-amber-500 to-orange-500', is_active: true, organizer_id: 1 },
    { id: 104, name: 'Organic Seeds Kit', description: 'Grow your own herbs & vegetables', cost: 250, icon_emoji: '🌿', color_gradient: 'from-lime-500 to-green-500', is_active: true, organizer_id: 1 },
    { id: 105, name: 'NGO Donation (₹50)', description: 'Donate ₹50 to a verified green NGO', cost: 300, icon_emoji: '❤️', color_gradient: 'from-rose-500 to-pink-500', is_active: true, organizer_id: 1 },
    { id: 106, name: 'E-Commerce Voucher ₹150', description: 'Use on eco-friendly product stores', cost: 400, icon_emoji: '🛍️', color_gradient: 'from-violet-500 to-purple-500', is_active: true, organizer_id: 1 }
  ];

  const DEFAULT_BADGES = [
    { id: 101, name: 'First Step', description: 'Complete your first activity', icon_emoji: '🌱', required_credits: 0, organizer_id: 1 },
    { id: 102, name: 'Green Starter', description: 'Earn 100 Green Credits', icon_emoji: '🌿', required_credits: 100, organizer_id: 1 },
    { id: 103, name: 'Eco Warrior', description: 'Earn 500 Green Credits', icon_emoji: '🌳', required_credits: 500, organizer_id: 1 },
    { id: 104, name: 'Champion', description: 'Earn 1,000 Green Credits', icon_emoji: '🏆', required_credits: 1000, organizer_id: 1 }
  ];

  const fetchData = async (token) => {
    try {
      const resUser = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resUser.ok) {
        const liveUser = await resUser.json();
        setUser(liveUser);
        setProfileName(liveUser.email.split('@')[0]);

        if (liveUser.role === 'organizer') {
          const resAct = await fetch(`${API_BASE_URL}/api/organizer/activities`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resAct.ok) {
            let acts = await resAct.json();
            // Fixed rotation: Chennai appears only at index 4 and 10 (2 slots), rest are spread across India
            const cityRotation = [
              "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
              "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
              "Chennai", "Nagpur", "Indore", "Bhopal", "Goa"
            ];
            const assignCity = (act, idx) => cityRotation[idx % cityRotation.length];
            acts = acts.map((act, idx) => {
              const city = assignCity(act, idx);
              return { ...act, location: `${city}, IN` };
            });
            setActivities(acts.map(a => ({ ...a, status: 'Active', reward: a.credits_reward })));
          }

          // If Organizer, fetch their rewards and badges
          const resRewards = await fetch(`${API_BASE_URL}/api/organizer/rewards`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (resRewards.ok) {
            const data = await resRewards.json();
            setCatalogRewards(data.length > 0 ? data : DEFAULT_REWARDS);
          }

          const resBadges = await fetch(`${API_BASE_URL}/api/organizer/badges`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (resBadges.ok) {
            const data = await resBadges.json();
            setCatalogBadges(data.length > 0 ? data : DEFAULT_BADGES);
          }

          const resLedger = await fetch(`${API_BASE_URL}/api/organizer/ledger`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resLedger.ok) {
            const ledg = await resLedger.json();
            setLedger(ledg);
          }

        } else {
          let liveLedger = [];
          const resAct = await fetch(`${API_BASE_URL}/api/volunteer/activities/nearby`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resAct.ok) {
            let acts = await resAct.json();
            // Fixed rotation: Chennai appears only at index 4 and 10 (2 slots), rest are spread across India
            const cityRotation = [
              "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
              "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
              "Chennai", "Nagpur", "Indore", "Bhopal", "Goa"
            ];
            const assignCity = (act, idx) => cityRotation[idx % cityRotation.length];
            acts = acts.map((act, idx) => {
              const city = assignCity(act, idx);
              return { ...act, location: `${city}, IN` };
            });
            setActivities(acts);
          }

          const resLedger = await fetch(`${API_BASE_URL}/api/volunteer/ledger`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resLedger.ok) {
            const ledg = await resLedger.json();
            liveLedger = ledg;
            setLedger(ledg);
          }

          // Fetch dynamic rewards
          const resRewards = await fetch(`${API_BASE_URL}/api/volunteer/rewards`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (resRewards.ok) {
            const data = await resRewards.json();
            const rewards = data.length > 0 ? data : DEFAULT_REWARDS;
            const redeemedNames = new Set(
              liveLedger
                .filter(entry => entry.transaction_type === 'redeemed' && entry.description?.startsWith('Redeemed reward: '))
                .map(entry => entry.description.replace('Redeemed reward: ', ''))
            );
            setCatalogRewards(rewards);
            setClaimedRewards(rewards.filter(reward => redeemedNames.has(reward.name)).map(reward => reward.id));
          }

          // Fetch dynamic badges
          const resBadges = await fetch(`${API_BASE_URL}/api/volunteer/badges`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (resBadges.ok) {
            const data = await resBadges.json();
            setCatalogBadges(data.length > 0 ? data : DEFAULT_BADGES);
          }

        }
      } else {
        localStorage.clear();
        navigate('/login');
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to the backend Server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleCheckin = async () => {
    if (!checkinQr) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/volunteer/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ qr_string: checkinQr })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.msg || data.detail || "Checked in successfully!");
        setCheckinQr('');
        fetchData(token);
      } else if (res.status === 401) {
        handleSessionExpired();
      } else {
        toast.error(parseApiError(data, "Error checking in"));
      }
    } catch (e) {
      toast.error("Error checking in");
    }
  };

  const handleCreateActivity = async () => {
    if (!newActivity.title) return;
    try {
      const token = localStorage.getItem('token');
      const payload = {
        title: newActivity.title,
        credits_reward: newActivity.credits_reward
      };
      if (newActivity.image_url) {
        payload.image_url = newActivity.image_url;
      }
      const res = await fetch(`${API_BASE_URL}/api/organizer/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setActivities([...activities, { ...data, status: 'Active', reward: data.credits_reward }]);
        setNewActivity({ title: '', credits_reward: 100, image_url: '' });
        toast.success('Activity created successfully!');
      } else if (res.status === 401) {
        handleSessionExpired();
      } else {
        toast.error(parseApiError(data, 'Error creating activity'));
      }
    } catch (e) {
      toast.error("Error creating activity");
    }
  };

  const handleBulkAward = async (activityId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/organizer/activities/${activityId}/bulk-award`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.msg || "Credits awarded!");
        fetchData(token);
      } else if (res.status === 401) {
        handleSessionExpired();
      } else {
        toast.error(parseApiError(data, "Error awarding credits"));
      }
    } catch (e) {
      toast.error("Error awarding credits");
    }
  };

  const handleRedeem = async (reward) => {
    if (claimedRewards.includes(reward.id)) return;
    if ((user.total_credits || 0) < reward.cost) {
      toast.error(`Need ${reward.cost} credits. You have ${Math.floor(user.total_credits || 0)}.`);
      return;
    }
    setClaimingId(reward.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/volunteer/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reward_id: reward.id })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.msg || 'Reward claimed!');
        setClaimedRewards(prev => [...prev, reward.id]);
        fetchData(token);
      } else if (res.status === 401) {
        handleSessionExpired();
      } else {
        toast.error(parseApiError(data, 'Failed to claim reward'));
      }
    } catch (e) {
      toast.error('Error connecting to server');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#f8fffb_0%,#eef8f4_48%,#f8fbff_100%)] flex items-center justify-center">
        <div className="rounded-2xl border border-white/70 bg-white/80 px-6 py-5 text-sm font-medium text-emerald-800 shadow-dashboard backdrop-blur-xl">
          Loading dashboard...
        </div>
      </div>
    );
  }

  const credits = user.total_credits || 0;
  const completedCount = ledger.filter(item => item.transaction_type === 'earned').length;
  const redeemedCount = ledger.filter(item => item.transaction_type === 'redeemed').length;
  const projectedTrees = Math.max(1, Math.floor(credits / 200));
  const activeCount = activities.filter(item => item.is_active !== false).length;

  const renderImpactPanel = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {[
        { label: 'Verified actions', value: completedCount, detail: 'Ledger-backed activity records', icon: CalendarCheck, tone: 'emerald' },
        { label: 'Rewards redeemed', value: redeemedCount, detail: 'Immutable credit deductions', icon: Gift, tone: 'rose' },
        { label: 'Tree equivalent', value: `${projectedTrees}x`, detail: 'Estimated from credit balance', icon: TreePine, tone: 'cyan' },
      ].map(({ label, value, detail, icon: Icon, tone }) => (
        <div key={label} className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-dashboard">
          <div className="flex items-center justify-between">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-cyan-50 text-cyan-700'}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Live</span>
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  );

  // Common components
  const renderStatsCard = () => (
    <div className="flex-[2] rounded-[2rem] glass-panel p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-300/20 rounded-full blur-3xl -mx-10 -my-10 pointer-events-none group-hover:bg-emerald-300/30 transition-colors duration-700" />
      <div className="flex items-center gap-2 text-slate-500 mb-6 font-medium">
        <span>
          {user.role === 'organizer' ? 'Total Credits Distributed' : 'My Earned Credits'}
        </span>
        <CheckCircle className="w-5 h-5 text-emerald-500" />
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-5xl lg:text-7xl font-display font-medium tracking-tight leading-none text-foreground z-10 relative drop-shadow-sm">
          {(user.total_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500 z-10 relative mt-6 font-medium">
        <span>Lifetime Impact</span>
        <div className="flex gap-2">
          <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full shadow-sm border border-emerald-100">+12% this month</span>
        </div>
      </div>

      {/* Premium Background Chart SVG */}
      <div className="absolute bottom-0 left-0 right-0 h-32 w-full opacity-60 z-0">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 30">
          <defs>
            <linearGradient id="chartG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,30 L0,20 C10,15 20,25 30,15 C45,0 60,25 75,10 C85,0 95,5 100,2 L100,30 Z" fill="url(#chartG)" />
          <path d="M0,20 C10,15 20,25 30,15 C45,0 60,25 75,10 C85,0 95,5 100,2" fill="none" stroke="rgb(16 185 129)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );

  // ── BADGES CONFIG ─────────────────────────────────────────────────────────
  const renderBadgesSection = () => {
    // Determine which badges are earned
    const badgesWithStatus = catalogBadges.map(b => ({
      ...b,
      isEarned: (user.total_credits || 0) >= b.required_credits
    }));

    const earnedCount = badgesWithStatus.filter(b => b.isEarned).length;

    return (
      <div className="rounded-2xl bg-background border border-border overflow-hidden shadow-sm animate-in fade-in duration-500">
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-50 to-yellow-50 flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-amber-700">Achievements & Badges</h3>
          <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{earnedCount}/{catalogBadges.length} Earned</span>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {badgesWithStatus.length === 0 && <p className="text-sm text-muted-foreground col-span-4 text-center py-4">No badges available.</p>}
          {badgesWithStatus.map(badge => (
            <div key={badge.id} className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 ${badge.isEarned ? 'bg-gradient-to-b from-amber-50 to-yellow-50 border-amber-200 shadow-md' : 'bg-muted/20 border-border/40 opacity-50 grayscale'}`}>
              {badge.isEarned && <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
              <span className="text-3xl">{badge.icon_emoji}</span>
              <span className="text-xs font-bold text-center text-foreground leading-tight">{badge.name}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-snug">{badge.description}</span>
              {badge.isEarned ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">EARNED</span>
              ) : (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">Needs {badge.required_credits} Credits</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── REWARDS TAB ─────────────────────────────────────────────────────────
  const renderRewardsTab = () => {
    const credits = user.total_credits || 0;

    const handleCreateReward = async () => {
      if (!newReward.name) return;
      setIsSubmitting(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/organizer/rewards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newReward)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success("Reward created!");
          setCatalogRewards([...catalogRewards, data]);
          setNewReward({ name: '', description: '', cost: 100, icon_emoji: '🎁', color_gradient: 'from-emerald-500 to-teal-500' });
        } else if (res.status === 401) {
          handleSessionExpired();
        } else {
          toast.error(parseApiError(data, "Error creating reward"));
        }
      } finally { setIsSubmitting(false); }
    };

    const handleCreateBadge = async () => {
      if (!newBadge.name) return;
      setIsSubmitting(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/organizer/badges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(newBadge)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success("Badge created!");
          setCatalogBadges([...catalogBadges, data]);
          setNewBadge({ name: '', description: '', icon_emoji: '🏆', required_credits: 500 });
        } else if (res.status === 401) {
          handleSessionExpired();
        } else {
          toast.error(parseApiError(data, "Error creating badge"));
        }
      } finally { setIsSubmitting(false); }
    };

    if (user.role === 'organizer') {
      return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Create Custom Reward</h3>
              <div className="flex flex-col gap-3">
                <input type="text" placeholder="Reward Name" value={newReward.name} onChange={e => setNewReward({ ...newReward, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="Description" value={newReward.description} onChange={e => setNewReward({ ...newReward, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-3">
                  <input type="number" placeholder="Cost" value={newReward.cost} onChange={e => setNewReward({ ...newReward, cost: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-1/2" />
                  <input type="text" placeholder="Emoji Icon (e.g. 🎁)" value={newReward.icon_emoji} onChange={e => setNewReward({ ...newReward, icon_emoji: e.target.value })} className="border rounded-lg px-3 py-2 text-sm w-1/2" />
                </div>
                <select value={newReward.color_gradient} onChange={e => setNewReward({ ...newReward, color_gradient: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="from-emerald-500 to-teal-500">Emerald to Teal</option>
                  <option value="from-cyan-500 to-blue-500">Cyan to Blue</option>
                  <option value="from-amber-500 to-orange-500">Amber to Orange</option>
                  <option value="from-rose-500 to-pink-500">Rose to Pink</option>
                  <option value="from-violet-500 to-purple-500">Violet to Purple</option>
                </select>
                <button onClick={handleCreateReward} disabled={isSubmitting} className="mt-2 bg-emerald-600 text-white rounded-lg py-2 font-medium hover:bg-emerald-700">Create Reward</button>
              </div>
            </div>

            <div className="rounded-2xl bg-background border border-border p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Create Achievement Badge</h3>
              <div className="flex flex-col gap-3">
                <input type="text" placeholder="Badge Name" value={newBadge.name} onChange={e => setNewBadge({ ...newBadge, name: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="Description" value={newBadge.description} onChange={e => setNewBadge({ ...newBadge, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-3">
                  <input type="number" placeholder="Required Credits" value={newBadge.required_credits} onChange={e => setNewBadge({ ...newBadge, required_credits: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-1/2" />
                  <input type="text" placeholder="Emoji Icon (e.g. 🏆)" value={newBadge.icon_emoji} onChange={e => setNewBadge({ ...newBadge, icon_emoji: e.target.value })} className="border rounded-lg px-3 py-2 text-sm w-1/2" />
                </div>
                <button onClick={handleCreateBadge} disabled={isSubmitting} className="mt-2 bg-amber-600 text-white rounded-lg py-2 font-medium hover:bg-amber-700">Create Badge</button>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold mt-4">Your Created Rewards</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {catalogRewards.length === 0 && <p className="text-muted-foreground text-sm">No rewards created yet.</p>}
            {catalogRewards.map(reward => (
              <div key={reward.id} className="relative flex flex-col bg-background rounded-2xl border overflow-hidden shadow-sm">
                <div className={`h-28 bg-gradient-to-br ${reward.color_gradient} flex items-center justify-center relative`}>
                  <div className="text-4xl relative z-10">{reward.icon_emoji}</div>
                  <div className="absolute bottom-3 left-3 bg-black/30 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">{reward.cost} Credits</div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-1">{reward.name}</h3>
                  <p className="text-[12px] text-muted-foreground">{reward.description}</p>
                </div>
              </div>
            ))}
          </div>
          {renderBadgesSection()}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Rewards Store</h2>
            <p className="text-sm text-muted-foreground mt-1">Spend your Green Credits on eco-rewards & real-world perks.</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{Math.floor(credits)} Credits</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {catalogRewards.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No rewards available yet. Check back later!</p>}
          {catalogRewards.map(reward => {
            const claimed = claimedRewards.includes(reward.id);
            const canAfford = credits >= reward.cost;
            const isClaiming = claimingId === reward.id;
            return (
              <div key={reward.id} className={`group relative flex flex-col bg-background rounded-2xl border overflow-hidden shadow-sm transition-all duration-300 ${claimed ? 'border-emerald-300 shadow-emerald-100' : canAfford ? 'border-border hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1' : 'border-border opacity-60'}`}>
                <div className={`h-28 bg-gradient-to-br ${reward.color_gradient} flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-white/10" />
                  <div className="text-5xl text-white/90 relative z-10">{reward.icon_emoji}</div>
                  <div className="absolute bottom-3 left-3 bg-black/30 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                    {reward.cost} Credits
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-foreground text-sm mb-1 leading-tight">{reward.name}</h3>
                  <p className="text-[12px] text-muted-foreground flex-1 mb-4">{reward.description}</p>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={claimed || isClaiming || !canAfford}
                    className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${claimed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default' :
                        isClaiming ? 'bg-emerald-500 text-white cursor-wait animate-pulse' :
                          canAfford ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:shadow-emerald-200 hover:shadow-md active:scale-95' :
                            'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                      }`}
                  >
                    {claimed ? '✓ Claimed' : isClaiming ? 'Claiming...' : canAfford ? 'Claim Reward' : `Need ${reward.cost - Math.floor(credits)} more`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {renderBadgesSection()}
      </div>
    );
  };

  const renderActivitiesTable = () => (
    <div className="rounded-2xl bg-background border border-border overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="px-6 py-4 border-b border-border bg-muted/20">
        <h3 className="text-sm font-semibold text-foreground">
          {user.role === 'organizer' ? 'Active Campaigns & Check-ins' : 'Nearby Activities'}
        </h3>
      </div>
      <div className="overflow-x-auto p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground bg-secondary/30">
              <th className="px-6 py-3 font-medium">Activity Title</th>
              <th className="px-6 py-3 font-medium">Reward Credits</th>
              {user.role === 'organizer' && <th className="px-6 py-3 font-medium text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="text-sm">
            {activities.map((act, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">
                  <div>{act.title}</div>
                  {user.role !== 'organizer' && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">By: <span className="font-semibold text-foreground/70">{act.organizer_name || 'Unknown Organization'}</span></div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {user.role !== 'organizer' && act.user_status === 'Finished' ? (
                    <span className="font-mono text-muted-foreground bg-muted/20 px-2 py-1 rounded font-medium">
                      Finished
                    </span>
                  ) : user.role !== 'organizer' && act.user_status === 'Checked In' ? (
                    <span className="font-mono text-yellow-600 bg-yellow-600/10 px-2 py-1 rounded font-medium">
                      Pending Reward
                    </span>
                  ) : (
                    <span className="font-mono text-accent bg-accent/10 px-2 py-1 rounded font-medium">
                      +{user.role === 'organizer' ? act.reward : act.credits_reward}
                    </span>
                  )}
                </td>
                {user.role === 'organizer' && (
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                    {act.user_status && act.user_status !== 'Available' && (
                      <span className={`text-xs font-medium ${act.user_status === 'Up to date' ? 'text-muted-foreground' : 'text-yellow-600'}`}>
                        {act.user_status}
                      </span>
                    )}
                    <button
                      onClick={() => handleBulkAward(act.id)}
                      disabled={act.user_status === 'Up to date' || act.user_status === 'Available'}
                      className="text-xs bg-background border border-border hover:bg-accent hover:text-white hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-3 py-1.5 rounded-full font-medium"
                    >
                      Award Check-ins
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {activities.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center py-8 text-muted-foreground text-sm">
                  No activities found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLedgerTable = () => (
    <div className="rounded-2xl bg-background border border-border overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
      <div className="px-6 py-4 border-b border-border bg-muted/20">
        <h3 className="text-sm font-semibold text-foreground">
          {user.role === 'organizer' ? 'Distributed Credits Ledger' : 'My Transaction Ledger'}
        </h3>
      </div>
      <div className="overflow-x-auto p-0 mt-4 px-6 pb-6">
        <table className="w-full text-left rounded-lg overflow-hidden ring-1 ring-border">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground bg-secondary/30">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {ledger.map((entry, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{new Date(entry.timestamp).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium text-foreground">{entry.description || "Credit transfer"}</td>
                <td className="px-4 py-3 text-right">
                  {user.role === 'organizer' ? (
                    <span className="font-mono px-2 py-1 rounded font-medium text-emerald-600 bg-emerald-600/10">
                      {entry.amount} Distributed
                    </span>
                  ) : (
                    <span className={`font-mono px-2 py-1 rounded font-medium ${entry.transaction_type === 'earned' ? 'text-accent bg-accent/10' : 'text-red-500 bg-red-500/10'}`}>
                      {entry.transaction_type === 'earned' ? '+' : '-'}{entry.amount}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center py-8 text-muted-foreground text-sm">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderActivitiesGrid = () => {

    // Derived state for filtering and sorting
    const filteredAndSortedActivities = activities.filter(act => {
      const matchesSearch = act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.description && act.description.toLowerCase().includes(searchQuery.toLowerCase()));

      let categoryString = "Other";
      const t = act.title.toLowerCase();
      if (t.includes('clean') || t.includes('trash')) categoryString = "Cleaning";
      else if (t.includes('tree') || t.includes('plant') || t.includes('park') || t.includes('beautification')) categoryString = "Environment";
      else if (t.includes('blood') || t.includes('care') || t.includes('visit') || t.includes('support') || t.includes('donation')) categoryString = "Social Impact";

      const matchesCategory = selectedCategory === 'All' || categoryString === selectedCategory;

      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'Highest Reward') return (b.credits_reward || b.reward || 0) - (a.credits_reward || a.reward || 0);
      if (sortBy === 'A-Z') return a.title.localeCompare(b.title);
      return 0; // 'Newest' relies on default order
    });

    const getImageUrl = (act) => {
      if (act.image_url) {
        return act.image_url.startsWith('http') ? act.image_url : `${API_BASE_URL}${act.image_url}`;
      }
      const t = act.title.toLowerCase();
      if (t.includes('tree') || t.includes('plant')) return 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&q=80';
      if (t.includes('lake') || t.includes('water') || t.includes('pool') || t.includes('pond')) return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80';
      if (t.includes('beach') || t.includes('ocean')) return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80';
      if (t.includes('blood') || t.includes('health') || t.includes('medical')) return 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=600&q=80';
      if (t.includes('old-age') || t.includes('care') || t.includes('orphan') || t.includes('visit')) return 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=600&q=80';
      if (t.includes('trash') || t.includes('clean') || t.includes('roadside')) return 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&q=80';
      if (t.includes('park') || t.includes('public') || t.includes('beautification')) return 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=600&q=80';
      if (t.includes('food') || t.includes('hunger') || t.includes('distribute')) return 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&q=80';
      return '/default.jpg';
    };

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 relative z-20">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Explore Impact Campaigns</h2>
            <p className="text-sm text-muted-foreground mt-1">Discover events near you and start earning Green Credits.</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">

            {/* Functional Category Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setIsCategoryDropdownOpen(!isCategoryDropdownOpen); setIsSortDropdownOpen(false); }}
                className="px-4 py-2 text-sm font-medium bg-background border border-border rounded-full shadow-sm hover:bg-muted/40 transition-colors flex items-center gap-2"
              >
                {selectedCategory === 'All' ? 'Categories' : selectedCategory} <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isCategoryDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-44 bg-background border border-border rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95">
                  {['All', 'Cleaning', 'Environment', 'Social Impact', 'Other'].map(cat => (
                    <div
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setIsCategoryDropdownOpen(false); }}
                      className="px-4 py-2 text-sm hover:bg-muted/50 cursor-pointer font-medium text-foreground transition-colors"
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Functional Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => { setIsSortDropdownOpen(!isSortDropdownOpen); setIsCategoryDropdownOpen(false); }}
                className="px-4 py-2 text-sm font-medium bg-background border border-border rounded-full shadow-sm hover:bg-muted/40 transition-colors flex items-center gap-2"
              >
                Sort: {sortBy} <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isSortDropdownOpen && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-background border border-border rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95">
                  {['Newest', 'Highest Reward', 'A-Z'].map(s => (
                    <div
                      key={s}
                      onClick={() => { setSortBy(s); setIsSortDropdownOpen(false); }}
                      className="px-4 py-2 text-sm hover:bg-muted/50 cursor-pointer font-medium text-foreground transition-colors"
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {filteredAndSortedActivities.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-background/50 rounded-3xl border border-border/60 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="font-medium text-[15px]">No active campaigns found near you at the moment.</p>
            <p className="text-sm mt-1 opacity-80">Check back later or change your location filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
            {filteredAndSortedActivities.map((act, i) => {

              return (
                <div key={i} className="group relative flex flex-col bg-background rounded-[1.5rem] overflow-hidden border border-border shadow-sm hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-500">
                  {/* Card Image Wrapper with Premium Animations */}
                  <div className="h-44 w-full relative overflow-hidden bg-muted">
                    <img
                      src={getImageUrl(act)}
                      alt={act.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>

                    {/* Glass Badge */}
                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transform transition-transform group-hover:scale-105">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      {user.role === 'organizer' ? act.reward : act.credits_reward} Credits
                    </div>

                    {/* Image Footer Content */}
                    <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xs font-bold">{act.title.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col relative bg-background">

                    <h3 className="text-[17px] font-semibold text-foreground tracking-tight leading-snug mb-1 group-hover:text-accent transition-colors line-clamp-2">{act.title}</h3>
                    {user.role !== 'organizer' && (
                      <p className="text-[11px] text-muted-foreground font-medium mb-2">
                        By <span className="text-foreground/80">{act.organizer_name || 'Unknown Organization'}</span>
                      </p>
                    )}
                    <p className="text-[13px] text-muted-foreground mb-6 line-clamp-2 leading-relaxed flex-1">
                      {user.role === 'organizer' ? 'Manage your ongoing campaign, approve check-ins, and track engagement.' : 'Join this community activity to make an impact and earn credits seamlessly.'}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/60">
                      <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${act.user_status === 'Finished' ? 'bg-muted text-muted-foreground' :
                          act.user_status === 'Checked In' ? 'bg-yellow-500/15 text-yellow-600' :
                            'bg-accent/10 text-accent'
                        }`}>
                        {(user.role === 'organizer' ? act.status : (act.user_status || 'Available')).toUpperCase()}
                      </span>

                      {user.role === 'organizer' ? (
                        <button onClick={() => { setSelectedActivity(act); setIsModalOpen(true); }} className="text-[12px] font-semibold text-foreground hover:text-accent transition-colors flex items-center gap-1 group/btn">
                          Manage <span className="group-hover/btn:translate-x-0.5 transition-transform">&rarr;</span>
                        </button>
                      ) : (!act.user_status || act.user_status === 'Available') && (
                        <button onClick={() => { setSelectedActivity(act); setIsModalOpen(true); }} className="text-[12px] font-semibold text-foreground hover:text-accent transition-colors flex items-center gap-1 group/btn">
                          Details <span className="group-hover/btn:translate-x-0.5 transition-transform">&rarr;</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderActivityModal = () => {
    if (!selectedActivity || !isModalOpen) return null;

    const act = selectedActivity;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
        <div className="bg-background rounded-3xl border border-border/80 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-br from-accent/30 to-primary/20 h-24 w-full absolute top-0 left-0"></div>

          <div className="p-8 pt-12 relative flex flex-col">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-background/50 hover:bg-background rounded-full flex items-center justify-center transition-colors shadow-sm text-lg font-bold"
            >
              &times;
            </button>

            <div className="w-16 h-16 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center p-1 mb-4 z-10">
              <div className="w-full h-full rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1">{act.title}</h2>
            {user.role !== 'organizer' && (
              <p className="text-sm font-medium text-accent mb-2">By {act.organizer_name || 'Unknown Organization'}</p>
            )}
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{act.description || 'Join this exciting event and start making a significant environmental impact alongside the community!'}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-secondary/40 rounded-xl p-3 border border-border/30">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Location</span>
                <span className="text-sm font-semibold text-foreground">{act.location || 'Chennai, IN'}</span>
              </div>
              <div className="bg-secondary/40 rounded-xl p-3 border border-border/30">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 block">Reward</span>
                <span className="text-sm font-semibold text-accent">+{user.role === 'organizer' ? act.reward : act.credits_reward} Credits</span>
              </div>
            </div>

            {user.role === 'organizer' ? (
              <div className="bg-accent/5 rounded-2xl p-5 border border-accent/20 mb-6 flex flex-col items-center">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">QR Code String</p>
                <div className="bg-background px-4 py-3 rounded-xl border border-border shadow-sm font-mono text-sm w-full text-center select-all">
                  {act.qr_string}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 text-center">
                  Share this string with volunteers to let them check in to this activity.
                </p>
              </div>
            ) : (
              <div className="bg-secondary/40 rounded-2xl p-5 border border-border/40 mb-6">
                <p className="text-xs font-semibold text-foreground mb-3 text-center">Ready to join? Enter the QR code below:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checkinQr}
                    onChange={e => setCheckinQr(e.target.value)}
                    placeholder="Enter QR String provided by organizer"
                    className="flex-1 border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background shadow-sm"
                  />
                  <button
                    onClick={() => {
                      handleCheckin();
                      if (checkinQr) setIsModalOpen(false);
                    }}
                    disabled={!checkinQr}
                    className="rounded-xl bg-accent text-white px-5 py-2 text-sm font-medium shadow-sm hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check In
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/60 pt-5 mt-2">
              <span className={`text-[12px] font-bold px-3 py-1.5 rounded-lg ${act.user_status === 'Finished' ? 'bg-muted text-muted-foreground' :
                  act.user_status === 'Checked In' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-accent/10 text-accent'
                }`}>
                {(user.role === 'organizer' ? act.status : (act.user_status || 'Available')).toUpperCase()}
              </span>

              {user.role === 'organizer' && (
                <button
                  onClick={() => { handleBulkAward(act.id); setIsModalOpen(false); }}
                  disabled={act.user_status === 'Up to date' || act.user_status === 'Available'}
                  className="bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
                >
                  Award Check-ins
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fffb_0%,#eef8f4_48%,#f8fbff_100%)] flex flex-col font-body text-foreground relative overflow-hidden">

      {/* Immersive Animated Background Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.12] mix-blend-multiply"
          style={{ backgroundImage: 'url("/bg-collage.jpg")' }}
        />
        <div className="absolute inset-0 bg-grid-black opacity-[0.04]" />
      </div>
      {/* Top Bar */}
      <div className="h-14 border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 shadow-sm relative z-50">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="" className="h-8 w-auto" />
            <span className="font-display text-xl tracking-tight text-foreground hidden sm:inline">Green Credits</span>
          </Link>

        {activeTab === 'Activities' ? (
          <div className="flex items-center gap-1.5 flex-1 max-w-md mx-6 bg-secondary/50 rounded-full px-4 py-2 text-muted-foreground border border-border/50 transition-colors focus-within:bg-background focus-within:border-accent">
            <Search className="w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search activities..."
              className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>
        ) : (
          <div className="flex-1 max-w-md mx-6 px-4 py-1.5 rounded-full bg-emerald-50/60 border border-emerald-100/80 flex items-center gap-2 text-emerald-700/80 text-xs font-medium backdrop-blur-sm animate-in fade-in duration-300 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="truncate leading-normal">Tip: Join community events to maximize your Green Credits!</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Bell className="text-muted-foreground w-5 h-5 cursor-pointer hover:text-foreground transition-colors" onClick={() => toast('No new notifications', { icon: '🔔' })} />
          <div className="relative">
            <div
              className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold ring-2 ring-background border border-accent/20 cursor-pointer transition-transform hover:scale-105"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              {user.email.substring(0, 2).toUpperCase()}
            </div>

            {/* Profile Popup Card */}
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute top-12 right-0 w-72 bg-background rounded-2xl border border-border/80 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-gradient-to-r from-accent/40 to-primary/40 h-[4.5rem] w-full absolute top-0 left-0"></div>
                  <div className="p-5 pt-10 relative flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-background border-4 border-background flex items-center justify-center shadow-sm relative z-10 mb-3">
                      <div className="w-full h-full rounded-full bg-accent/20 text-accent flex items-center justify-center text-xl font-bold">
                        {user.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="absolute bottom-1 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full"></div>
                    </div>

                    <h3 className="text-[17px] font-semibold text-foreground tracking-tight">{profileName}</h3>
                    <p className="text-[13px] text-muted-foreground mb-5">{user.email}</p>

                    <div className="w-full grid grid-cols-2 gap-2.5 mb-5">
                      <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center border border-border/30">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Role</span>
                        <span className="text-xs font-semibold capitalize text-foreground">{user.role}</span>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center border border-border/30">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Status</span>
                        <span className="text-xs font-semibold text-emerald-600">Active</span>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center border border-border/30">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Rating</span>
                        <span className="text-xs font-semibold text-amber-500 flex items-center gap-0.5">
                          4.9 <Star className="w-[11px] h-[11px] fill-amber-500" />
                        </span>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2.5 flex flex-col items-center justify-center text-center border border-border/30">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Location</span>
                        <span className="text-xs font-semibold text-foreground truncate w-full px-1">{profileLocation}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => { setIsProfileOpen(false); setActiveTab('Settings'); }}
                      className="w-full py-2.5 mb-2.5 text-sm font-medium text-foreground bg-secondary/50 hover:bg-secondary rounded-xl transition-colors border border-border/50"
                    >
                      Account Settings
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100 flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-border/50 p-4 flex-col gap-2 shrink-0 bg-white/40 backdrop-blur-sm hidden md:flex z-10">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-4 px-2">Platform</div>

          {(['Dashboard', 'Activities', 'Insights', 'Ledger', 'Rewards', 'Settings']).map(tab => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center justify-between px-4 py-2.5 my-1 rounded-xl text-sm font-medium cursor-pointer transition-all ${activeTab === tab ? 'bg-white shadow-sm border border-white text-emerald-700' : 'hover:bg-white/50 text-slate-500'}`}
            >
              <span className="flex items-center gap-2">
                {tab === 'Dashboard' && <Sparkles className="w-4 h-4" />}
                {tab === 'Activities' && <Leaf className="w-4 h-4" />}
                {tab === 'Insights' && <BarChart3 className="w-4 h-4" />}
                {tab === 'Ledger' && <CheckCircle className="w-4 h-4" />}
                {tab === 'Rewards' && <Gift className="w-4 h-4 text-emerald-500" />}
                {tab === 'Settings' && <Star className="w-4 h-4" />}
                {tab}
              </span>
              {tab === 'Activities' && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === tab ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                  {activities.length}
                </span>
              )}
              {tab === 'Rewards' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-600 border border-rose-100">
                  8
                </span>
              )}
            </div>
          ))}

          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-6 px-2">Global Features</div>

          <Link to="/map" className="flex items-center px-4 py-2.5 my-1 rounded-xl text-sm font-medium text-slate-500 hover:bg-white/50 hover:text-emerald-700 transition-all">
            Activity Map
          </Link>
          <Link to="/leaderboard" className="flex items-center gap-2 px-4 py-2.5 my-1 rounded-xl text-sm font-medium text-amber-600 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border border-amber-100 shadow-sm transition-all focus-within:ring-2 focus-within:ring-amber-200">
            <Trophy className="w-4 h-4 fill-amber-200" /> Global Leaderboard
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 md:p-10 overflow-auto flex flex-col relative z-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
            <div>
              <h1 className="text-3xl font-display font-medium tracking-tight text-foreground">{activeTab}</h1>
              <p className="text-muted-foreground mt-1">
                You are logged in as a <span className="font-semibold capitalize text-accent">{user.role}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {user.role === 'volunteer' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={checkinQr}
                    onChange={e => setCheckinQr(e.target.value)}
                    placeholder="Enter QR String"
                    className="border border-border rounded-lg px-3 py-2 text-sm max-w-[150px] outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-sm"
                  />
                  <button onClick={handleCheckin} className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent/90 transition-colors">
                    Check In
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'Dashboard' && (
            <div className="flex flex-col gap-6 w-full max-h-[calc(100vh-220px)] overflow-y-auto pr-2 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              {renderImpactPanel()}
              <div className="flex flex-col lg:flex-row gap-6 mb-6">
                {renderStatsCard()}

                {user.role === 'organizer' && (
                  <div className="flex-1 rounded-2xl bg-background border border-border p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
                        <span className="text-sm font-semibold">Quick Actions</span>
                        <Plus className="w-4 h-4 text-muted-foreground cursor-pointer" />
                      </div>
                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          placeholder="Activity Title"
                          value={newActivity.title}
                          onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
                          className="border border-border rounded-md px-3 py-2 text-sm w-full outline-none focus:border-accent"
                        />
                        <input
                          type="number"
                          placeholder="Reward amount"
                          value={newActivity.credits_reward}
                          onChange={e => setNewActivity({ ...newActivity, credits_reward: Number(e.target.value) })}
                          className="border border-border rounded-md px-3 py-2 text-sm w-full outline-none focus:border-accent"
                        />
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-xs font-semibold text-muted-foreground flex justify-between items-center">
                            <span>Activity Image (Optional)</span>
                            {isUploading && <span className="text-accent animate-pulse">Uploading...</span>}
                          </label>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleImageChange}
                            className="border border-border rounded-md px-3 py-1.5 text-xs w-full file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 file:cursor-pointer file:transition-colors outline-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateActivity}
                      className="mt-4 w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg py-2.5 text-sm font-medium transition-colors"
                    >
                      Create Activity & Generate QR
                    </button>
                  </div>
                )}
              </div>
              {renderActivitiesTable()}
            </div>
          )}

          {activeTab === 'Activities' && (
            <div className="flex flex-col gap-6 w-full max-h-[calc(100vh-220px)] overflow-y-auto pr-2 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              {renderActivitiesGrid()}
            </div>
          )}

          {activeTab === 'Rewards' && (
            <div className="flex flex-col gap-6 w-full">
              {renderRewardsTab()}
            </div>
          )}

          {activeTab === 'Insights' && (
            <div className="flex flex-col gap-6 w-full max-h-[calc(100vh-220px)] overflow-y-auto pr-2 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              {renderImpactPanel()}
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-dashboard backdrop-blur-xl">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Impact Momentum</h2>
                      <p className="mt-1 text-sm text-muted-foreground">A practical snapshot of credit flow and platform activity.</p>
                    </div>
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: 'Credit balance', value: Math.min(100, Math.round((credits / 1000) * 100)), caption: `${Math.floor(credits)} credits` },
                      { label: 'Activity availability', value: Math.min(100, activeCount * 12), caption: `${activeCount} active activities` },
                      { label: 'Reward engagement', value: Math.min(100, redeemedCount * 18), caption: `${redeemedCount} redemptions` },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="text-muted-foreground">{item.caption}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-700" style={{ width: `${Math.max(8, item.value)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-dashboard backdrop-blur-xl">
                  <div className="mb-5 flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-lg font-semibold text-foreground">Trust Layer</h2>
                  </div>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <p>Supabase stores the platform data, while the app keeps credit changes ledger-backed and auditable.</p>
                    <p>Google sign-in is routed through Supabase Auth, then exchanged for the Green Credits API token used across protected routes.</p>
                    <button onClick={() => setActiveTab('Ledger')} className="mt-2 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90">
                      Review ledger
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Ledger' && (
            <div className="flex flex-col gap-6 h-full">
              {renderLedgerTable()}
            </div>
          )}

          {activeTab === 'Settings' && (
            <div className="w-full max-w-3xl mx-auto rounded-3xl bg-background border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header Banner */}
              <div className="h-32 w-full bg-gradient-to-r from-accent/30 via-primary/20 to-accent/10 relative">
                <div className="absolute inset-0 bg-black/5"></div>
              </div>

              <div className="px-8 pb-8 relative flex flex-col sm:flex-row gap-8">
                {/* Avatar */}
                <div className="w-28 h-28 rounded-full bg-background border-4 border-background flex items-center justify-center shadow-lg absolute -top-14 left-8 z-10">
                  <div className="w-full h-full rounded-full bg-accent/20 text-accent flex items-center justify-center text-4xl font-bold">
                    {user.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="absolute bottom-2 right-1 w-5 h-5 bg-emerald-500 border-4 border-background rounded-full"></div>
                </div>

                {/* Spacer for avatar on mobile */}
                <div className="mt-16 sm:mt-0 sm:w-28 shrink-0"></div>

                {/* Header Stats */}
                <div className="flex-1 pt-4 sm:pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground">{profileName}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold capitalize text-foreground bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">{user.role}</span>
                    <span className="text-sm font-semibold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-amber-500/20">
                      4.9 <Star className="w-3.5 h-3.5 fill-amber-500" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="px-8 pb-8 pt-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-6">Profile Settings</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Username</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      className="border border-border rounded-xl px-4 py-3 text-sm w-full outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background shadow-sm transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Location</label>
                    <input
                      type="text"
                      value={profileLocation}
                      onChange={e => setProfileLocation(e.target.value)}
                      className="border border-border rounded-xl px-4 py-3 text-sm w-full outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-background shadow-sm transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2 opacity-70">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <input
                      type="text"
                      value={user.email}
                      disabled
                      className="border border-border/50 rounded-xl px-4 py-3 text-sm w-full bg-secondary/30 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex flex-col gap-2 opacity-70">
                    <label className="text-sm font-medium text-foreground">Account Status</label>
                    <div className="border border-border/50 rounded-xl px-4 py-3 text-sm w-full bg-secondary/30 flex items-center">
                      <span className="text-emerald-600 font-medium">Active</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border/60 gap-4">
                  <button
                    onClick={handleLogout}
                    className="w-full sm:w-auto py-2.5 px-6 text-sm font-medium text-red-600 bg-background hover:bg-red-50 rounded-xl transition-colors border border-red-100 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                  <button
                    onClick={() => toast.success('Profile updated successfully!')}
                    className="w-full sm:w-auto py-2.5 px-8 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {renderActivityModal()}
    </div>
  );
};

export default Dashboard;
