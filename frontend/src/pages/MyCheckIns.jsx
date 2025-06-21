import { useEffect, useState } from 'react';
import { db } from '../utils/firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function MyCheckIns() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    rating: 5,
    experience: '',
    suggestions: '',
    wouldRecommend: true
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    const fetchCheckIns = async () => {
      try {
        const q = query(
          collection(db, 'checkins'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const checkinsData = [];
        
        // Get event details for each checkin
        for (const docSnap of snapshot.docs) {
          const checkinData = { id: docSnap.id, ...docSnap.data() };
          
          // Fetch event details
          try {
            const eventDoc = await getDoc(doc(db, 'events', checkinData.eventId));
            if (eventDoc.exists()) {
              checkinData.eventDetails = eventDoc.data();
            }
          } catch (error) {
            console.error('Error fetching event details:', error);
          }
          
          checkinsData.push(checkinData);
        }
        
        // Sort by timestamp (newest first)
        checkinsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setCheckins(checkinsData);
      } catch (error) {
        console.error('Error fetching check-ins:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCheckIns();
  }, [user]);

  const openFeedbackModal = (checkin) => {
    setSelectedCheckIn(checkin);
    setFeedbackData({
      rating: checkin.feedback?.rating || 5,
      experience: checkin.feedback?.experience || '',
      suggestions: checkin.feedback?.suggestions || '',
      wouldRecommend: checkin.feedback?.wouldRecommend !== undefined ? checkin.feedback.wouldRecommend : true
    });
    setShowFeedbackModal(true);
  };

  const submitFeedback = async () => {
    if (!selectedCheckIn) return;

    setIsSubmittingFeedback(true);
    try {
      const checkInRef = doc(db, 'checkins', selectedCheckIn.id);
      await updateDoc(checkInRef, {
        feedback: {
          ...feedbackData,
          submittedAt: new Date().toISOString()
        }
      });

      // Update local state
      setCheckins(prev => prev.map(checkin => 
        checkin.id === selectedCheckIn.id 
          ? { ...checkin, feedback: { ...feedbackData, submittedAt: new Date().toISOString() } }
          : checkin
      ));

      setShowFeedbackModal(false);
      setSelectedCheckIn(null);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-cyan-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your check-ins...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6 rounded-2xl shadow-lg transform transition-all duration-500 hover:scale-105">
            <h2 className="text-3xl font-bold mb-2">🌊 My Event Participation</h2>
            <p className="text-blue-100">Track your cleanup journey and environmental impact</p>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center transform transition-all duration-300 hover:shadow-xl hover:scale-105">
            <div className="text-4xl font-bold text-blue-600 mb-1">{checkins.length}</div>
            <div className="text-gray-600 font-medium">Events Participated</div>
            <div className="text-xs text-blue-500 mt-1">🗓️ Total Events</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center transform transition-all duration-300 hover:shadow-xl hover:scale-105">
            <div className="text-4xl font-bold text-green-600 mb-1">
              {checkins.reduce((sum, c) => sum + (Number(c.wasteCollected) || 0), 0).toFixed(1)}kg
            </div>
            <div className="text-gray-600 font-medium">Total Impact</div>
            <div className="text-xs text-green-500 mt-1">♻️ Waste Collected</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center transform transition-all duration-300 hover:shadow-xl hover:scale-105">
            <div className="text-4xl font-bold text-purple-600 mb-1">
              {checkins.filter(c => c.feedback).length}
            </div>
            <div className="text-gray-600 font-medium">Feedback Given</div>
            <div className="text-xs text-purple-500 mt-1">💬 Reviews Shared</div>
          </div>
        </div>

        {/* Check-ins List */}
        {checkins.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-lg text-center">
            <div className="text-8xl mb-6 animate-bounce">🌊</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-3">Ready to Make a Difference?</h3>
            <p className="text-gray-500 mb-6 text-lg">Your cleanup journey starts here! Check into your first event and help protect our environment.</p>
            <button className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-green-700 transform transition-all duration-300 hover:scale-105 shadow-lg">
              🔍 Find Events Near You
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {checkins.map((checkin, index) => (
              <div key={checkin.id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 border-b border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                        <span className="mr-2 text-2xl">🌊</span>
                        {checkin.eventDetails?.title || checkin.eventTitle || 'Event Details Not Available'}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <span className="mr-1">📍</span>
                          {checkin.eventLocation || checkin.eventDetails?.location || 'Location not available'}
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">📅</span>
                          {formatDate(checkin.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center gap-3">
                      <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold text-lg shadow-lg">
                        ♻️ {Number(checkin.wasteCollected || 0).toFixed(1)}kg
                      </div>
                      <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        #{index + 1}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 font-medium mb-1">EVENT ID</div>
                      <div className="font-mono text-sm text-gray-800 break-all">{checkin.eventId}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 font-medium mb-1">CHECK-IN TIME</div>
                      <div className="text-sm text-gray-800">{formatDate(checkin.timestamp)}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 font-medium mb-1">WASTE COLLECTED</div>
                      <div className="text-sm text-green-600 font-bold">{Number(checkin.wasteCollected || 0).toFixed(1)}kg</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 font-medium mb-1">PROOF PHOTO</div>
                      <div className="text-sm">
                        {checkin.proofPhoto ? (
                          <span className="text-green-600 font-medium">✅ Uploaded</span>
                        ) : (
                          <span className="text-gray-400">📷 Not uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event Details Section */}
                  {checkin.eventDetails && (
  <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mb-6 border border-blue-100">
    <h4 className="font-bold text-blue-900 mb-3 flex items-center">
      <span className="mr-2">ℹ️</span>
      Event Information
    </h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div className="flex justify-between">
        <span className="text-blue-700 font-medium">Event Date:</span>
        <span className="text-blue-800">{checkin.eventDetails.date || 'Not specified'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-700 font-medium">Event Time:</span>
        <span className="text-blue-800">{checkin.eventDetails.time || 'Not specified'}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-700 font-medium">Target Waste:</span>
        <span className="text-blue-800">
          {checkin.eventDetails.wasteAvailable ? 
  `${checkin.eventDetails.wasteAvailable}kg` : 
  checkin.eventDetails.wasteTarget ? 
  `${checkin.eventDetails.wasteTarget}kg` :
  'Not specified'
}

        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-700 font-medium">Duration:</span>
        <span className="text-blue-800">
          {checkin.eventDetails.duration ? 
            `${checkin.eventDetails.duration} hours` : 
            'Not specified'
          }
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-700 font-medium">Total Participants:</span>
        <span className="text-blue-800">{checkin.eventDetails.participantCount || 0}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-700 font-medium">Event Status:</span>
        <span className={`font-medium ${
          checkin.eventDetails.status === 'active' ? 'text-green-600' :
          checkin.eventDetails.status === 'cancelled' ? 'text-red-600' :
          'text-blue-600'
        }`}>
          {checkin.eventDetails.status ? 
            checkin.eventDetails.status.charAt(0).toUpperCase() + checkin.eventDetails.status.slice(1) :
            'Active'
          }
        </span>
      </div>
    </div>
  </div>
)}

                  {/* Feedback Section */}
                  <div className="border-t border-gray-100 pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="mb-4 md:mb-0">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center">
                          <span className="mr-2">💬</span>
                          Event Feedback
                        </h4>
                        {checkin.feedback ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-yellow-500">{'⭐'.repeat(checkin.feedback.rating)}</span>
                              <span className="text-gray-600 text-sm">({checkin.feedback.rating}/5)</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <strong>Experience:</strong> {checkin.feedback.experience || 'No experience shared'}
                            </div>
                            {checkin.feedback.suggestions && (
                              <div className="text-sm text-gray-600">
                                <strong>Suggestions:</strong> {checkin.feedback.suggestions}
                              </div>
                            )}
                            <div className="text-sm">
                              <span className="text-gray-600">Recommendation: </span>
                              <span className={checkin.feedback.wouldRecommend ? 'text-green-600' : 'text-red-600'}>
                                {checkin.feedback.wouldRecommend ? '👍 Yes' : '👎 No'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm italic">No feedback provided yet</p>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0">
                        {checkin.feedback ? (
                          <div className="text-center">
                            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg mb-3 border border-green-200">
                              <div className="font-bold flex items-center justify-center">
                                <span className="mr-2">✅</span>
                                Feedback Submitted
                              </div>
                              <div className="text-xs mt-1">
                                {new Date(checkin.feedback.submittedAt).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                            <button
                              onClick={() => openFeedbackModal(checkin)}
                              className="text-blue-600 hover:text-blue-800 text-sm underline font-medium transition-colors duration-300"
                            >
                              ✏️ Edit Feedback
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openFeedbackModal(checkin)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 shadow-lg flex items-center"
                          >
                            <span className="mr-2">💬</span>
                            Share Your Experience
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && selectedCheckIn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                    <span className="mr-3 text-3xl">💬</span>
                    Event Feedback
                  </h3>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-300"
                  >
                    ✕
                  </button>
                </div>

                {/* Event Info Card */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100">
                  <h4 className="font-bold text-blue-900 text-lg mb-1">
                    {selectedCheckIn.eventDetails?.title || selectedCheckIn.eventTitle}
                  </h4>
                  <p className="text-blue-700 text-sm mb-2">📍 {selectedCheckIn.eventLocation}</p>
                  <div className="flex items-center gap-4 text-xs text-blue-600">
                    <span>📅 {formatDate(selectedCheckIn.timestamp)}</span>
                    <span>♻️ {Number(selectedCheckIn.wasteCollected || 0).toFixed(1)}kg collected</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Rating Section */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      ⭐ Overall Experience Rating
                    </label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFeedbackData(prev => ({ ...prev, rating: star }))}
                          className={`text-3xl transition-all duration-300 transform hover:scale-110 ${
                            star <= feedbackData.rating ? 'text-yellow-400' : 'text-gray-300'
                          } hover:text-yellow-400`}
                        >
                          ⭐
                        </button>
                      ))}
                      <span className="ml-3 text-lg font-bold text-gray-700">
                        {feedbackData.rating}/5
                      </span>
                    </div>
                  </div>

                  {/* Experience Textarea */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      🌊 Share Your Experience
                    </label>
                    <textarea
                      value={feedbackData.experience}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, experience: e.target.value }))}
                      placeholder="How was your cleanup experience? What did you enjoy most? Any memorable moments?"
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 resize-none transition-all duration-300 text-gray-700"
                      rows="4"
                    />
                  </div>

                  {/* Suggestions Textarea */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      💡 Suggestions for Improvement
                    </label>
                    <textarea
                      value={feedbackData.suggestions}
                      onChange={(e) => setFeedbackData(prev => ({ ...prev, suggestions: e.target.value }))}
                      placeholder="Any suggestions to make future cleanup events even better?"
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 resize-none transition-all duration-300 text-gray-700"
                      rows="3"
                    />
                  </div>

                  {/* Recommendation Section */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      🤝 Would you recommend this event to others?
                    </label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setFeedbackData(prev => ({ ...prev, wouldRecommend: true }))}
                        className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                          feedbackData.wouldRecommend
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        👍 Absolutely!
                      </button>
                      <button
                        onClick={() => setFeedbackData(prev => ({ ...prev, wouldRecommend: false }))}
                        className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                          !feedbackData.wouldRecommend
                            ? 'bg-red-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        👎 Not really
                      </button>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex space-x-4 mt-8">
                  <button
                    onClick={submitFeedback}
                    disabled={isSubmittingFeedback}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transform transition-all duration-300 hover:scale-105 disabled:scale-100 shadow-lg"
                  >
                    {isSubmittingFeedback ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Submitting...
                      </div>
                    ) : (
                      <span className="flex items-center justify-center">
                        <span className="mr-2">🚀</span>
                        Submit Feedback
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300 transform hover:scale-105"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}