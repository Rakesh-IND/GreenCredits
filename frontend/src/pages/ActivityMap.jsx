import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, ArrowLeft, Navigation, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';

// Fix for default Leaflet icon paths in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const ActivityMap = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Universal endpoint — works for both volunteers and organizers
      const res = await fetch(`${API_BASE_URL}/api/activities/all`, { headers });
      
      if (res.ok) {
        let data = await res.json();
        // Fixed rotation matching Dashboard.jsx exactly:
        // Chennai only appears at positions 4 and 10 (2 slots), rest spread across India
        const cityRotation = [
          "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
          "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
          "Chennai", "Nagpur", "Indore", "Bhopal", "Goa"
        ];
        const indianCities = {
          "Mumbai":    [19.0760, 72.8777],
          "Delhi":     [28.7041, 77.1025],
          "Bangalore": [12.9716, 77.5946],
          "Hyderabad": [17.3850, 78.4867],
          "Chennai":   [13.0827, 80.2707],
          "Kolkata":   [22.5726, 88.3639],
          "Pune":      [18.5204, 73.8567],
          "Ahmedabad": [23.0225, 72.5714],
          "Jaipur":    [26.9124, 75.7873],
          "Lucknow":   [26.8467, 80.9462],
          "Nagpur":    [21.1458, 79.0882],
          "Indore":    [22.7196, 75.8577],
          "Bhopal":    [23.2599, 77.4126],
          "Goa":       [15.2993, 74.1240]
        };

        data = data.map((act, idx) => {
           const cityName = cityRotation[idx % cityRotation.length];
           const coords = indianCities[cityName];
           const lat = coords[0] + (Math.random() * 0.06 - 0.03);
           const lng = coords[1] + (Math.random() * 0.06 - 0.03);
           return { ...act, lat, lng, location: `${cityName}, IN` };
        });
        setActivities(data);
      } else {
        toast.error("Failed to load map data");
      }
    } catch (e) {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Immersive Animated Background Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-[10]">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[60%] rounded-full bg-emerald-400/30 blur-[120px] animate-pulse-slow mix-blend-multiply" />
        <div className="absolute top-[20%] -right-[10%] w-[45%] h-[55%] rounded-full bg-teal-400/30 blur-[100px] animate-pulse-slow mix-blend-multiply" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px] animate-pulse-slow mix-blend-multiply" style={{ animationDelay: '4s' }} />
        <div className="absolute inset-0 bg-grid-black opacity-[0.04]" />
      </div>
      {/* Top Interface Bar */}
      <div className="absolute top-0 inset-x-0 z-[1000] p-4 flex justify-between items-start pointer-events-none">
        <Link to="/dashboard" className="pointer-events-auto inline-flex items-center gap-2 bg-white/80 backdrop-blur-xl border border-white/70 shadow-lg px-5 py-2.5 rounded-full text-sm font-medium text-slate-700 hover:text-emerald-700 hover:bg-white transition-all transform hover:scale-105">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="bg-white/80 backdrop-blur-xl border border-white/70 shadow-lg px-5 py-3 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-800 leading-tight">Global Impact Map</h1>
              <p className="text-xs text-slate-500 font-medium">{activities.length} active zones</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-full w-full flex items-center justify-center bg-slate-50">
          <div className="animate-spin w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="flex-1 w-full relative z-0">
          <MapContainer 
            center={[20.5937, 78.9629]} 
            zoom={5} 
            scrollWheelZoom={true} 
            className="h-full w-full"
            minZoom={2}
            maxBounds={[[-90, -180], [90, 180]]}
            maxBoundsViscosity={1.0}
          >
            {/* Standard OpenStreetMap Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              noWrap={true}
            />
            
            {activities.map(act => (
              <Marker key={act.id} position={[act.lat, act.lng]}>
                <Popup className="premium-popup">
                  <div className="p-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {act.credits_reward} CR
                      </span>
                      {act.user_status === 'Checked In' && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mb-1">{act.title}</h3>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{act.description}</p>
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-600 border-t pt-2">
                      <Navigation className="w-3 h-3 text-emerald-500" /> {act.location}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
      
      <style>{`
        .leaflet-container {
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
        }
        .premium-popup .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .premium-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95);
        }
        .leaflet-control-attribution {
          background: rgba(255, 255, 255, 0.5) !important;
          backdrop-filter: blur(4px);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default ActivityMap;
