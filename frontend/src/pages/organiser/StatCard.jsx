import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ stat, showTrend = false, previousValue = null }) => {
  // Calculate trend if previous value is provided
  const getTrend = () => {
    if (!showTrend || previousValue === null || previousValue === 0) return null;
    
    const current = typeof stat.value === 'string' ? parseInt(stat.value) || 0 : stat.value;
    const previous = typeof previousValue === 'string' ? parseInt(previousValue) || 0 : previousValue;
    
    if (previous === 0) return null;
    
    const percentageChange = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(percentageChange).toFixed(1),
      isPositive: percentageChange >= 0,
      change: current - previous
    };
  };

  const trend = getTrend();

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-sm font-medium uppercase tracking-wide">
            {stat.title}
          </p>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-3xl font-bold text-gray-900">
              {stat.value || 0}
            </p>
            {stat.unit && (
              <span className="text-sm text-gray-500 font-medium">
                {stat.unit}
              </span>
            )}
          </div>
          
          {/* Trend Indicator */}
          {trend && (
            <div className={`flex items-center space-x-1 mt-2 ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              <span className="text-xs font-medium">
                {trend.percentage}% {trend.isPositive ? 'increase' : 'decrease'}
              </span>
            </div>
          )}
          
          {/* Subtitle/Description */}
          {stat.subtitle && (
            <p className="text-xs text-gray-500 mt-1">
              {stat.subtitle}
            </p>
          )}
        </div>
        
        {/* Icon Container */}
        <div className={`${stat.color || 'bg-blue-500'} p-3 rounded-lg shadow-lg`}>
          {stat.icon && React.createElement(stat.icon, { 
            className: 'text-white', 
            size: 24 
          })}
        </div>
      </div>
      
      {/* Progress Bar (if progress prop is provided) */}
      {stat.progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{stat.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                stat.color?.replace('bg-', 'bg-') || 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(stat.progress || 0, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Action Button (if action prop is provided) */}
      {stat.action && (
        <button 
          onClick={stat.action.onClick}
          className="w-full mt-4 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {stat.action.label}
        </button>
      )}
    </div>
  );
};

export default StatCard;