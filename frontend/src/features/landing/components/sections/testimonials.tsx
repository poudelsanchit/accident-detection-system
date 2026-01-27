'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Star } from 'lucide-react';
import { useRef } from 'react';

const testimonials = [
  {
    name: 'Chief Michael Rodriguez',
    role: 'Fire Chief, Metro Emergency Services',
    content: 'SafeDetect has revolutionized our response capabilities. We\'re reaching accident scenes 40% faster than before.',
    avatar: '👨‍🚒',
    rating: 5,
  },
  {
    name: 'Dr. Sarah Chen',
    role: 'Emergency Medicine Director, City Hospital',
    content: 'The early notification system gives us critical minutes to prepare. It\'s literally saving lives.',
    avatar: '👩‍⚕️',
    rating: 5,
  },
  {
    name: 'James Patterson',
    role: 'Fleet Manager, Logistics Corp',
    content: 'Implemented across our 500-vehicle fleet. The safety improvements and insurance savings are remarkable.',
    avatar: '👨‍💼',
    rating: 5,
  },
  {
    name: 'Officer Lisa Thompson',
    role: 'Traffic Safety Officer, State Police',
    content: 'The accuracy is impressive. False positives are minimal, and the location data is incredibly precise.',
    avatar: '👮‍♀️',
    rating: 5,
  },
];

const Testimonials = () => {
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
        style={{ y: useTransform(scrollYProgress, [0, 1], [100, -100]) }}
        className="absolute inset-0 -z-10"
      >
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
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
          <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6">Trusted by Emergency Professionals</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Hear from the experts who rely on SafeDetect every day
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(220, 38, 38, 0.15)' }}
              className="group relative bg-white rounded-2xl p-8 border border-red-100 shadow-lg hover:shadow-2xl transition-all duration-300 backdrop-blur-xl overflow-hidden"
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-linear-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-red-500 text-red-500" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-700 mb-6 leading-relaxed italic text-lg">"{testimonial.content}"</p>

                {/* Author */}
                <div className="flex items-center gap-4 pt-4 border-t border-red-100">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            { stat: '500+', label: 'Emergency Agencies', icon: '🚨' },
            { stat: '2M+', label: 'Lives Protected', icon: '❤️' },
            { stat: '98%', label: 'Satisfaction Rate', icon: '⭐' },
          ].map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(220, 38, 38, 0.2)' }}
              className="text-center p-8 bg-linear-to-br from-red-600 to-red-700 rounded-2xl border border-red-500 shadow-xl text-white"
            >
              <div className="text-5xl mb-4">{item.icon}</div>
              <div className="text-4xl font-black mb-2">{item.stat}</div>
              <div className="text-red-100 font-semibold">{item.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
