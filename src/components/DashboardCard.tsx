import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface DashboardCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subValue?: string;
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function DashboardCard({ icon: Icon, title, value, subValue, className, trend }: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={twMerge(
        "relative overflow-hidden bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-500/5 before:via-transparent before:to-blue-500/5",
        "hover:before:opacity-100 before:opacity-0 before:transition-opacity",
        className
      )}
    >
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl"
          >
            <Icon className="w-6 h-6 text-purple-600" />
          </motion.div>
          {trend && (
            <div className={`flex items-center text-sm font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <motion.span
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center"
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </motion.span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <motion.h3
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm font-medium text-gray-500"
          >
            {title}
          </motion.h3>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-semibold text-gray-900"
          >
            {value}
          </motion.div>
          {subValue && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              className="text-sm text-gray-500"
            >
              {subValue}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}