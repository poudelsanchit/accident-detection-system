'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Radar, Brain, AlertCircle, Ambulance } from 'lucide-react';
import { useRef } from 'react';

const steps = [
  {
    icon: Radar,
    title: 'Detect',
    description: 'AI sensors detect sudden impacts and abnormal vehicle movements in real-time',
    color: 'from-red-100 to-red-50',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
  {
    icon: Brain,
    title: 'Analyze',
    description: 'Machine learning algorithms analyze sensor data to confirm accident severity',
    color: 'from-red-50 to-white',
    iconColor: 'text-red-700',
    borderColor: 'border-red-100',
  },
  {
    icon: AlertCircle,
    title: 'Alert',
    description: 'Instant notifications sent to emergency contacts and local authorities',
    color: 'from-red-100 to-red-50',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
  {
    icon: Ambulance,
    title: 'Respond',
    description: 'Emergency services dispatched with precise GPS location and accident details',
    color: 'from-red-50 to-white',
    iconColor: 'text-red-700',
    borderColor: 'border-red-100',
  },
];

const HowItWorks = () => {
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
        staggerChildren: 0.15,
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
    <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      {/* Parallax Background */}
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [50, -50]) }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-50 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
      </motion.div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Our intelligent system detects accidents and coordinates emergency response in seconds
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -12, boxShadow: '0 20px 40px rgba(220, 38, 38, 0.15)' }}
                className="relative group"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-24 -right-3 w-6 h-1 bg-linear-to-r from-red-400 to-transparent"></div>
                )}

                {/* Card with Glassmorphism */}
                <div className={`bg-linear-to-br ${step.color} rounded-2xl p-8 h-full backdrop-blur-xl border ${step.borderColor} shadow-lg hover:shadow-2xl transition-all duration-300`}>
                  {/* Step Number */}
                  <div className="absolute -top-5 -left-5 w-12 h-12 bg-linear-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center font-black text-white text-lg shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="mb-6 pt-4">
                    <Icon className={`w-14 h-14 ${step.iconColor}`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-700 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Timeline Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-10 border border-red-100 shadow-xl backdrop-blur-xl"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Response Timeline</h3>
          <div className="space-y-6">
            {[
              { time: '0ms', event: 'Impact Detected', icon: '📍' },
              { time: '50ms', event: 'Data Analysis', icon: '🧠' },
              { time: '100ms', event: 'Alerts Sent', icon: '🚨' },
              { time: '2-5min', event: 'Emergency Services Arrive', icon: '🚑' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-6"
              >
                <div className="text-3xl">{item.icon}</div>
                <div className="w-24 font-bold text-red-600 text-lg">{item.time}</div>
                <div className="flex-1 h-1.5 bg-linear-to-r from-red-400 to-red-200 rounded-full"></div>
                <div className="text-gray-700 font-semibold min-w-fit">{item.event}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
