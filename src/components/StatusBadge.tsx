import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'pending' | 'complete' | 'error';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    online: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      label: 'Online',
      dot: 'bg-green-500'
    },
    offline: {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      label: 'Offline',
      dot: 'bg-gray-500'
    },
    pending: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      label: 'Pending',
      dot: 'bg-yellow-500'
    },
    complete: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      label: 'Complete',
      dot: 'bg-blue-500'
    },
    error: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      label: 'Error',
      dot: 'bg-red-500'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={twMerge(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      config.bg,
      config.text,
      className
    )}>
      <motion.span
        className={twMerge("w-1.5 h-1.5 rounded-full", config.dot)}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      {config.label}
    </span>
  );
}