import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import ImpactReportButton from '../components/ImpactReportButton';
import { fetchGeminiResponse } from '../utils/gemini';

export default function Profile() {
  const { user } = useAuth();
  const [ecoScore, setEcoScore] = useState(0);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState([]);
  const [totalWasteCollected, setTotalWasteCollected] = useState(0);
  const [streak, setStreak] = useState(0);
  const [personalizedMessage, setPersonalizedMessage] = useState('');
  const [loadingMessage, setLoadingMessage] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setEcoScore(data.ecoScore || 0);
        }

        const checkInQuery = query(
          collection(db, 'checkins'),
          where('userId', '==', user.uid)
        );

        const checkInSnap = await getDocs(checkInQuery);
        const checkInList = checkInSnap.docs.map(doc => doc.data());
        setCheckIns(checkInList);

        // Calculate stats
        const sorted = [...checkInList].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        let streakCounter = 1, maxStreak = 1;
        let totalWaste = 0;
        
        if (sorted.length > 0) {
          let lastDate = new Date(sorted[0].timestamp);
          for (let i = 1; i < sorted.length; i++) {
            const currDate = new Date(sorted[i].timestamp);
            const diff = (currDate - lastDate) / (1000 * 60 * 60 * 24);
            if (diff <= 2) {
              streakCounter++;
              maxStreak = Math.max(maxStreak, streakCounter);
            } else {
              streakCounter = 1;
            }
            lastDate = currDate;
          }
        }

        sorted.forEach(c => totalWaste += parseFloat(c.wasteCollected || 0));

        const earnedBadges = [];
        if (checkInList.length >= 5) earnedBadges.push("🏅 5 Cleanups");
        if (totalWaste >= 50) earnedBadges.push("🧹 50kg Cleanup Champ");
        if (maxStreak >= 3) earnedBadges.push("🔥 3-Day Streaker");

        setBadges(earnedBadges);
        setTotalWasteCollected(totalWaste);
        setStreak(maxStreak);

        // Generate personalized welcome message via Gemini
        if (checkInList.length > 0) {
          setLoadingMessage(true);
          const welcomePrompt = `
            Generate a brief, encouraging welcome message (1-2 sentences) for volunteer ${user.displayName} 
            who has ${ecoScore} EcoScore, collected ${totalWaste}kg waste, and attended ${checkInList.length} events.
            Make it warm and appreciative of their environmental contribution.
          `;
          
          try {
            const message = await fetchGeminiResponse(welcomePrompt);
            setPersonalizedMessage(message);
          } catch (error) {
            console.error('Error generating welcome message:', error);
          }
          setLoadingMessage(false);
        }

      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user.uid]);

  if (loading) return (
    <div className="p-6 text-center text-gray-600">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      Loading your impact profile...
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-blue-800 mb-6">👤 Your Environmental Impact Profile</h2>

      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl mb-6 shadow-lg border border-blue-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xl font-semibold text-blue-900">{user.displayName}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-700">🌱 {ecoScore}</p>
            <p className="text-sm text-gray-500">EcoScore</p>
          </div>
        </div>
        
        {loadingMessage ? (
          <div className="text-sm text-gray-500 italic">✨ Generating your personalized message...</div>
        ) : personalizedMessage ? (
          <div className="text-blue-800 font-medium bg-white/50 p-3 rounded-lg mb-4">
            ✨ {personalizedMessage}
          </div>
        ) : null}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{totalWasteCollected.toFixed(1)}kg</p>
            <p className="text-xs text-gray-500">Waste Collected</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-orange-600">{streak}</p>
            <p className="text-xs text-gray-500">Day Streak</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-purple-600">{checkIns.length}</p>
            <p className="text-xs text-gray-500">Events Joined</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">{badges.length}</p>
            <p className="text-xs text-gray-500">Badges Earned</p>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-2">🏆 Your Badges:</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, idx) => (
                <span key={idx} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        {checkIns.length > 0 && (
          <div className="flex justify-center">
            <ImpactReportButton
              userName={user.displayName}
              ecoScore={ecoScore}
              totalWasteCollected={totalWasteCollected}
              checkIns={checkIns}
              badges={badges}
              streak={streak}
            />
          </div>
        )}
      </div>

      <h3 className="text-xl font-semibold text-gray-800 mb-4">🧾 Your Cleanup History</h3>
      {checkIns.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No cleanups attended yet!</p>
          <p className="text-sm text-gray-400">Join your first beach cleanup event to start making an impact! 🌊</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {checkIns.map((item, idx) => (
            <div key={idx} className="p-4 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <h4 className="font-bold text-blue-700 mb-2">{item.eventTitle}</h4>
              <p className="text-sm text-gray-600 mb-1">📍 {item.eventLocation}</p>
              <p className="text-sm text-gray-500">🕒 {new Date(item.timestamp).toLocaleString()}</p>
              {item.wasteCollected && (
                <p className="text-sm text-green-600 font-medium mt-2">
                  ♻️ {item.wasteCollected}kg waste collected
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}