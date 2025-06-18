import React from 'react';
import { Calendar, Users, MapPin, Edit3, Eye, Share2, Clock, Target, Wrench } from 'lucide-react';

const EventCard = ({ event, checkins, onEdit, onView, onShare, compact = false }) => {
    
  // Get unique volunteer count for this event
  const volunteerCount = checkins ? 
    [...new Set(checkins.filter(checkin => checkin.eventId === event.id).map(checkin => checkin.userId))].length : 0;
  
  // Determine event status and styling
  const getEventStatus = () => {
    if (event.status === 'cancelled') {
      return { status: 'Cancelled', color: 'bg-red-100 text-red-800', emoji: '❌' };
    }
    
    const eventDate = new Date(event.date);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    
    if (eventDate.getTime() === today.getTime()) {
      return { status: 'Today', color: 'bg-orange-100 text-orange-800', emoji: '🔥' };
    } else if (eventDate > today) {
      return { status: 'Upcoming', color: 'bg-blue-100 text-blue-800', emoji: '📅' };
    } else {
      return { status: 'Completed', color: 'bg-green-100 text-green-800', emoji: '✅' };
    }
  };

  const { status, color, emoji } = getEventStatus();

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Default handlers if not provided
  const handleEdit = (event) => {
    if (onEdit && typeof onEdit === 'function') {
      onEdit(event);
    } else {
      console.log('Edit function not provided for event:', event.title);
      // You could show a toast notification or navigate to edit page
      alert('Edit functionality not implemented yet');
    }
  };

  const handleShare = (event) => {
    if (onShare && typeof onShare === 'function') {
      onShare(event);
    } else {
      console.log('Share function not provided for event:', event.title);
      // Default share functionality
      if (navigator.share) {
        navigator.share({
          title: event.title,
          text: `Join us for ${event.title} on ${formatDate(event.date)} at ${event.location}`,
          url: window.location.href
        }).catch(console.error);
      } else {
        // Fallback for browsers that don't support Web Share API
        const shareText = `Join us for ${event.title} on ${formatDate(event.date)} at ${event.location}`;
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Event details copied to clipboard!');
        }).catch(() => {
          alert('Unable to share event details');
        });
      }
    }
  };

  const handleView = (event) => {
    if (onView && typeof onView === 'function') {
      onView(event);
    } else {
      console.log('View function not provided for event:', event.title);
    }
  };

  // Compact version for dashboard
  if (compact) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900 truncate flex-1 mr-2">{event.title}</h4>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
            {emoji} {status}
          </span>
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar size={14} className="mr-2" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center">
            <Users size={14} className="mr-2" />
            <span>{volunteerCount} volunteer{volunteerCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {/* Add action buttons for compact view too */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleEdit(event)}
            className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => handleShare(event)}
            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
          >
            🔗 Share
          </button>
        </div>
      </div>
    );
  }

  // Full version for events page
  return (
    <div className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border ${
      event.status === 'cancelled' ? 'border-red-200 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-gray-900 mb-2">{event.title}</h3>
          <div className="flex items-center space-x-3 mb-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
              {emoji} {status}
            </span>
            {event.wasteTarget && (
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                🎯 Target: {event.wasteTarget}kg
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center text-gray-600">
            <Calendar size={18} className="mr-3 text-blue-500" />
            <div>
              <span className="font-medium">Date:</span>
              <span className="ml-2">{formatDate(event.date)}</span>
            </div>
          </div>
          
          {event.time && (
            <div className="flex items-center text-gray-600">
              <Clock size={18} className="mr-3 text-green-500" />
              <div>
                <span className="font-medium">Time:</span>
                <span className="ml-2">{event.time}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center text-gray-600">
            <MapPin size={18} className="mr-3 text-red-500" />
            <div>
              <span className="font-medium">Location:</span>
              <span className="ml-2">{event.location}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-gray-600">
            <Users size={18} className="mr-3 text-purple-500" />
            <div>
              <span className="font-medium">Volunteers:</span>
              <span className="ml-2 font-semibold text-purple-600">
                {volunteerCount} registered
              </span>
            </div>
          </div>
          
          {event.wasteTarget && (
            <div className="flex items-center text-gray-600">
              <Target size={18} className="mr-3 text-orange-500" />
              <div>
                <span className="font-medium">Waste Target:</span>
                <span className="ml-2">{event.wasteTarget} kg</span>
              </div>
            </div>
          )}
          
          {event.gearNeeded && (
            <div className="flex items-center text-gray-600">
              <Wrench size={18} className="mr-3 text-gray-500" />
              <div>
                <span className="font-medium">Gear:</span>
                <span className="ml-2">{event.gearNeeded}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={() => handleEdit(event)}
          className="text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        >
          ✏️ Edit
        </button>
        
        <button
          onClick={() => handleShare(event)}
          className="text-sm px-4 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
        >
          🔗 Share
        </button>

        {onView && (
          <button
            onClick={() => handleView(event)}
            className="text-sm px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
          >
            👁️ View
          </button>
        )}
      </div>

      {/* Cancel/Completion Info */}
      {event.status === 'cancelled' && event.cancelReason && (
        <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
          <p className="text-red-800 text-sm font-medium">
            <span className="font-semibold">Cancellation Reason:</span> {event.cancelReason}
          </p>
          {event.cancelledAt && (
            <p className="text-red-600 text-xs mt-1">
              Cancelled on: {new Date(event.cancelledAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Event Creation Info */}
      {event.createdAt && (
        <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-3">
          Created: {new Date(event.createdAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default EventCard;