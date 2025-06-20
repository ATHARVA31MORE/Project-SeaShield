import React, { useState } from 'react';
import { Calendar, MapPin, Users, Eye } from 'lucide-react';
import StatCard from './StatCard';
import EventCard from './EventCard';
import EventViewModal from './EventViewModal';

const Dashboard = ({ events, checkins, volunteers, setShowEventModal, navigateToTab }) => {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Ensure we have default arrays to prevent errors
  const eventsArray = events || [];
  const checkinsArray = checkins || [];
  const volunteersArray = volunteers || [];
  
  const stats = [
    { 
      title: 'Total Events', 
      value: eventsArray.length, 
      color: 'bg-blue-500', 
      icon: Calendar 
    },
    { 
      title: 'Active Volunteers', 
      value: volunteersArray.length, 
      color: 'bg-green-500', 
      icon: Users 
    },
    { 
      title: 'Total Check-Ins', 
      value: checkinsArray.length, 
      color: 'bg-purple-500', 
      icon: Eye 
    },
    { 
      title: 'Upcoming Events', 
      value: eventsArray.filter(e => {
        const eventDate = new Date(e?.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today && e?.status !== 'cancelled';
      }).length, 
      color: 'bg-orange-500', 
      icon: MapPin 
    },
  ];

  // Filter for upcoming events (non-cancelled and future/today dates)
  const dashboardEvents = eventsArray
    .filter(event => {
      if (!event || event.status === 'cancelled') return false;
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date)) // Sort by date, earliest first
    .slice(0, 3);

  const fetchAllData = async () => {
    // This would typically refresh your data
    console.log('Refreshing data...');
  };

  const handleEdit = (event) => {
    // This would open the edit modal
    console.log('Editing event:', event.title);
    if (setShowEventModal) {
      setShowEventModal(true);
    }
  };

  const handleView = (event) => {
    setSelectedEvent(event);
    setViewModalOpen(true);
  };

  const handleShare = (event) => {
    // Enhanced sharing functionality
    const shareEvent = async () => {
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      };

      const shareData = {
        title: `Join us for ${event.title}`,
        text: `🌱 Environmental Cleanup Event\n\n📅 ${formatDate(event.date)} at ${event.time}\n📍 ${event.location}\n🎯 Target: ${event.wasteTarget}kg waste collection\n\nJoin us in making a difference! Help us clean up our environment and build a sustainable future together.`,
        url: window.location.href
      };

      try {
        // Check if Web Share API is supported (works on mobile devices)
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          console.log('Event shared successfully via native share');
        } else {
          // Fallback: Copy to clipboard
          const shareText = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
          await navigator.clipboard.writeText(shareText);
          alert('Event details copied to clipboard! You can now paste and share via WhatsApp, Email, or any other app.');
        }
      } catch (error) {
        console.error('Error sharing:', error);
        // Final fallback: show share options
        const shareText = `${shareData.title}\n\n${shareData.text}`;
        const confirmed = confirm(`Share this event:\n\n${shareText}\n\nClick OK to copy to clipboard, or Cancel to dismiss.`);
        if (confirmed) {
          try {
            await navigator.clipboard.writeText(shareText);
            alert('Copied to clipboard! You can now share via any app.');
          } catch (clipboardError) {
            console.error('Clipboard failed:', clipboardError);
            alert(`Please copy this text to share:\n\n${shareText}`);
          }
        }
      }
    };

    shareEvent();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>

      {/* Upcoming Events Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
        <div className="space-y-4">
          {dashboardEvents.length > 0 ? dashboardEvents.map(event => (
  <div
    key={event.id}
    className="relative group transform transition duration-300 hover:scale-[1.015] hover:shadow-xl"
  >
    <EventCard 
      event={event} 
      checkins={checkinsArray} 
      onEdit={handleEdit}
      onView={handleView}
      onShare={handleShare}
      compact={true} 
      fetchAllData={fetchAllData}
    />
    <button
      onClick={() => handleView(event)}
      className="absolute inset-0 bg-transparent rounded-lg transition-colors"
      title="Click to view event details"
    />
  </div>
)) : (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">No upcoming events</p>
              <p className="text-gray-400 text-sm mb-4">
                Create your first event to get started with organizing cleanup activities
              </p>
              {setShowEventModal && (
                <button
                  onClick={() => setShowEventModal(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Event
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Show "View All Events" button if there are more than 3 upcoming events */}
        {eventsArray.filter(event => {
          if (!event || event.status === 'cancelled') return false;
          const eventDate = new Date(event.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today;
        }).length > 3 && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => navigateToTab && navigateToTab('events')}
              className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              View All Events ({eventsArray.filter(event => {
                if (!event || event.status === 'cancelled') return false;
                const eventDate = new Date(event.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                eventDate.setHours(0, 0, 0, 0);
                return eventDate >= today;
              }).length} total)
            </button>
          </div>
        )}
      </div>

      {/* Event View Modal */}
      <EventViewModal
        event={selectedEvent}
        checkins={checkinsArray}
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
};

export default Dashboard;