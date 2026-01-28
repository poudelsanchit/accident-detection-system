'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { TrendingDown, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { useRef } from 'react';

const benefits = [
  {
    icon: TrendingDown,
    title: 'Faster Response Time',
    description: 'Reduce emergency response time by up to 60% with instant accident detection and location sharing',
    stat: '60%',
    statLabel: 'Faster Response',
    color: 'from-red-600 to-red-700',
  },
  {
    icon: Shield,
    title: 'Reduced Fatalities',
    description: 'Early intervention and rapid medical attention significantly improve survival rates',
    stat: '40%',
    statLabel: 'Fewer Fatalities',
    color: 'from-red-700 to-red-800',
  },
  {
    icon: Zap,
    title: 'Reliable AI Detection',
    description: 'Industry-leading 99.8% accuracy with continuous machine learning improvements',
    stat: '99.8%',
    statLabel: 'Accuracy Rate',
    color: 'from-red-600 to-red-700',
  },
  {
    icon: CheckCircle2,
    title: 'Easy Integration',
    description: 'Seamless integration with existing vehicle systems and emergency services infrastructure',
    stat: '5min',
    statLabel: 'Setup Time',
    color: 'from-red-700 to-red-800',
  },
];

const Benefits = () => {
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
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      {/* Parallax Background */}
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [60, -60]) }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-red-50 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
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
          <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6">Why Choose SafeDetect</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Proven results that save lives and improve emergency response outcomes
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20"
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(220, 38, 38, 0.15)' }}
                className="group relative bg-white rounded-2xl p-8 border border-red-100 shadow-lg hover:shadow-2xl transition-all duration-300 backdrop-blur-xl overflow-hidden"
              >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-linear-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative flex gap-6">
                  {/* Icon */}
                  <div className="shrink-0">
                    <div className={`flex items-center justify-center h-16 w-16 rounded-xl bg-linear-to-br ${benefit.color} text-white shadow-lg`}>
                      <Icon className="h-8 w-8" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">{benefit.description}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-red-600">{benefit.stat}</span>
                      <span className="text-sm text-gray-600 font-semibold">{benefit.statLabel}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Technology Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-linear-to-r from-red-50 via-white to-red-50 rounded-3xl p-12 border border-red-200 shadow-xl backdrop-blur-xl"
        >
          <h3 className="text-3xl font-black text-gray-900 mb-10 text-center">Technology Stack</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: 'AI/ML', desc: 'Advanced neural networks', icon: '🧠' },
              { label: 'IoT Sensors', desc: 'Real-time data collection', icon: '📡' },
              { label: 'GPS', desc: 'Precise location tracking', icon: '🗺️' },
            ].map((tech, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
                className="text-center p-6 bg-white rounded-2xl border border-red-100 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="text-4xl mb-3">{tech.icon}</div>
                <div className="font-bold text-lg text-gray-900 mb-1">{tech.label}</div>
                <div className="text-sm text-gray-600">{tech.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Benefits;
