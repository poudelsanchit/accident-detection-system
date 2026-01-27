'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { useRef } from 'react';

const HeroSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Parallax Background Layers */}
      <motion.div
        style={{ y, opacity }}
        className="absolute inset-0 -z-10"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-linear-to-br from-white via-red-50 to-white" />

        {/* Red Accent Shapes */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-4000"></div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-8">
          <span className="inline-block px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-semibold border border-red-200/50 backdrop-blur-sm">
            🚨 AI-Powered Safety Technology
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-6xl sm:text-7xl lg:text-8xl font-black text-gray-900 mb-6 leading-tight tracking-tight"
        >
          Real-Time Accident{' '}
          <span className="bg-linear-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent">
            Detection.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.h2
          variants={itemVariants}
          className="text-3xl sm:text-4xl font-bold text-gray-700 mb-8"
        >
          Faster Emergency Response.
        </motion.h2>

        {/* Subtext */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Detect accidents in milliseconds with AI-powered technology. Automatically alert emergency services and loved ones with precise GPS location.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(220, 38, 38, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-linear-to-r from-red-600 to-red-700 text-white rounded-full font-bold flex items-center gap-2 hover:from-red-700 hover:to-red-800 transition-all shadow-xl"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-white text-red-600 rounded-full font-bold flex items-center gap-2 border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
          >
            <Play className="w-5 h-5" />
            View Demo
          </motion.button>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row justify-center items-center gap-8 text-sm text-gray-700 font-semibold"
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
            <span>99.8% Detection Accuracy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
            <span>&lt;100ms Response Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
            <span>24/7 Monitoring</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
