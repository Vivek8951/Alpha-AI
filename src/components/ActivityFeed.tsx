import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, HardDrive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'upload' | 'download' | 'storage';
  title: string;
  description: string;
  timestamp: string;
}

const iconMap = {
  upload: Upload,
  download: Download,
  storage: HardDrive,
};

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="space-y-4">
      <AnimatePresence>
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type];
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50/80 transition-colors"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2.5 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg group-hover:from-purple-100 group-hover:to-blue-100 transition-colors"
              >
                <Icon className="w-5 h-5 text-purple-600" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-medium text-gray-900 truncate"
                >
                  {activity.title}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-gray-500 truncate"
                >
                  {activity.description}
                </motion.p>
              </div>

              <motion.time
                dateTime={activity.timestamp}
                className="flex-shrink-0 text-xs text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
              >
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </motion.time>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {activities.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No recent activity</p>
        </motion.div>
      )}
    </div>
  );
}