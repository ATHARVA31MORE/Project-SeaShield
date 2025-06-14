import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../utils/firebase';
import { addDoc, collection, doc, getDoc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { uploadBytes, ref, getDownloadURL } from 'firebase/storage';
import { fetchGeminiResponse } from '../utils/gemini';
import SeedEvents from '../components/SeedEvents';

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
  const [currentCheckInId, setCurrentCheckInId] = useState(null);

  // New state for post-checkin features
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customWasteAmount, setCustomWasteAmount] = useState('');
  const [showWasteEntry, setShowWasteEntry] = useState(false);
  const [showEventProgress, setShowEventProgress] = useState(false);
  const [eventProgress, setEventProgress] = useState(null);
  const [originalWasteAmount, setOriginalWasteAmount] = useState(0);

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

  const loadEventProgress = async (eventId) => {
    try {
      // Get all check-ins for this event
      const checkInsQuery = query(
        collection(db, 'checkins'),
        where('eventId', '==', eventId)
      );
      const checkInsSnapshot = await getDocs(checkInsQuery);
      
      let totalWaste = 0;
      let totalParticipants = checkInsSnapshot.size;
      const participants = [];

      checkInsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalWaste += Number(data.wasteCollected) || 0;
        participants.push({
          name: data.userName,
          waste: Number(data.wasteCollected) || 0,
          timestamp: data.timestamp
        });
      });

      // Sort participants by waste collected
      participants.sort((a, b) => b.waste - a.waste);

      setEventProgress({
        totalParticipants,
        totalWaste: Math.round(totalWaste * 100) / 100,
        topParticipants: participants.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading event progress:', error);
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!file || !currentCheckInId) return;

    setIsUploading(true);
    try {
      // Create storage reference
      const fileName = `proof-photos/${currentCheckInId}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, fileName);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save photo reference to checkins document
      const checkInRef = doc(db, 'checkins', currentCheckInId);
      await updateDoc(checkInRef, {
        proofPhoto: downloadURL,
        photoUploadTime: new Date().toISOString()
      });

      setUploadedPhoto(downloadURL);
      setStatus('✅ Proof photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      setStatus('❌ Error uploading photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const submitCustomWaste = async () => {
    if (!customWasteAmount.trim() || !currentCheckInId) return;

    try {
      const newWasteAmount = Number(customWasteAmount);
      if (isNaN(newWasteAmount) || newWasteAmount < 0) {
        setStatus('❌ Please enter a valid waste amount.');
        return;
      }

      // Update the checkins document
      const checkInRef = doc(db, 'checkins', currentCheckInId);
      await updateDoc(checkInRef, {
        wasteCollected: newWasteAmount,
        customWasteEntry: true,
        wasteEntryTime: new Date().toISOString()
      });

      setOriginalWasteAmount(newWasteAmount);
      setShowWasteEntry(false);
      setCustomWasteAmount('');
      setStatus(`✅ Waste collection updated to ${newWasteAmount}kg!`);
    } catch (error) {
      console.error('Error updating waste amount:', error);
      setStatus('❌ Error updating waste amount. Please try again.');
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
      // 1. Verify event exists and get current data
      const eventDoc = await getDoc(doc(db, 'events', eventId.trim()));
      if (!eventDoc.exists()) {
        throw new Error('Event not found. Please check the event ID.');
      }

      const eventData = eventDoc.data();
      console.log('🔍 EVENT DATA FROM FIRESTORE:', eventData);
      
      setEventDetails(eventData);

      // 2. Check for duplicate check-in
      const isDuplicate = await checkDuplicateCheckIn(eventId.trim());
      if (isDuplicate) {
        setStatus('⚠️ You have already checked in to this event!');
        setIsProcessing(false);
        return;
      }

      // 3. Get current participant count from existing check-ins (more reliable)
      const checkInsQuery = query(
        collection(db, 'checkins'),
        where('eventId', '==', eventId.trim())
      );
      const checkInsSnapshot = await getDocs(checkInsQuery);
      const currentParticipants = checkInsSnapshot.size;
      
      console.log('👥 CURRENT PARTICIPANTS FROM CHECKINS:', currentParticipants);
      console.log('👥 PARTICIPANT COUNT FROM EVENT:', eventData.participantCount);

      // 4. Calculate waste - DETAILED LOGGING
      const wasteAvailable = Number(eventData.wasteAvailable) || 0;
      const totalParticipants = currentParticipants + 1; // Include this new participant
      
      console.log('🧮 WASTE CALCULATION:');
      console.log('  - wasteAvailable:', wasteAvailable, typeof wasteAvailable);
      console.log('  - currentParticipants:', currentParticipants, typeof currentParticipants);
      console.log('  - totalParticipants:', totalParticipants, typeof totalParticipants);
      
      let wastePerVolunteer = 0;
      
      if (wasteAvailable > 0 && totalParticipants > 0) {
        wastePerVolunteer = wasteAvailable / totalParticipants;
        wastePerVolunteer = Math.round(wastePerVolunteer * 100) / 100; // Round to 2 decimal places
        console.log('  - wastePerVolunteer (calculated):', wastePerVolunteer);
      } else {
        console.log('  - ❌ wasteAvailable or totalParticipants is 0');
      }
      
      // Ensure minimum waste collection if event has waste available
      if (wasteAvailable > 0 && wastePerVolunteer < 0.1) {
        wastePerVolunteer = Math.max(1, wasteAvailable / 10); // Give at least 1kg or 1/10th of total
        console.log('  - wastePerVolunteer (adjusted minimum):', wastePerVolunteer);
      }

      console.log('✅ FINAL wasteCollected value:', wastePerVolunteer);
      setOriginalWasteAmount(wastePerVolunteer);

      // 5. Create the check-in document
      const checkInData = {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        eventId: eventId.trim(),
        eventTitle: eventData.title,
        eventLocation: eventData.location,
        wasteCollected: wastePerVolunteer,  // This should now be > 0
        timestamp: new Date().toISOString(),
        checkInTime: new Date(),
      };

      console.log('📝 CHECK-IN DATA TO BE SAVED:', checkInData);

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'checkins'), checkInData);
      console.log('✅ CHECK-IN SAVED WITH ID:', docRef.id);
      setCurrentCheckInId(docRef.id);

      // 6. Update user's EcoScore (+10 points)
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ecoScore: increment(10),
        lastCheckIn: new Date().toISOString(),
        totalCheckIns: increment(1)
      });

      // 7. Update event participation count
      const eventRef = doc(db, 'events', eventId.trim());
      await updateDoc(eventRef, {
        participantCount: increment(1),
        lastCheckIn: new Date().toISOString()
      });

      // 8. Generate motivational message
      const message = await generateMotivationalMessage(eventData.title, user.displayName);
      setMotivationalMessage(message);

      // 9. Update local state
      setEcoScore(prevScore => prevScore + 10);
      setCheckInSuccess(true);
      setStatus(`✅ Check-in successful! You collected ${wastePerVolunteer}kg of waste 🌊`);
      setShowFeedback(true);

      // Clear event ID for next scan
      setEventId('');

    } catch (error) {
      console.error('❌ CHECK-IN ERROR:', error);
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
        rating: 'positive'
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
    setCurrentCheckInId(null);
    setShowProofUpload(false);
    setUploadedPhoto(null);
    setShowWasteEntry(false);
    setCustomWasteAmount('');
    setShowEventProgress(false);
    setEventProgress(null);
    setOriginalWasteAmount(0);
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
          {/* Debug Button - Remove this in production */}
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800 mb-2">🐛 Debug Mode: Check browser console for detailed logs</p>
            <button
              onClick={() => console.log('Current eventId:', eventId)}
              className="text-xs bg-yellow-200 px-2 py-1 rounded"
            >
              Log Current Event ID
            </button>
          </div>

          {/* Event ID Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Scanned Event ID
            </label>
            <input
              type="text"
              placeholder="e.g., g3rCfy5NpZn58EGA8xWa"
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

          {/* Post Check-in Action Menu */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setShowProofUpload(true)}
              className="p-3 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
            >
              📸 Upload Proof
            </button>
            <button
              onClick={() => setShowWasteEntry(true)}  
              className="p-3 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
            >
              ♻️ Log Waste
            </button>
            <button
              onClick={() => {
                setShowEventProgress(true);
                loadEventProgress(eventDetails?.id || currentCheckInId);
              }}
              className="p-3 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
            >
              📊 Event Stats
            </button>
            <button
              onClick={resetCheckIn}
              className="p-3 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              ➕ Next Event
            </button>
          </div>

          {/* Proof Photo Upload Section */}
          {showProofUpload && (
            <div className="bg-purple-50 p-4 rounded-lg mb-4 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-3">📸 Upload Cleanup Proof</h4>
              
              {!uploadedPhoto ? (
                <div>
                  <p className="text-sm text-purple-700 mb-3">
                    Share a before/after photo or selfie at the cleanup location!
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files[0] && handlePhotoUpload(e.target.files[0])}
                    className="w-full p-2 border border-purple-300 rounded text-sm"
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="mt-2 text-sm text-purple-600">🔄 Uploading photo...</div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-green-600 font-medium mb-2">✅ Photo uploaded successfully!</div>
                  <img src={uploadedPhoto} alt="Cleanup proof" className="w-full h-32 object-cover rounded" />
                </div>
              )}
              
              <button
                onClick={() => setShowProofUpload(false)}
                className="mt-3 px-3 py-1 bg-purple-200 text-purple-800 rounded text-sm"
              >
                Close
              </button>
            </div>
          )}

          {/* Custom Waste Entry Section */}
          {showWasteEntry && (
            <div className="bg-orange-50 p-4 rounded-lg mb-4 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-3">♻️ Manual Waste Entry</h4>
              <p className="text-sm text-orange-700 mb-3">
                Current estimate: {originalWasteAmount}kg
              </p>
              <p className="text-xs text-orange-600 mb-3">
                Enter the actual amount you collected (in kg):
              </p>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Enter kg (e.g., 2.5)"
                value={customWasteAmount}
                onChange={(e) => setCustomWasteAmount(e.target.value)}
                className="w-full p-2 border border-orange-300 rounded text-sm mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitCustomWaste}
                  disabled={!customWasteAmount.trim()}
                  className="px-3 py-1 bg-orange-500 text-white rounded text-sm disabled:bg-orange-300"
                >
                  Update Amount
                </button>
                <button
                  onClick={() => setShowWasteEntry(false)}
                  className="px-3 py-1 bg-orange-200 text-orange-800 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Event Progress Section */}
          {showEventProgress && (
            <div className="bg-indigo-50 p-4 rounded-lg mb-4 border border-indigo-200">
              <h4 className="font-semibold text-indigo-900 mb-3">📊 Event Progress</h4>
              
              {eventProgress ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-800">{eventProgress.totalParticipants}</div>
                      <div className="text-xs text-indigo-600">Participants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-800">{eventProgress.totalWaste}kg</div>
                      <div className="text-xs text-indigo-600">Total Waste</div>
                    </div>
                  </div>
                  
                  <div className="text-left">
                    <h5 className="font-medium text-indigo-800 mb-2">🏆 Top Contributors:</h5>
                    {eventProgress.topParticipants.slice(0, 3).map((participant, index) => (
                      <div key={index} className="flex justify-between text-sm text-indigo-700 mb-1">
                        <span>{participant.name}</span>
                        <span>{participant.waste}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-indigo-600">Loading event stats...</div>
              )}
              
              <button
                onClick={() => setShowEventProgress(false)}
                className="mt-3 px-3 py-1 bg-indigo-200 text-indigo-800 rounded text-sm"
              >
                Close
              </button>
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
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-xs text-gray-500 text-center">
        💡 Scan the QR code at the event location or manually enter the Event ID shown on the QR code
      </div>
    </div>
  );
}