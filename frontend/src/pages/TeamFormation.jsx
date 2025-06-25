import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import { Users, Plus, Search, Crown, UserPlus, UserMinus, Trophy, Target } from 'lucide-react';

const TeamFormation = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('myTeam');
  const [userTeam, setUserTeam] = useState(null);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);

  useEffect(() => {
    if (user?.uid) {
      fetchUserData();
      fetchTeams();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        
        // Check if user is already in a team
        if (data.teamId) {
          const teamDoc = await getDoc(doc(db, 'teams', data.teamId));
          if (teamDoc.exists()) {
            const teamData = { id: teamDoc.id, ...teamDoc.data() };
            
            // Fetch team members details
            const memberPromises = teamData.members.map(async (memberId) => {
              const memberDoc = await getDoc(doc(db, 'users', memberId));
              return memberDoc.exists() ? { id: memberId, ...memberDoc.data() } : null;
            });
            
            const memberDetails = await Promise.all(memberPromises);
            teamData.memberDetails = memberDetails.filter(member => member !== null);
            
            setUserTeam(teamData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const teamsQuery = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teams = [];
      
      for (const teamDoc of teamsSnapshot.docs) {
        const teamData = { id: teamDoc.id, ...teamDoc.data() };
        
        // Calculate team stats
        let totalScore = 0;
        const memberPromises = teamData.members.map(async (memberId) => {
          const memberDoc = await getDoc(doc(db, 'users', memberId));
          if (memberDoc.exists()) {
            const memberData = memberDoc.data();
            totalScore += memberData.ecoScore || 0;
            return { id: memberId, ...memberData };
          }
          return null;
        });
        
        const memberDetails = await Promise.all(memberPromises);
        teamData.memberDetails = memberDetails.filter(member => member !== null);
        teamData.totalScore = totalScore;
        teamData.avgScore = teamData.members.length > 0 ? Math.round(totalScore / teamData.members.length) : 0;
        
        teams.push(teamData);
      }
      
      // Sort by total score
      teams.sort((a, b) => b.totalScore - a.totalScore);
      setAvailableTeams(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    
    try {
      const teamData = {
        name: newTeamName.trim(),
        description: newTeamDescription.trim(),
        captainId: user.uid,
        members: [user.uid],
        createdAt: new Date(),
        totalScore: userData?.ecoScore || 0,
        isPublic: true,
        maxMembers: 10
      };
      
      const teamRef = await addDoc(collection(db, 'teams'), teamData);
      
      // Update user document with team ID
      await updateDoc(doc(db, 'users', user.uid), {
        teamId: teamRef.id,
        teamRole: 'captain'
      });
      
      setNewTeamName('');
      setNewTeamDescription('');
      setShowCreateForm(false);
      fetchUserData();
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const joinTeam = async (teamId) => {
    try {
      // Add join request
      await addDoc(collection(db, 'joinRequests'), {
        teamId,
        userId: user.uid,
        userName: userData?.displayName || `${userData?.firstName} ${userData?.lastName}` || 'Anonymous',
        userEmail: userData?.email || '',
        userScore: userData?.ecoScore || 0,
        status: 'pending',
        createdAt: new Date()
      });
      
      alert('Join request sent! Wait for team captain approval.');
    } catch (error) {
      console.error('Error sending join request:', error);
    }
  };

  const leaveTeam = async () => {
    if (!userTeam) return;
    
    try {
      // Remove user from team members
      await updateDoc(doc(db, 'teams', userTeam.id), {
        members: arrayRemove(user.uid)
      });
      
      // Remove team info from user
      await updateDoc(doc(db, 'users', user.uid), {
        teamId: null,
        teamRole: null
      });
      
      // If user was captain and team has other members, assign new captain
      if (userTeam.captainId === user.uid && userTeam.members.length > 1) {
        const newCaptain = userTeam.members.find(id => id !== user.uid);
        await updateDoc(doc(db, 'teams', userTeam.id), {
          captainId: newCaptain
        });
        await updateDoc(doc(db, 'users', newCaptain), {
          teamRole: 'captain'
        });
      }
      
      // If team becomes empty, delete it
      if (userTeam.members.length === 1) {
        await deleteDoc(doc(db, 'teams', userTeam.id));
      }
      
      setUserTeam(null);
      fetchUserData();
      fetchTeams();
    } catch (error) {
      console.error('Error leaving team:', error);
    }
  };

  const filteredTeams = availableTeams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    team.id !== userTeam?.id &&
    team.members.length < (team.maxMembers || 10)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100">
      <div className="container mx-auto px-4 pt-24 pb-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
            🏆 Team Formation
          </h1>
          <p className="text-gray-600 text-lg">Join forces for maximum environmental impact!</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white/50 p-1 rounded-lg mb-8 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('myTeam')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all duration-300 ${
              activeTab === 'myTeam'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            <Users className="inline-block w-5 h-5 mr-2" />
            My Team
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all duration-300 ${
              activeTab === 'browse'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            <Search className="inline-block w-5 h-5 mr-2" />
            Browse Teams
          </button>
        </div>

        {/* My Team Tab */}
        {activeTab === 'myTeam' && (
          <div className="space-y-6">
            {userTeam ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <Trophy className="text-yellow-500" />
                      {userTeam.name}
                    </h2>
                    <p className="text-gray-600">{userTeam.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">{userTeam.totalScore}</div>
                    <div className="text-sm text-gray-500">Total EcoScore</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{userTeam.members.length}</div>
                    <div className="text-sm text-blue-600">Team Members</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{userTeam.avgScore}</div>
                    <div className="text-sm text-green-600">Average Score</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Members
                  </h3>
                  <div className="space-y-3">
                    {userTeam.memberDetails?.map(member => (
                      <div key={member.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            {userTeam.captainId === member.id ? (
                              <Crown className="w-5 h-5 text-yellow-500" />
                            ) : (
                              <Users className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {member.displayName || `${member.firstName} ${member.lastName}` || 'Anonymous'}
                              {userTeam.captainId === member.id && (
                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                                  Captain
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{member.ecoScore || 0}</div>
                          <div className="text-xs text-gray-500">EcoScore</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  {userTeam.captainId === user.uid && (
                    <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                      Manage Team
                    </button>
                  )}
                  <button 
                    onClick={leaveTeam}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Leave Team
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center border border-gray-200">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">You're not in a team yet</h2>
                <p className="text-gray-600 mb-6">Join an existing team or create your own to amplify your environmental impact!</p>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Team
                  </button>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Browse Teams
                  </button>
                </div>

                {showCreateForm && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Create New Team</h3>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Team Name"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      />
                      <textarea
                        placeholder="Team Description (optional)"
                        value={newTeamDescription}
                        onChange={(e) => setNewTeamDescription(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg h-24"
                      />
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={createTeam}
                          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Create Team
                        </button>
                        <button
                          onClick={() => setShowCreateForm(false)}
                          className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Browse Teams Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white/70 backdrop-blur-sm"
                />
              </div>
              {!userTeam && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Team
                </button>
              )}
            </div>

            <div className="grid gap-6">
              {filteredTeams.map((team, index) => (
                <div key={team.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
                        <p className="text-gray-600">{team.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{team.totalScore}</div>
                      <div className="text-sm text-gray-500">Total Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{team.members.length}</div>
                      <div className="text-xs text-gray-500">Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{team.avgScore}</div>
                      <div className="text-xs text-gray-500">Avg Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">{team.maxMembers - team.members.length}</div>
                      <div className="text-xs text-gray-500">Open Spots</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {team.memberDetails?.slice(0, 4).map(member => (
                        <div key={member.id} className="w-8 h-8 bg-blue-100 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {(member.displayName || member.firstName || 'A').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      ))}
                      {team.members.length > 4 && (
                        <div className="w-8 h-8 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-xs font-medium">+{team.members.length - 4}</span>
                        </div>
                      )}
                    </div>
                    
                    {!userTeam && (
                      <button
                        onClick={() => joinTeam(team.id)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Request to Join
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredTeams.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No teams found</h3>
                <p className="text-gray-600">Be the first to create a team!</p>
              </div>
            )}

            {showCreateForm && (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Create New Team</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Team Name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <textarea
                    placeholder="Team Description (optional)"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg h-24"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={createTeam}
                      className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Create Team
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamFormation;