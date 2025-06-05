import React, { useState, useEffect } from 'react';
import { 
  User, 
  Download, 
  Printer, 
  Waves, 
  Users, 
  Trash2, 
  Leaf,
  Heart,
  Building2,
  RefreshCw,
  Calendar,
  MapPin,
  Award
} from 'lucide-react';

const HomePage = () => {
  // Mock user data - replace with actual auth context
  const [user, setUser] = useState({
    displayName: 'Priya Sharma',
    userType: 'volunteer',
    email: 'priya.sharma@email.com',
    organization: 'Mumbai Beach Warriors'
  });

  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [impactSummary, setImpactSummary] = useState('');
  const [ecoTip, setEcoTip] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock Gemini API function - replace with actual API call
  const fetchGeminiResponse = async (prompt) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock responses based on prompt type
    if (prompt.includes('welcome')) {
      return `Hello ${user.displayName}! 🌊 Welcome back to our Mumbai Beach Cleanup community. As a dedicated ${user.userType}, you're making waves of positive change along our beautiful coastline. Your commitment to environmental conservation is truly inspiring - every piece of plastic you remove makes our beaches cleaner and our marine life safer. Together, we're creating a cleaner, greener Mumbai! 🏖️✨`;
    }
    
    if (prompt.includes('impact summary')) {
      return `This month, our incredible Mumbai Beach Cleanup community achieved remarkable results! 🌟 With 47 passionate volunteers participating across 5 major cleanup events, we successfully removed 186 kilograms of plastic waste and debris from Juhu Beach, Marine Drive, Versova Beach, and Chowpatty Beach. Our collective efforts have directly contributed to protecting marine ecosystems and created cleaner recreational spaces for Mumbai's residents and visitors. Every volunteer hour invested has made a tangible difference! 🌊🗑️`;
    }
    
    if (prompt.includes('eco tip')) {
      return `🌱 Eco Tip of the Day: When participating in beach cleanups, always carry a pair of reusable puncture-resistant gloves and a reusable water bottle. Sort collected waste into categories - plastic bottles, bags, fishing nets, and general debris - as this helps recycling centers process materials more efficiently. Remember to take photos of your cleanup area before and after to document the positive impact and inspire others to join our cause! 📸♻️`;
    }
    
    return 'Thank you for being part of our environmental mission!';
  };

  const loadContent = async () => {
    try {
      setLoading(true);
      
      // Fetch all content in parallel
      const [welcome, impact, tip] = await Promise.all([
        fetchGeminiResponse(`Generate a personalized welcome message for ${user.displayName}, a ${user.userType} in Mumbai's beach cleanup community. Make it emotionally uplifting and mention their role.`),
        fetchGeminiResponse(`Generate an impact summary for Mumbai beach cleanup activities. Include statistics like number of volunteers, weight of waste collected, and beaches cleaned. Make it sound like a friendly official report.`),
        fetchGeminiResponse(`Generate a practical eco tip for beach cleanup volunteers. Include specific advice for environmental conservation activities.`)
      ]);
      
      setWelcomeMessage(welcome);
      setImpactSummary(impact);
      setEcoTip(tip);
    } catch (error) {
      console.error('Error fetching content:', error);
      // Fallback content
      setWelcomeMessage(`Welcome back, ${user.displayName}! Ready to make a difference today? 🌊`);
      setImpactSummary('Our community continues to make incredible impact cleaning Mumbai\'s beaches!');
      setEcoTip('Remember to stay hydrated and wear sun protection during beach cleanups! 🌞');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshContent = async () => {
    setRefreshing(true);
    await loadContent();
  };

  const handlePrint = () => {
    // Create a print-friendly version
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af; margin-bottom: 10px;">Mumbai Beach Cleanup Report</h1>
          <p style="color: #6b7280; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="border: 2px solid #dbeafe; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #eff6ff;">
          <h2 style="color: #1e40af; margin-bottom: 15px;">Welcome Message</h2>
          <p style="line-height: 1.6; color: #374151;">${welcomeMessage}</p>
        </div>
        
        <div style="border: 2px solid #dcfce7; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #f0fdf4;">
          <h2 style="color: #16a34a; margin-bottom: 15px;">Impact Summary</h2>
          <p style="line-height: 1.6; color: #374151;">${impactSummary}</p>
        </div>
        
        <div style="border: 2px solid #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #fffbeb;">
          <h2 style="color: #d97706; margin-bottom: 15px;">Eco Tip</h2>
          <p style="line-height: 1.6; color: #374151;">${ecoTip}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">Mumbai Beach Cleanup Community • Making Waves for Change</p>
        </div>
      </div>
    `;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mumbai Beach Cleanup Report</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  const handleDownloadPDF = () => {
    // Note: In a real implementation, you would use html2pdf.js
    // For now, we'll show an alert
    alert('PDF download feature would be implemented with html2pdf.js library in production.');
  };

  useEffect(() => {
    loadContent();
  }, []);

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600">Loading...</span>
    </div>
  );

  const UserTypeIcon = () => {
    return user.userType === 'volunteer' ? (
      <Heart className="w-5 h-5 text-blue-500" />
    ) : (
      <Building2 className="w-5 h-5 text-green-500" />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                <Waves className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mumbai Beach Cleanup</h1>
                <p className="text-sm text-gray-600">Making Waves for Change</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshContent}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </button>
              
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                <UserTypeIcon />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-gray-600 capitalize">{user.userType}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">47</p>
                <p className="text-sm text-gray-600">Active Volunteers</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">186kg</p>
                <p className="text-sm text-gray-600">Waste Collected</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-purple-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-sm text-gray-600">Beaches Cleaned</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-orange-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-sm text-gray-600">Events This Month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Welcome Message - Light Blue */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-blue-900">Personal Welcome</h2>
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <p className="text-blue-800 leading-relaxed text-lg">{welcomeMessage}</p>
              )}
            </div>
          </div>

          {/* Impact Summary - Light Green */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Waves className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-green-900">Community Impact</h2>
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <p className="text-green-800 leading-relaxed text-lg">{impactSummary}</p>
              )}
            </div>
          </div>

          {/* Eco Tip - Light Yellow */}
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-yellow-900">Daily Eco Tip</h2>
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <p className="text-yellow-800 leading-relaxed text-lg">{ecoTip}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Last updated: {new Date().toLocaleString()} • 
            <span className="ml-2">🌊 Together, we're making Mumbai's beaches cleaner! 🌊</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;