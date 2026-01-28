'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';

const HeroSection = () => {
  const ref = useRef(null);
  const router = useRouter();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero Background Image with Overlay */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 -z-10"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')`,
          }}
        />
        {/* Light gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-white/90 to-white/95" />
        
        {/* Subtle accent glow */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-100/40 rounded-full filter blur-[120px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-100/30 rounded-full filter blur-[120px]"></div>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-8">
          <span className="inline-block px-4 py-2 bg-white/80 text-red-600 rounded-lg text-sm font-semibold border border-red-200 backdrop-blur-sm shadow-sm">
            AI-Powered Safety Technology
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight drop-shadow-sm"
        >
          Real-Time Accident{' '}
          <span className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent">
            Detection
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.h2
          variants={itemVariants}
          className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-8"
        >
          Faster Emergency Response
        </motion.h2>

        {/* Subtext */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Detect accidents in milliseconds with AI-powered technology. Automatically alert emergency services and loved ones with precise GPS location.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center items-center mb-16"
        >
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(220, 38, 38, 0.25)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/auth/signup")}
            className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold flex items-center gap-2 hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;
