import React from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ icon: Icon, title, value, subValue, trend }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl"
          >
            <Icon className="w-6 h-6 text-purple-600" />
          </motion.div>
          
          {trend && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center space-x-1 text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span>{trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%</span>
            </motion.div>
          )}
        </div>

        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className="text-sm font-medium text-gray-600 mb-1"
        >
          {title}
        </motion.h3>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900"
        >
          {value}
        </motion.div>

        {subValue && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="text-sm text-gray-500 mt-1"
          >
            {subValue}
          </motion.p>
        )}
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-100 rounded-2xl transition-colors duration-300" />
    </motion.div>
  );
}