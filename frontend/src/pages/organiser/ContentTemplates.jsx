import React, { useState } from 'react';
import { Copy, Globe, Mail, BarChart3, Users } from 'lucide-react';

const ContentTemplates = ({ events = [], volunteers = [], checkins = [], stats = [] }) => {
  const [aiOutput, setAiOutput] = useState('');

  const generateContent = (type) => {
    // Filter upcoming events that are not cancelled
    const upcomingEvents = events.filter(event => 
      event.status !== 'cancelled' && new Date(event.date) >= new Date()
    );
    
    // Calculate real stats from props
    const realStats = {
      totalEvents: events.length,
      totalVolunteers: volunteers.length,
      totalCheckIns: checkins.length,
      upcomingEvents: upcomingEvents.length,
      beachesCleaned: events.filter(e => e.status !== 'cancelled' && new Date(e.date) < new Date()).length,
      wasteCollected: events.reduce((total, event) => {
        if (event.status !== 'cancelled' && new Date(event.date) < new Date()) {
          return total + (event.wasteTarget || 0);
        }
        return total;
      }, 0)
    };

    let template = '';

    switch (type) {
      case 'social_post':
        const nextEvent = upcomingEvents[0];
        template = `🌊 Join us for our upcoming beach cleanup event!\n\n${
          nextEvent 
            ? `📅 ${nextEvent.title}\n📍 ${nextEvent.location}\n🗓️ ${new Date(nextEvent.date).toLocaleDateString()}\n⏰ ${nextEvent.time || 'Time TBD'}`
            : '📅 Beach Cleanup Event\n📍 Location TBD\n🗓️ Date TBD'
        }\n\nTogether we can make a difference! 🌍\n#BeachCleanup #OceanConservation #CommunityAction #SaveOurOceans\n\nWho's joining us? Tag a friend! 👥`;
        break;

      case 'email_campaign':
        const featuredEvent = upcomingEvents[0];
        template = `Subject: Join Our Beach Cleanup Initiative - Make a Difference!\n\nDear Volunteer,\n\nWe hope this message finds you well and as passionate about ocean conservation as ever!\n\nWe're excited to invite you to our upcoming beach cleanup event where we'll work together to protect our beautiful coastlines and marine life.\n\nEVENT DETAILS:\n${
          featuredEvent 
            ? `• Event: ${featuredEvent.title}\n• Date: ${new Date(featuredEvent.date).toLocaleDateString()}\n• Location: ${featuredEvent.location}\n• Time: ${featuredEvent.time || 'TBD'}\n• Target: ${featuredEvent.wasteTarget || 0}kg waste collection`
            : '• Event details will be updated soon'
        }\n\nWHAT TO EXPECT:\n• Community of ${realStats.totalVolunteers} like-minded environmental advocates\n• All cleanup supplies provided\n• Refreshments and snacks\n• Certificate of participation\n• The satisfaction of making a real impact!\n\nOUR IMPACT SO FAR:\n• ${realStats.beachesCleaned} beaches cleaned\n• ${realStats.wasteCollected}kg of waste collected\n• ${realStats.totalCheckIns} volunteer participations\n\nREGISTER NOW: [Registration Link]\n\nTogether, we can make our beaches cleaner and our oceans healthier. Every piece of trash collected makes a difference!\n\nThank you for being an ocean hero! 🌊\n\nBest regards,\n[Organization Name]`;
        break;

      case 'impact_report':
        template = `🌊 BEACH CLEANUP IMPACT REPORT 🌊\n\nWe're thrilled to share the incredible impact our community has made:\n\n📊 KEY ACHIEVEMENTS:\n• ${realStats.beachesCleaned} beaches restored and protected\n• ${(realStats.wasteCollected / 1000).toFixed(1)} tons of waste removed from our coastlines\n• ${realStats.totalVolunteers} dedicated volunteers in our community\n• ${realStats.totalCheckIns} total volunteer participations\n• ${realStats.upcomingEvents} upcoming cleanup events scheduled\n\n🌍 ENVIRONMENTAL IMPACT:\n- Cleaner, safer beaches for wildlife and families\n- Reduced plastic pollution in marine ecosystems\n- Increased community awareness about ocean conservation\n- A model for sustainable environmental action\n\n👥 COMMUNITY IMPACT:\n- Stronger bonds within our environmental community\n- Educational opportunities for ${realStats.totalVolunteers} participants\n- Inspiration for future conservation efforts\n- A legacy of environmental stewardship\n\n📈 GROWTH METRICS:\n- ${realStats.totalEvents} total events organized\n- Average ${realStats.totalCheckIns > 0 ? (realStats.totalCheckIns / realStats.totalEvents).toFixed(1) : 0} volunteers per event\n- ${realStats.wasteCollected > 0 ? (realStats.wasteCollected / realStats.beachesCleaned || 1).toFixed(1) : 0}kg average waste collected per beach\n\nThank you to every volunteer who made this possible. Together, we're creating a cleaner, healthier planet! 🌱\n\n#OceanConservation #CommunityImpact #BeachCleanup`;
        break;

      case 'volunteer_matching':
        const avgVolunteersPerEvent = realStats.totalEvents > 0 ? Math.round(realStats.totalCheckIns / realStats.totalEvents) : 0;
        template = `🎯 OPTIMAL VOLUNTEER TEAM COMPOSITION\n\nBased on our ${realStats.totalVolunteers} registered volunteers and ${avgVolunteersPerEvent} average attendance:\n\nRECOMMENDED TEAM STRUCTURE:\n\n👥 COLLECTION TEAMS (60% of volunteers)\n- ${Math.round(avgVolunteersPerEvent * 0.6)} volunteers for debris collection\n- 4-6 volunteers per collection team\n- Focus on debris collection and sorting\n- Mix of experienced and new volunteers\n\n🧹 SPECIALIZED ROLES (25% of volunteers)\n- Data Collectors: ${Math.round(avgVolunteersPerEvent * 0.1)} volunteers\n- Heavy Lifting Team: ${Math.round(avgVolunteersPerEvent * 0.08)} volunteers\n- Photography Team: ${Math.round(avgVolunteersPerEvent * 0.04)} volunteers\n- Safety Coordinators: ${Math.round(avgVolunteersPerEvent * 0.03)} volunteers\n\n🎯 LEADERSHIP ROLES (15% of volunteers)\n- Team Leaders: ${Math.round(avgVolunteersPerEvent * 0.1)} leaders\n- Equipment Managers: ${Math.round(avgVolunteersPerEvent * 0.03)} managers\n- Registration Coordinators: ${Math.round(avgVolunteersPerEvent * 0.02)} coordinators\n\n💡 OPTIMIZATION TIPS:\n- Target waste collection: ${realStats.wasteCollected > 0 ? (realStats.wasteCollected / realStats.beachesCleaned || 1).toFixed(1) : 50}kg per event\n- Assign experienced volunteers as team leaders\n- Pair newcomers with seasoned volunteers\n- Rotate roles to prevent fatigue\n- Ensure clear communication channels\n\n📊 SUCCESS METRICS:\n- Current success rate: ${realStats.totalEvents > 0 ? ((realStats.beachesCleaned / realStats.totalEvents) * 100).toFixed(1) : 0}%\n- Average volunteer retention: High community engagement\n- Target efficiency: ${avgVolunteersPerEvent > 0 ? (realStats.wasteCollected / avgVolunteersPerEvent).toFixed(1) : 0}kg per volunteer`;
        break;

      default:
        template = 'Please choose a valid template type.';
    }

    setAiOutput(template);
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Content copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Content Templates</h1>
        <div className="text-sm text-gray-600">
          Based on {events.length} events, {volunteers.length} volunteers, {checkins.length} check-ins
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TemplateCard 
          title="Social Media Post" 
          icon={Globe} 
          action={() => generateContent('social_post')} 
          color="bg-blue-500"
          description="Generate engaging social media content for upcoming events"
        />
        <TemplateCard 
          title="Email Campaign" 
          icon={Mail} 
          action={() => generateContent('email_campaign')} 
          color="bg-green-500"
          description="Create professional email campaigns for volunteer recruitment"
        />
        <TemplateCard 
          title="Impact Report" 
          icon={BarChart3} 
          action={() => generateContent('impact_report')} 
          color="bg-purple-500"
          description="Showcase your environmental impact with data-driven reports"
        />
        <TemplateCard 
          title="Volunteer Guide" 
          icon={Users} 
          action={() => generateContent('volunteer_matching')} 
          color="bg-orange-500"
          description="Optimize team structure and volunteer assignments"
        />
      </div>

      {aiOutput && (
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Generated Content</h2>
            <button
              onClick={() => handleCopyToClipboard(aiOutput)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Copy size={16} />
              <span>Copy</span>
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
              {aiOutput}
            </pre>
          </div>
          <div className="mt-4 text-xs text-gray-500 border-t pt-3">
            Generated based on real-time data • {new Date().toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

const TemplateCard = ({ title, icon: Icon, action, color, description }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-gray-200">
    <div className={`${color} p-3 rounded-lg w-fit mb-4 shadow-md`}>
      <Icon className="text-white" size={24} />
    </div>
    <h3 className="font-semibold text-lg text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{description}</p>
    <button
      onClick={action}
      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-sm font-medium"
    >
      Generate Template
    </button>
  </div>
);

export default ContentTemplates;