import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { FileText, LayoutDashboard, Users, HardDrive, User, Menu } from 'lucide-react';
import { WalletConnect } from './Walletconnect';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

function Layout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dashboard/providers', icon: HardDrive, label: 'Providers' },
    { path: '/dashboard/files', icon: FileText, label: 'Files' },
    { path: '/dashboard/profile', icon: User, label: 'Profile' },
  ];

  const sidebarVariants = {
    hidden: { x: -300, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 30
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 30
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white shadow-md text-gray-600 hover:text-purple-600 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        <motion.nav
          initial="hidden"
          animate="visible"
          variants={sidebarVariants}
          className={twMerge(
            "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transition-transform lg:translate-x-0",
            !isMobileMenuOpen && "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                Alpha Storage
              </h1>
            </div>
            
            <div className="space-y-2">
              {navItems.map(({ path, icon: Icon, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    twMerge(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-purple-50 text-purple-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </motion.nav>
      </AnimatePresence>

      {/* Main Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 backdrop-blur-sm bg-opacity-90">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800">
                {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
              <WalletConnect />
            </div>
          </div>
        </header>

        <motion.main
          initial="hidden"
          animate="visible"
          variants={contentVariants}
          className="p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

export default Layout;