'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Radar, Brain, AlertCircle, Ambulance } from 'lucide-react';
import { useRef } from 'react';

const steps = [
  {
    icon: Radar,
    title: 'Detect',
    description: 'AI sensors detect sudden impacts and abnormal vehicle movements in real-time',
  },
  {
    icon: Brain,
    title: 'Analyze',
    description: 'Machine learning algorithms analyze sensor data to confirm accident severity',
  },
  {
    icon: AlertCircle,
    title: 'Alert',
    description: 'Instant notifications sent to emergency contacts and local authorities',
  },
  {
    icon: Ambulance,
    title: 'Respond',
    description: 'Emergency services dispatched with precise GPS location and accident details',
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
        staggerChildren: 0.12,
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
    <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      {/* Subtle background glow */}
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [50, -50]) }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-100/60 rounded-full filter blur-[120px]"></div>
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
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
                whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)' }}
                className="relative group"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 -right-3 w-6 h-0.5 bg-gradient-to-r from-red-400 to-transparent"></div>
                )}

                {/* Card */}
                <div className="bg-white rounded-xl p-8 h-full border border-gray-200 hover:border-red-300 transition-all duration-300 shadow-md hover:shadow-xl">
                  {/* Step Number */}
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="mb-6 pt-4">
                    <Icon className="w-12 h-12 text-red-600" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

       
      </div>
    </section>
  );
};

export default HowItWorks;
