'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Zap, MapPin, Bell, BarChart3, Smartphone, Cloud } from 'lucide-react';
import { useRef } from 'react';
import { Globe } from '@/core/components/ui/globe';

const features = [
  {
    icon: Zap,
    title: 'Real-Time Crash Detection',
    description: 'Detect accidents instantly with AI-powered sensor analysis and machine learning algorithms',
    color: 'from-red-600 to-red-700',
  },
  {
    icon: MapPin,
    title: 'GPS Location Sharing',
    description: 'Precise location data automatically shared with emergency responders for faster dispatch',
    color: 'from-red-700 to-red-800',
  },
  {
    icon: Bell,
    title: 'Emergency Contact Notifications',
    description: 'Instant alerts sent to family members and emergency services with accident details',
    color: 'from-red-600 to-red-700',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Analytics',
    description: 'Comprehensive analytics and reporting for fleet management and safety insights',
    color: 'from-red-700 to-red-800',
  },
  {
    icon: Smartphone,
    title: 'Mobile + Web Support',
    description: 'Access your safety dashboard anytime, anywhere on any device with full functionality',
    color: 'from-red-600 to-red-700',
  },
  {
    icon: Cloud,
    title: 'Cloud Infrastructure',
    description: 'Secure, scalable cloud-based system with 99.99% uptime guarantee',
    color: 'from-red-700 to-red-800',
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
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-linear-to-b from-red-50 to-white relative overflow-hidden">
      {/* Parallax Background */}
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [80, -80]) }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
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
          <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6">Key Features</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Everything you need for comprehensive accident detection and emergency response
          </p>
        </motion.div>

        {/* Features Grid with Globe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Globe Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative h-96 lg:h-full min-h-96"
          >
            <div className="absolute inset-0 bg-linear-to-br from-red-100 to-red-50 rounded-3xl blur-2xl opacity-40"></div>
            <div className="relative h-full flex items-center justify-center">
              <Globe className="w-full h-full" />
            </div>
          </motion.div>

          {/* Features List */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ x: 8 }}
                  className="group relative bg-white rounded-2xl p-6 border border-red-100 shadow-lg hover:shadow-2xl hover:border-red-300 transition-all duration-300 backdrop-blur-xl"
                >
                  {/* Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-linear-to-r from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />

                  <div className="relative flex items-start gap-4">
                    {/* Icon Container */}
                    <div className={`shrink-0 p-3 rounded-xl bg-linear-to-br ${feature.color} text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Feature Highlights Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { stat: '99.8%', label: 'Accuracy', icon: '🎯' },
            { stat: '<100ms', label: 'Response Time', icon: '⚡' },
            { stat: '24/7', label: 'Monitoring', icon: '👁️' },
          ].map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -8 }}
              className="bg-white rounded-2xl p-8 border border-red-100 shadow-lg hover:shadow-2xl transition-all text-center backdrop-blur-xl"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <div className="text-4xl font-black text-red-600 mb-2">{item.stat}</div>
              <div className="text-gray-600 font-semibold">{item.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
