import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Leaf, ShieldCheck } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-body p-6 md:p-12">
      <nav className="flex items-center justify-between mb-16">
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity">
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="" className="h-10 w-auto" />
          <span className="font-display text-2xl tracking-tight text-foreground">Green Credits</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto w-full text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-display font-medium text-foreground tracking-tight mb-6"
        >
          Our mission is to make <span className="text-accent italic font-display">volunteering</span> rewarding.
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-muted-foreground w-full max-w-2xl mx-auto leading-relaxed mb-16"
        >
          GreenCredits bridges the gap between organizations looking for passionate 
          volunteers and individuals looking to make a measurable real-world impact.
        </motion.p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto mt-8 w-full">
        {/* Organizer Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 bg-secondary/30 rounded-3xl p-8 border border-border flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">For Organizers</h2>
          <p className="text-muted-foreground leading-relaxed">
            Create impactful campaigns, securely check-in volunteers using dynamic QR strings, 
            and instantly distribute Green Credits to acknowledge their hard work.
          </p>
        </motion.div>

        {/* Volunteer Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 bg-accent/5 rounded-3xl p-8 border border-accent/20 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center mb-6">
            <Leaf className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">For Volunteers</h2>
          <p className="text-muted-foreground leading-relaxed">
            Find nearby environmental initiatives, participate actively, and earn Green Credits 
            that reflect your lifetime commitment to sustainability.
          </p>
        </motion.div>
      </div>
      
      <div className="flex flex-col items-center justify-center mt-20 mb-8 max-w-2xl mx-auto text-center">
        <ShieldCheck className="w-8 h-8 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          Built with security and scalability. Utilizing robust RBAC frameworks and cryptographic financial-grade ledgers.
        </p>
      </div>
    </div>
  );
};

export default About;
