import React from 'react';

const Analytics = ({ events, checkins, volunteers, stats }) => {
  const completedEvents = events?.filter(event => 
    new Date(event?.date) < new Date() && event?.status !== 'cancelled'
  ) || [];

  const monthlyData = {};
  completedEvents.forEach(event => {
    const month = new Date(event.date).toLocaleString('default', { month: 'short' });
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  const topLocations = {};
  completedEvents.forEach(event => {
    if (event.location) {
      topLocations[event.location] = (topLocations[event.location] || 0) + 1;
    }
  });

  const totalVolunteers = volunteers?.length || 0;
  const totalCheckins = checkins?.length || 0;
  const avgEventsPerVolunteer = totalVolunteers > 0 ? (totalCheckins / totalVolunteers).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats && stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                {stat.icon && React.createElement(stat.icon, { className: 'text-white', size: 24 })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Event Trends</h2>
          <div className="space-y-4">
            {Object.keys(monthlyData).length > 0 ? Object.entries(monthlyData).map(([month, count]) => (
              <div key={month} className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">{month}</span>
                <div className="flex items-center space-x-2">
                  <div 
                    className="bg-blue-200 h-3 rounded-full transition-all" 
                    style={{ width: `${Math.max(count * 40, 20)}px` }}
                  ></div>
                  <span className="text-sm font-medium min-w-[20px]">{count}</span>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No completed events yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Cleanup Locations</h2>
          <div className="space-y-4">
            {Object.keys(topLocations).length > 0 ? Object.entries(topLocations)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([location, count]) => (
                <div key={location} className="flex items-center justify-between">
                  <span className="text-gray-600 flex-1 truncate">{location}</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium ml-2">
                    {count} event{count > 1 ? 's' : ''}
                  </span>
                </div>
              )) : (
              <p className="text-gray-500 text-center py-8">No location data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Volunteer Engagement</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <div className="text-4xl font-bold text-blue-600 mb-2">{totalVolunteers}</div>
            <div className="text-gray-600 font-medium">Total Volunteers</div>
          </div>
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <div className="text-4xl font-bold text-green-600 mb-2">{totalCheckins}</div>
            <div className="text-gray-600 font-medium">Total Check-ins</div>
          </div>
          <div className="text-center p-6 bg-purple-50 rounded-lg">
            <div className="text-4xl font-bold text-purple-600 mb-2">{avgEventsPerVolunteer}</div>
            <div className="text-gray-600 font-medium">Avg. Events per Volunteer</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Status Overview</h2>
        <div className="space-y-4">
          {events && events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 mb-1">
                  {events.filter(e => new Date(e?.date) >= new Date() && e?.status !== 'cancelled').length}
                </div>
                <div className="text-yellow-800 font-medium">Upcoming</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {completedEvents.length}
                </div>
                <div className="text-green-800 font-medium">Completed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {events.filter(e => e?.status === 'cancelled').length}
                </div>
                <div className="text-red-800 font-medium">Cancelled</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {events.length}
                </div>
                <div className="text-blue-800 font-medium">Total Events</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No events data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;