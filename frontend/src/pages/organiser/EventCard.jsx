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
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
        <button 
          onClick={() => onEdit && onEdit(event)}
          className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
        >
          <Edit3 size={16} className="mr-2" />
          Edit
        </button>
        
        <button 
          onClick={() => onView && onView(event)}
          className="flex items-center px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium"
        >
          <Eye size={16} className="mr-2" />
          View Details
        </button>
        
        <button 
          onClick={() => onShare && onShare(event)}
          className="flex items-center px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors font-medium"
        >
          <Share2 size={16} className="mr-2" />
          Share
        </button>
        
        {/* Volunteer Count Badge */}
        <div className="ml-auto flex items-center bg-gray-100 text-gray-700 px-3 py-2 rounded-lg">
          <Users size={16} className="mr-2" />
          <span className="font-medium">{volunteerCount}</span>
        </div>
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