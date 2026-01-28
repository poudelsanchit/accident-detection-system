'use client';

import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import HeroSection from './sections/hero';
import HowItWorks from './sections/how-it-works';
import Features from './sections/features';
import Benefits from './sections/benefits';
import CTA from './sections/cta';
import Footer from './sections/footer';
import { useRouter } from 'next/navigation';

const LandingPage = () => {
    const router = useRouter()
    return (
        <div className="min-h-screen bg-gray-50 overflow-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-gray-200/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-md">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg text-gray-900">SafeDetect</span>
                    </motion.div>
                    <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg"
                        onClick={() => { router.push("/auth/signup") }}
                    >
                        Get Started
                    </motion.button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-16">
                <HeroSection />
                <HowItWorks />
                <Features />
                <Benefits />
                <CTA />
            </main>

            <Footer />
        </div>
    );
};

export default LandingPage;
