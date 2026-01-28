'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Zap, MapPin, Bell, BarChart3, Smartphone, Cloud } from 'lucide-react';
import { useRef } from 'react';

const features = [
  {
    icon: Zap,
    title: 'Real-Time Crash Detection',
    description: 'Detect accidents instantly with AI-powered sensor analysis and machine learning algorithms',
  },
  {
    icon: MapPin,
    title: 'GPS Location Sharing',
    description: 'Precise location data automatically shared with emergency responders for faster dispatch',
  },
  {
    icon: Bell,
    title: 'Emergency Contact Notifications',
    description: 'Instant alerts sent to family members and emergency services with accident details',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Analytics',
    description: 'Comprehensive analytics and reporting for fleet management and safety insights',
  },
  {
    icon: Smartphone,
    title: 'Web Support',
    description: 'Access your safety dashboard anytime, anywhere on any device with full functionality',
  },
  {
    icon: Cloud,
    title: 'Cloud Infrastructure',
    description: 'Secure, scalable cloud-based system with 99.99% uptime guarantee',
  },
];

const Features = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start center', 'end center'],
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 relative overflow-hidden">
      {/* Subtle background glow */}
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [80, -80]) }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-red-100/60 rounded-full filter blur-[120px]"></div>
      </motion.div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Key Features</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need for comprehensive accident detection and emergency response
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)' }}
                className="group relative bg-white rounded-xl p-6 border border-gray-200 hover:border-red-300 transition-all duration-300 shadow-md hover:shadow-xl"
              >
                {/* Icon Container */}
                <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-red-600 to-red-700 text-white shadow-md inline-block">
                  <Icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
};

export default Features;
