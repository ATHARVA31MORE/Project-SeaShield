import React from 'react';
import { X, Calendar, Clock, MapPin, Users, Target, Wrench, Share2 } from 'lucide-react';

// Enhanced Share Component with native device sharing
const ShareButton = ({ event, className = "" }) => {
  const handleShare = async () => {
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
      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
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
          navigator.clipboard.writeText(shareText);
          alert('Copied to clipboard! You can now share via any app.');
        } catch (clipboardError) {
          console.error('Clipboard failed:', clipboardError);
          // Show share text in a new window/tab as last resort
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`<pre>${shareText}</pre>`);
            newWindow.document.title = 'Share Event Details';
          }
        }
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 transition-colors ${className}`}
    >
      <Share2 size={16} />
      Share Event
    </button>
  );
};

const EventViewModal = ({ event, checkins, isOpen, onClose }) => {
  if (!isOpen || !event) return null;

  // Get unique volunteer count for this event
  const volunteerCount = checkins ? 
    [...new Set(checkins.filter(checkin => checkin.eventId === event.id).map(checkin => checkin.userId))].length : 0;

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get volunteers who checked in
  const eventVolunteers = checkins ? 
    checkins.filter(checkin => checkin.eventId === event.id) : [];

  // Determine event status
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

  const handleShare = async () => {
    const shareData = {
      title: `Join us for ${event.title}`,
      text: `🌱 Environmental Cleanup Event\n\n📅 ${formatDate(event.date)} at ${event.time}\n📍 ${event.location}\n🎯 Target: ${event.wasteTarget}kg waste collection\n\nJoin us in making a difference! Help us clean up our environment and build a sustainable future together.`,
      url: window.location.href
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        const shareText = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        alert('Event details copied to clipboard! You can now paste and share anywhere.');
      }
    } catch (error) {
      // If both methods fail, show the share text in an alert
      const shareText = `${shareData.title}\n\n${shareData.text}`;
      alert(`Share this event:\n\n${shareText}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Event Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Event Title and Status */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{event.title}</h1>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                {emoji} {status}
              </span>
              <ShareButton 
                event={event} 
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 text-sm font-medium"
              />
            </div>
          </div>

          {/* Event Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📅 Schedule</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-700">
                    <Calendar size={18} className="mr-3 text-blue-500" />
                    <div>
                      <span className="font-medium">Date:</span>
                      <span className="ml-2">{formatDate(event.date)}</span>
                    </div>
                  </div>
                  {event.time && (
                    <div className="flex items-center text-gray-700">
                      <Clock size={18} className="mr-3 text-green-500" />
                      <div>
                        <span className="font-medium">Time:</span>
                        <span className="ml-2">{event.time}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📍 Location</h3>
                <div className="flex items-start text-gray-700">
                  <MapPin size={18} className="mr-3 text-red-500 mt-0.5" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">🎯 Goals & Requirements</h3>
                <div className="space-y-2">
                  {event.wasteTarget && (
                    <div className="flex items-center text-gray-700">
                      <Target size={18} className="mr-3 text-orange-500" />
                      <div>
                        <span className="font-medium">Waste Target:</span>
                        <span className="ml-2">{event.wasteTarget} kg</span>
                      </div>
                    </div>
                  )}
                  {event.gearNeeded && (
                    <div className="flex items-start text-gray-700">
                      <Wrench size={18} className="mr-3 text-gray-500 mt-0.5" />
                      <div>
                        <span className="font-medium">Gear Needed:</span>
                        <span className="ml-2">{event.gearNeeded}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">👥 Participation</h3>
                <div className="flex items-center text-gray-700">
                  <Users size={18} className="mr-3 text-purple-500" />
                  <div>
                    <span className="font-medium">Volunteers Registered:</span>
                    <span className="ml-2 font-semibold text-purple-600">
                      {volunteerCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Check-ins */}
          {eventVolunteers.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">✅ Recent Check-ins</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {eventVolunteers.slice(0, 5).map((checkin, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col text-gray-700">
                        <span className="font-medium">{checkin.userName || 'Anonymous Volunteer'}</span>
                        <span className="text-xs text-gray-500">{checkin.userEmail || 'No email'}</span>
                    </div>
                    <span className="text-gray-500">
                      {new Date(checkin.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {eventVolunteers.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    ... and {eventVolunteers.length - 5} more volunteers
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cancellation Info */}
          {event.status === 'cancelled' && event.cancelReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">❌ Event Cancelled</h3>
              <p className="text-red-800 text-sm mb-2">
                <span className="font-medium">Reason:</span> {event.cancelReason}
              </p>
              {event.cancelledAt && (
                <p className="text-red-600 text-xs">
                  Cancelled on: {new Date(event.cancelledAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Event Creation Info */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-xs text-gray-500">
              <p>Event created: {event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Unknown'}</p>
              {event.updatedAt && (
                <p>Last updated: {new Date(event.updatedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 rounded-b-xl">
          <div className="flex gap-3 justify-end">
            <ShareButton 
              event={event} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            />
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventViewModal;