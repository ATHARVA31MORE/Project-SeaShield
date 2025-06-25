import React, { useEffect, useState } from 'react';
import { collection, getDocs, getDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { Trophy, Users, Crown, Medal, Star, TrendingUp, Camera, Trash2, Calendar } from 'lucide-react';

const GlobalLeaderboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('individual');
  const [individualLeaders, setIndividualLeaders] = useState([]);
  const [eventTeams, setEventTeams] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentUserTeamRank, setCurrentUserTeamRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [usersCache, setUsersCache] = useState({});

  useEffect(() => {
    if (user?.uid) {
      fetchCurrentUserData();
      
      // Set up real-time listener for users collection to get profile photo updates
      const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const usersData = {};
        snapshot.docs.forEach(doc => {
          usersData[doc.id] = doc.data();
        });
        setUsersCache(usersData);
        
        // Re-fetch leaderboards when user data changes to update profile photos
        fetchLeaderboards(usersData);
      });

      return () => {
        usersUnsubscribe();
      };
    }
  }, [user]);

  const fetchCurrentUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchLeaderboards = async (freshUsersData = null) => {
    try {
      const usersData = freshUsersData || usersCache;
      await Promise.all([
        fetchIndividualLeaderboard(usersData),
        fetchEventTeams(usersData)
      ]);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndividualLeaderboard = async (usersData = {}) => {
    try {
      const usersRef = collection(db, 'users');
      const volunteersQuery = query(usersRef, where('userType', '==', 'volunteer'));
      const snapshot = await getDocs(volunteersQuery);
      
      const users = snapshot.docs.map(doc => {
        const userData = doc.data();
        const cachedData = usersData[doc.id] || {};
        
        return {
          id: doc.id,
          ...userData,
          // Use cached data for real-time updates, especially for profile photos
          profilePhoto: cachedData.profilePhoto || userData.profilePhoto,
          photoURL: cachedData.photoURL || userData.photoURL,
          displayName: cachedData.displayName || userData.displayName,
          firstName: cachedData.firstName || userData.firstName,
          lastName: cachedData.lastName || userData.lastName
        };
      });

      // Filter out users with no ecoScore and sort by ecoScore
      const validUsers = users.filter(user => user.ecoScore && user.ecoScore > 0);
      validUsers.sort((a, b) => (b.ecoScore || 0) - (a.ecoScore || 0));
      
      setIndividualLeaders(validUsers);
      
      // Find current user's rank
      const userRank = validUsers.findIndex(u => u.id === user.uid);
      if (userRank !== -1) {
        setCurrentUserRank({
          rank: userRank + 1,
          user: validUsers[userRank]
        });
      }
    } catch (error) {
      console.error('Error fetching individual leaderboard:', error);
    }
  };

  const fetchEventTeams = async (usersData = {}) => {
    try {
      // First, get all events
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);

      // Get all check-ins with assigned teams
      const checkinsSnapshot = await getDocs(collection(db, 'checkins'));
      const checkinsData = checkinsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group check-ins by event and team
      const eventTeamsMap = {};
      
      for (const checkin of checkinsData) {
        if (checkin.assignedTeam && checkin.teamAssigned) {
          const eventId = checkin.eventId;
          const teamId = checkin.assignedTeam;
          
          if (!eventTeamsMap[eventId]) {
            eventTeamsMap[eventId] = {};
          }
          
          if (!eventTeamsMap[eventId][teamId]) {
            eventTeamsMap[eventId][teamId] = {
              teamId,
              eventId,
              members: [],
              totalWasteCollected: 0,
              totalPhotoUploads: 0,
              totalEcoScore: 0
            };
          }
          
          // Get user details from cache or fallback to checkin data
          const cachedUserData = usersData[checkin.userId] || {};
          
          eventTeamsMap[eventId][teamId].members.push({
            id: checkin.userId,
            name: cachedUserData.displayName || cachedUserData.firstName || checkin.userName || 'Anonymous',
            email: cachedUserData.email || checkin.userEmail || '',
            profilePhoto: cachedUserData.profilePhoto || cachedUserData.photoURL || null,
            wasteCollected: checkin.wasteCollected || 0,
            photoUploads: checkin.proofPhoto ? 1 : 0, // बदलें: photoUploads को proofPhoto से अपडेट करें
            ecoScore: cachedUserData.ecoScore || 0
          });
          
          eventTeamsMap[eventId][teamId].totalWasteCollected += checkin.wasteCollected || 0;
          eventTeamsMap[eventId][teamId].totalPhotoUploads += checkin.proofPhoto ? 1 : 0; // बदलें: totalPhotoUploads को proofPhoto से अपडेट करें
          eventTeamsMap[eventId][teamId].totalEcoScore += cachedUserData.ecoScore || 0;
        }
      }

      // Convert to array and add event details
      const teamsList = [];
      for (const [eventId, teams] of Object.entries(eventTeamsMap)) {
        const eventDetails = eventsData.find(e => e.id === eventId);
        for (const team of Object.values(teams)) {
          teamsList.push({
            ...team,
            eventName: eventDetails?.title || 'Unknown Event',
            eventDate: eventDetails?.date || null,
            memberCount: team.members.length,
            avgEcoScore: team.members.length > 0 ? Math.round(team.totalEcoScore / team.members.length) : 0
          });
        }
      }

      // Sort by total waste collected (or total eco score)
      teamsList.sort((a, b) => (b.totalWasteCollected + b.totalPhotoUploads * 10) - (a.totalWasteCollected + a.totalPhotoUploads * 10));
      
      setEventTeams(teamsList);
      
      // Find current user's team rank
      const userTeamRank = teamsList.findIndex(team => 
        team.members.some(member => member.id === user.uid)
      );
      if (userTeamRank !== -1) {
        setCurrentUserTeamRank({
          rank: userTeamRank + 1,
          team: teamsList[userTeamRank]
        });
      }
    } catch (error) {
      console.error('Error fetching event teams:', error);
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🏅';
    }
  };

  const getRankColor = (index) => {
    switch (index) {
      case 0: return 'text-yellow-600 bg-yellow-50';
      case 1: return 'text-gray-600 bg-gray-50';
      case 2: return 'text-orange-600 bg-orange-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown Date';
    }
  };

  // Fixed profile image component with proper fallback handling
  const ProfileImage = ({ user, size = 'small' }) => {
    const [imageError, setImageError] = useState(false);
    const profilePhotoUrl = user.profilePhoto || user.photoURL;
    const userName = user.displayName || user.firstName || user.name || 'Anonymous';
    const sizeClasses = size === 'large' ? 'w-10 h-10' : 'w-8 h-8';
    
    if (profilePhotoUrl && !imageError) {
      return (
        <img 
          src={profilePhotoUrl} 
          alt={userName}
          className={`${sizeClasses} rounded-full object-cover`}
          onError={() => setImageError(true)}
        />
      );
    }
    
    return (
      <div className={`${sizeClasses} bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center text-white font-bold ${size === 'large' ? 'text-lg' : 'text-sm'}`}>
        {userName.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 pt-24 pb-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
            🏆 Global Leaderboard
          </h1>
          <p className="text-gray-600 text-lg">Champions of Environmental Action</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white/50 p-1 rounded-lg mb-8 backdrop-blur-sm max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all duration-300 ${
              activeTab === 'individual'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            <Trophy className="inline-block w-5 h-5 mr-2" />
            Individual
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all duration-300 ${
              activeTab === 'teams'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            <Users className="inline-block w-5 h-5 mr-2" />
            Event Teams
          </button>
        </div>

        {/* Current User/Team Rank Card */}
        {(currentUserRank || currentUserTeamRank) && (
          <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              {activeTab === 'individual' && currentUserRank ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Star className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm opacity-90">Your Rank</div>
                      <div className="text-2xl font-bold">#{currentUserRank.rank}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-90">Your EcoScore</div>
                    <div className="text-2xl font-bold">{currentUserRank.user.ecoScore}</div>
                  </div>
                </>
              ) : activeTab === 'teams' && currentUserTeamRank ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm opacity-90">Team Rank</div>
                      <div className="text-2xl font-bold">#{currentUserTeamRank.rank}</div>
                      <div className="text-sm opacity-90">{currentUserTeamRank.team.teamId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-90">Team Contribution</div>
                    <div className="text-2xl font-bold">{currentUserTeamRank.team.totalWasteCollected}kg</div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <TrendingUp className="w-8 h-8" />
                  <div>
                    <div className="text-lg font-semibold">Keep Going!</div>
                    <div className="text-sm opacity-90">
                      {activeTab === 'individual' 
                        ? 'Participate in events to earn your first EcoScore points'
                        : 'Join a team to compete in team leaderboards'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Individual Leaderboard */}
        {activeTab === 'individual' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                Top Eco-Warriors
              </h2>
              <p className="text-gray-600">Individual volunteers ranked by EcoScore</p>
            </div>
            
            <div className="p-6">
              {individualLeaders.length > 0 ? (
                <div className="space-y-4">
                  {individualLeaders.slice(0, 20).map((volunteer, index) => (
                    <div
                      key={volunteer.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-300 hover:shadow-md ${
                        volunteer.id === user.uid ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRankColor(index)}`}>
                          {index < 3 ? getRankIcon(index) : `#${index + 1}`}
                        </div>
                        <div className="flex items-center gap-3">
                          <ProfileImage user={volunteer} size="large" />
                          <div>
                            <p className="font-semibold text-gray-800">
                              {volunteer.displayName || `${volunteer.firstName} ${volunteer.lastName}` || 'Anonymous'}
                              {volunteer.id === user.uid && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{volunteer.email}</p>
                            {volunteer.teamId && (
                              <p className="text-xs text-blue-600 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Team Member
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">{volunteer.ecoScore}</div>
                        <div className="text-sm text-gray-500">EcoScore</div>
                        {volunteer.eventsAttended && (
                          <div className="text-xs text-gray-400">{volunteer.eventsAttended} events</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No rankings yet</h3>
                  <p className="text-gray-600">Be the first to earn EcoScore points!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Teams Leaderboard */}
        {activeTab === 'teams' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-blue-500" />
                Event Team Leaderboard
              </h2>
              <p className="text-gray-600">Teams formed for events ranked by contribution</p>
            </div>
            
            <div className="p-6">
              {eventTeams.length > 0 ? (
                <div className="space-y-6">
                  {eventTeams.slice(0, 20).map((team, index) => (
                    <div
                      key={`${team.eventId}-${team.teamId}`}
                      className={`p-6 rounded-lg border transition-all duration-300 hover:shadow-md ${
                        team.members.some(member => member.id === user.uid) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${getRankColor(index)}`}>
                            {index < 3 ? getRankIcon(index) : `#${index + 1}`}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                              {team.teamId}
                              {team.members.some(member => member.id === user.uid) && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  Your Team
                                </span>
                              )}
                            </h3>
                            <p className="text-gray-600 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {team.eventName} - {formatDate(team.eventDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{team.totalWasteCollected}kg</div>
                          <div className="text-sm text-gray-500">Waste Collected</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center bg-white/50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{team.memberCount}</div>
                          <div className="text-xs text-gray-500">Members</div>
                        </div>
                        <div className="text-center bg-white/50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-green-600">{team.totalWasteCollected}kg</div>
                          <div className="text-xs text-gray-500">Waste</div>
                        </div>
                        <div className="text-center bg-white/50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">{team.totalPhotoUploads}</div>
                          <div className="text-xs text-gray-500">Photos</div>
                        </div>
                        <div className="text-center bg-white/50 p-3 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">{team.avgEcoScore}</div>
                          <div className="text-xs text-gray-500">Avg Score</div>
                        </div>
                      </div>

                      {/* Team Members */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700 mb-2">Team Members:</h4>
                        {team.members.map((member, memberIndex) => (
                          <div key={member.id} className="flex items-center justify-between bg-white/50 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <ProfileImage user={member} size="small" />
                              <div>
                                <p className="font-medium text-gray-800">
                                  {member.name}
                                  {member.id === user.uid && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <div className="flex items-center gap-1">
                                  <Trash2 className="w-3 h-3 text-green-600" />
                                  <span className="font-medium">{member.wasteCollected}kg</span>
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-purple-600" />
                                  <span className="font-medium">{member.photoUploads}</span>
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-orange-600" />
                                  <span className="font-medium">{member.ecoScore}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No event teams yet</h3>
                  <p className="text-gray-600">Form teams for events to see them here!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalLeaderboard;