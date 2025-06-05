import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { addDoc, collection, doc, getDoc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { fetchGeminiResponse } from '../utils/gemini';

export default function QRScan() {
  const { user } = useAuth();
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [eventDetails, setEventDetails] = useState(null);
  const [ecoScore, setEcoScore] = useState(0);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Load user's current EcoScore
  useEffect(() => {
    const loadUserScore = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setEcoScore(userDoc.data().ecoScore || 0);
        }
      } catch (error) {
        console.error('Error loading user score:', error);
      }
    };
    loadUserScore();
  }, [user.uid]);

  const checkDuplicateCheckIn = async (eventId) => {
    const q = query(
      collection(db, 'checkins'),
      where('userId', '==', user.uid),
      where('eventId', '==', eventId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const generateMotivationalMessage = async (eventTitle, userName) => {
    const prompt = `
      Generate a short, enthusiastic message for ${userName} who just checked into a beach cleanup event "${eventTitle}". 
      Mention ocean protection and make it emotionally uplifting. Keep it under 50 words.
      Include an ocean or environmental emoji.
    `;
    try {
      const message = await fetchGeminiResponse(prompt);
      return message;
    } catch (error) {
      return `🌊 Amazing work, ${userName}! Your participation in ${eventTitle} is making a real difference for our oceans. Every action counts! 💙`;
    }
  };

  const handleCheckIn = async () => {
    if (!eventId.trim()) {
      setStatus('❌ Please enter a valid event ID.');
      return;
    }

    setIsProcessing(true);
    setStatus('🔄 Processing check-in...');

    try {
      // 1. Verify event exists
      const eventDoc = await getDoc(doc(db, 'events', eventId.trim()));
      if (!eventDoc.exists()) {
        throw new Error('Event not found. Please check the event ID.');
      }

      const eventData = eventDoc.data();
      setEventDetails(eventData);

      // 2. Check for duplicate check-in
      const isDuplicate = await checkDuplicateCheckIn(eventId.trim());
      if (isDuplicate) {
        setStatus('⚠️ You have already checked in to this event!');
        setIsProcessing(false);
        return;
      }

      // 3. Log the check-in
      await addDoc(collection(db, 'checkins'), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        eventId: eventId.trim(),
        eventTitle: eventData.title,
        eventLocation: eventData.location,
        timestamp: new Date().toISOString(),
        checkInTime: new Date(),
      });

      // 4. Update user's EcoScore (+10 points)
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ecoScore: increment(10),
        lastCheckIn: new Date().toISOString(),
        totalCheckIns: increment(1)
      });

      // 5. Update event participation count
      const eventRef = doc(db, 'events', eventId.trim());
      await updateDoc(eventRef, {
        participantCount: increment(1),
        lastCheckIn: new Date().toISOString()
      });

      // 6. Generate motivational message
      const message = await generateMotivationalMessage(eventData.title, user.displayName);
      setMotivationalMessage(message);

      // 7. Update local state
      setEcoScore(prevScore => prevScore + 10);
      setCheckInSuccess(true);
      setStatus('✅ Check-in successful! Thanks for taking action for our oceans 🌊');
      setShowFeedback(true);

      // Clear event ID for next scan
      setEventId('');

    } catch (error) {
      console.error('Check-in error:', error);
      setStatus(`❌ ${error.message || 'Error during check-in. Please try again.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) return;

    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userName: user.displayName,
        eventId: eventId,
        eventTitle: eventDetails?.title,
        feedback: feedback.trim(),
        timestamp: new Date().toISOString(),
        rating: 'positive' // You can extend this to include ratings
      });

      setFeedback('');
      setShowFeedback(false);
      alert('Thank you for your feedback! 🙏');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const resetCheckIn = () => {
    setCheckInSuccess(false);
    setEventDetails(null);
    setMotivationalMessage('');
    setStatus('');
    setShowFeedback(false);
    setFeedback('');
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">📸 Event Check-In</h2>
      
      {/* EcoScore Display */}
      <div className="bg-green-100 p-3 rounded-lg mb-4 text-center">
        <div className="text-2xl font-bold text-green-800">🌟 {ecoScore}</div>
        <div className="text-sm text-green-600">EcoScore Points</div>
      </div>

      {!checkInSuccess ? (
        <div>
          {/* Event ID Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Scanned Event ID
            </label>
            <input
              type="text"
              placeholder="e.g., abc123def456"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="p-3 border border-gray-300 rounded-lg w-full text-center font-mono"
              disabled={isProcessing}
            />
          </div>

          {/* Check-in Button */}
          <button
            onClick={handleCheckIn}
            disabled={isProcessing || !eventId.trim()}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
              isProcessing || !eventId.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isProcessing ? '🔄 Processing...' : '✅ Check In to Event'}
          </button>

          {/* Status Message */}
          {status && (
            <div className={`mt-4 p-3 rounded-lg text-center font-medium ${
              status.includes('✅') 
                ? 'bg-green-100 text-green-800' 
                : status.includes('❌') 
                ? 'bg-red-100 text-red-800'
                : status.includes('⚠️')
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {status}
            </div>
          )}
        </div>
      ) : (
        /* Success State */
        <div className="text-center">
          {/* Success Badge */}
          <div className="bg-green-500 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>

          {/* Event Details */}
          {eventDetails && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-bold text-blue-900">{eventDetails.title}</h3>
              <p className="text-sm text-blue-700">{eventDetails.location}</p>
              <div className="mt-2 text-xs text-blue-600">
                📅 {eventDetails.date} • ✅ Checked in successfully
              </div>
            </div>
          )}

          {/* Points Earned */}
          <div className="bg-yellow-100 p-3 rounded-lg mb-4">
            <div className="text-lg font-bold text-yellow-800">+10 EcoScore Points! 🌟</div>
            <div className="text-sm text-yellow-700">Total: {ecoScore} points</div>
          </div>

          {/* Motivational Message */}
          {motivationalMessage && (
            <div className="bg-green-50 p-4 rounded-lg mb-4 text-green-800 italic">
              {motivationalMessage}
            </div>
          )}

          {/* Feedback Section */}
          {showFeedback && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold mb-2">Quick Feedback (Optional)</h4>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="How was the event? Any suggestions?"
                className="w-full p-2 border border-gray-300 rounded text-sm"
                rows="3"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={submitFeedback}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                  disabled={!feedback.trim()}
                >
                  Submit Feedback
                </button>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={resetCheckIn}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Check In to Another Event
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-xs text-gray-500 text-center">
        💡 Scan the QR code at the event location or manually enter the Event ID shown on the QR code
      </div>
    </div>
  );
}