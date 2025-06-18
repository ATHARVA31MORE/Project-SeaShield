import React from 'react';
import { Calendar, MapPin, Users, Award, Plus, Bot, BarChart3, Mail, Download, Eye, Edit3, Share2 } from 'lucide-react';
import StatCard from './StatCard';
import EventCard from './EventCard';

const Dashboard = ({ events, checkins, volunteers, setShowEventModal, navigateToTab }) => {
  const stats = [
    { 
      title: 'Total Events', 
      value: events?.length || 0, 
      color: 'bg-blue-500', 
      icon: Calendar 
    },
    { 
      title: 'Active Volunteers', 
      value: volunteers?.length || 0, 
      color: 'bg-green-500', 
      icon: Users 
    },
    { 
      title: 'Total Check-Ins', 
      value: checkins?.length || 0, 
      color: 'bg-purple-500', 
      icon: Eye 
    },
    { 
      title: 'Upcoming Events', 
      value: events?.filter(e => new Date(e?.date) >= new Date() && e?.status !== 'cancelled').length || 0, 
      color: 'bg-orange-500', 
      icon: MapPin 
    },
  ];

  const dashboardEvents = events
    ?.filter(event => event?.status !== 'cancelled' && new Date(event?.date) >= new Date())
    ?.slice(0, 3) || [];

  const handleQuickAction = (action) => {
    if (navigateToTab) {
      navigateToTab(action);
    }
  };

  const fetchAllData = async () => {
  await fetchEvents();
  await fetchCheckins();
};

  const handleEdit = (event) => {
  setEditingEvent(event);
  setShowForm(true);
};

const handleView = (event) => {
  alert(`Viewing event: ${event.title}`);
};

const handleShare = (event) => {
  alert(`Share link copied for: ${event.title}`);
};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
        <button 
          onClick={() => setShowEventModal && setShowEventModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg"
        >
          <Plus size={20} />
          <span>Create Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {dashboardEvents.length > 0 ? dashboardEvents.map(event => (
              <EventCard 
              key={event.id} 
              event={event} 
              checkins={checkins || []} 
              onEdit={handleEdit} 
              onView={handleView} 
              onShare={handleShare} 
              fetchAllData={fetchAllData}
            />

            )) : (
              <p className="text-gray-500 text-center py-8">No upcoming events</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleQuickAction('templates')}
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Bot className="text-blue-600 mb-2" size={24} />
              <span className="text-sm font-medium text-blue-800">Content Templates</span>
            </button>
            <button 
              onClick={() => handleQuickAction('analytics')}
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <BarChart3 className="text-green-600 mb-2" size={24} />
              <span className="text-sm font-medium text-green-800">Analytics</span>
            </button>
            <button 
              onClick={() => handleQuickAction('messaging')}
              className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Mail className="text-purple-600 mb-2" size={24} />
              <span className="text-sm font-medium text-purple-800">Send Messages</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <Download className="text-orange-600 mb-2" size={24} />
              <span className="text-sm font-medium text-orange-800">Export Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;