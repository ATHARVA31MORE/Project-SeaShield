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
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);

  // Check if user qualifies for certificate
  const qualifiesForCertificate = checkIns.length >= 5 || totalWasteCollected >= 50;

  const generateCertificate = async () => {
    setIsGeneratingCertificate(true);
    
    try {
      // Create canvas for certificate
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size (A4 landscape proportions)
      const width = 1200;
      const height = 850;
      canvas.width = width;
      canvas.height = height;
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f0fdf4');
      gradient.addColorStop(1, '#ecfdf5');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Border
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, width - 40, height - 40);
      
      // Inner decorative border
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, width - 80, height - 80);
      
      // Top decorative bar
      const topGradient = ctx.createLinearGradient(0, 0, width, 0);
      topGradient.addColorStop(0, '#22c55e');
      topGradient.addColorStop(0.33, '#3b82f6');
      topGradient.addColorStop(0.66, '#8b5cf6');
      topGradient.addColorStop(1, '#f59e0b');
      ctx.fillStyle = topGradient;
      ctx.fillRect(40, 40, width - 80, 20);
      
      // Title
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 60px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 ENVIRONMENTAL WARRIOR', width / 2, 150);
      
      // Subtitle
      ctx.fillStyle = '#059669';
      ctx.font = 'italic 28px Georgia, serif';
      ctx.fillText('Certificate of Achievement', width / 2, 190);
      
      // Awarded to text
      ctx.fillStyle = '#374151';
      ctx.font = '22px Georgia, serif';
      ctx.fillText('This certificate is proudly awarded to', width / 2, 280);
      
      // Name with underline
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 44px Georgia, serif';
      const nameText = user.displayName;
      const nameMetrics = ctx.measureText(nameText);
      ctx.fillText(nameText, width / 2, 340);
      
      // Name underline
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - nameMetrics.width / 2, 355);
      ctx.lineTo(width / 2 + nameMetrics.width / 2, 355);
      ctx.stroke();
      
      // Achievement description
      ctx.fillStyle = '#374151';
      ctx.font = '20px Georgia, serif';
      ctx.textAlign = 'center';
      const achievementLines = [
        'In recognition of outstanding dedication to environmental conservation',
        'and making a significant positive impact on our planet through',
        'beach cleanup activities and waste collection efforts.'
      ];
      
      achievementLines.forEach((line, index) => {
        ctx.fillText(line, width / 2, 420 + (index * 30));
      });
      
      // Stats background
      ctx.fillStyle = '#f0fdf4';
      ctx.strokeStyle = '#bbf7d0';
      ctx.lineWidth = 2;
      const statsX = 150;
      const statsY = 540;
      const statsWidth = width - 300;
      const statsHeight = 120;
      ctx.fillRect(statsX, statsY, statsWidth, statsHeight);
      ctx.strokeRect(statsX, statsY, statsWidth, statsHeight);
      
      // Stats
      const stats = [
        { number: checkIns.length, label: 'Cleanup Events' },
        { number: `${totalWasteCollected.toFixed(1)}kg`, label: 'Waste Collected' },
        { number: ecoScore, label: 'EcoScore Points' },
        { number: badges.length, label: 'Badges Earned' }
      ];
      
      const statWidth = statsWidth / 4;
      stats.forEach((stat, index) => {
        const statX = statsX + (index * statWidth) + (statWidth / 2);
        
        // Stat number
        ctx.fillStyle = '#15803d';
        ctx.font = 'bold 32px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(stat.number.toString(), statX, 590);
        
        // Stat label
        ctx.fillStyle = '#374151';
        ctx.font = '16px Georgia, serif';
        ctx.fillText(stat.label, statX, 620);
      });
      
      // Date
      ctx.fillStyle = '#6b7280';
      ctx.font = '18px Georgia, serif';
      ctx.textAlign = 'left';
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      ctx.fillText(`Awarded on ${currentDate}`, 80, 750);
      
      // Signature section
      ctx.textAlign = 'right';
      ctx.fillText('Environmental Protection Authority', width - 80, 780);
      
      // Signature line
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width - 280, 760);
      ctx.lineTo(width - 80, 760);
      ctx.stroke();
      
      // Background eco icons
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
      ctx.font = '60px Arial, sans-serif';
      ctx.textAlign = 'center';
      
      // Position eco icons
      const icons = ['🌱', '♻️', '🌊', '🌍'];
      const iconPositions = [
        { x: 150, y: 200 },
        { x: width - 150, y: 250 },
        { x: 150, y: height - 150 },
        { x: width - 150, y: height - 100 }
      ];
      
      icons.forEach((icon, index) => {
        const pos = iconPositions[index];
        ctx.fillText(icon, pos.x, pos.y);
      });
      
      // Convert canvas to blob and download as PNG
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Environmental_Warrior_Certificate_${user.displayName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);
      
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Failed to generate certificate. Please try again.');
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

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

        {/* Environmental Warrior Certificate Section */}
        {qualifiesForCertificate && (
          <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-green-50 rounded-lg border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-green-800 mb-1">🏆 Environmental Warrior Qualified!</h4>
                <p className="text-sm text-gray-700">
                  Congratulations! You've earned the right to download your official Environmental Warrior Certificate.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Qualified by: {checkIns.length >= 5 ? `${checkIns.length} cleanup events` : ''}
                  {checkIns.length >= 5 && totalWasteCollected >= 50 ? ' & ' : ''}
                  {totalWasteCollected >= 50 ? `${totalWasteCollected.toFixed(1)}kg waste collected` : ''}
                </p>
              </div>
              <button
                onClick={generateCertificate}
                disabled={isGeneratingCertificate}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isGeneratingCertificate ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    🖼️ Download Certificate (PNG)
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          {checkIns.length > 0 && (
            <ImpactReportButton
              userName={user.displayName}
              ecoScore={ecoScore}
              totalWasteCollected={totalWasteCollected}
              checkIns={checkIns}
              badges={badges}
              streak={streak}
            />
          )}
        </div>
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