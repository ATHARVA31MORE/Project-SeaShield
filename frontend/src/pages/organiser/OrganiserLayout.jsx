import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Zap, BarChart3, Calendar, TrendingUp, MessageSquare, Bot, LogOut, User } from 'lucide-react';
import { auth, db } from '../../utils/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

const TabButton = ({ to, label, icon: Icon, badge, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center justify-between px-4 py-3 rounded-lg transition-all group ${
        isActive
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`
    }
  >
    <div className="flex items-center space-x-3">
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </div>
    {badge && (
      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
        {badge}
      </span>
    )}
  </NavLink>
);


const OrganiserLayout = () => {
  const [organizerName, setOrganizerName] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
  const fetchOrganizerName = async () => {
    if (auth.currentUser?.uid) {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setOrganizerName(docSnap.data().displayName || 'Organizer');
      } else {
        setOrganizerName('Organizer');
      }
    }
  };

  fetchOrganizerName();
}, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getActiveTab = () => {
  const path = location.pathname;

  if (path === '/organiser') return 'dashboard';
  if (path.startsWith('/organiser/events')) return 'events';
  if (path.startsWith('/organiser/analytics')) return 'analytics';
  if (path.startsWith('/organiser/messaging')) return 'messaging';
  if (path.startsWith('/organiser/templates')) return 'templates';

  return '';
};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                <Zap className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">BeachGuard Organizer</h1>
                <p className="text-sm text-gray-500">Manage cleanup events & volunteers</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <User size={16} />
                <span className="text-sm font-medium capitalize">
  {organizerName}
</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <nav className="space-y-2">
                <TabButton to="/organiser" label="Dashboard" icon={BarChart3} end />
                <TabButton to="/organiser/events" label="Events" icon={Calendar} />
                <TabButton to="/organiser/analytics" label="Analytics" icon={TrendingUp} />
                <TabButton to="/organiser/messaging" label="Messaging" icon={MessageSquare} />
                <TabButton to="/organiser/templates" label="Content Templates" icon={Bot} />
              </nav>
              
              {/* Quick Stats in Sidebar */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Active Events</span>
                    <span className="font-medium text-blue-600">-</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Volunteers</span>
                    <span className="font-medium text-green-600">-</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">This Month</span>
                    <span className="font-medium text-purple-600">-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganiserLayout;