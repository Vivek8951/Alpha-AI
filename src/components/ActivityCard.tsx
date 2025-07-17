import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, HardDrive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'upload' | 'download' | 'storage';
  title: string;
  description: string;
  timestamp: string;
}

const iconMap = {
  upload: Upload,
  download: Download,
  storage: HardDrive
};

interface ActivityCardProps {
  activities: Activity[];
}

export function ActivityCard({ activities }: ActivityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
        
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
                  className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg"
                  >
                    <Icon className="w-5 h-5 text-purple-600" />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {activity.description}
                    </p>
                  </div>

                  <time className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </time>
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
      </div>
    </motion.div>
  );
}