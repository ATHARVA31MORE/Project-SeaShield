import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { fetchGeminiResponse } from '../utils/gemini';

export default function Home() {
  const { user } = useAuth();
  const [aiMessage, setAiMessage] = useState('Generating your welcome message...');
  const [impactMessage, setImpactMessage] = useState('Loading your impact summary...');
  const [ecoTip, setEcoTip] = useState('Fetching a useful eco tip...');
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef();

  useEffect(() => {
    const loadMessage = async () => {
      const prompt = `
        Greet ${user.displayName} warmly. They're part of a beach cleanup community in Mumbai.
        Mention how their small acts protect marine life. Keep it short and emotionally uplifting.
      `;
      const response = await fetchGeminiResponse(prompt);
      setAiMessage(response);
    };

    const getImpact = async () => {
      const prompt = `
        Summarize the impact of 30 volunteers who cleaned 120 kg of plastic from 3 beaches.
        Use friendly, professional tone for an official report.
      `;
      const summary = await fetchGeminiResponse(prompt);
      setImpactMessage(summary);
    };

    const getTip = async () => {
      const tipPrompt = `Give a practical eco-friendly tip for beach cleanup volunteers.`;
      const tip = await fetchGeminiResponse(tipPrompt);
      setEcoTip(tip);
    };

    loadMessage();
    getImpact();
    getTip();
  }, [user]);

  const downloadPDF = async () => {
    setIsDownloading(true);
    
    try {
      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = reportRef.current;
      
      // Create a clone and apply inline styles to avoid Tailwind conflicts
      const clone = element.cloneNode(true);
      clone.style.fontFamily = 'Arial, sans-serif';
      clone.style.backgroundColor = '#ffffff';
      clone.style.padding = '20px';
      
      const options = {
        margin: 0.5,
        filename: `Project_Seashield_Report_${user.displayName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          ignoreElements: (element) => {
            // Ignore elements with Tailwind classes that might cause issues
            return element.classList && (
              element.classList.contains('hover:') ||
              element.classList.contains('transition')
            );
          }
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait' 
        },
      };

      await html2pdf().set(options).from(clone).save();
      console.log('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Try the simple PDF fallback
      try {
        await downloadSimplePDF();
      } catch (fallbackError) {
        console.error('Fallback PDF also failed:', fallbackError);
        alert('Error generating PDF. Please try the print option instead.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Simple PDF fallback using jsPDF
  const downloadSimplePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Add content to PDF
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175); // Blue color
    doc.text(`Project Seashield Report`, 20, 30);
    doc.text(`${user.displayName}`, 20, 45);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // Black color
    
    // Welcome message
    doc.text('Welcome Message:', 20, 65);
    const welcomeLines = doc.splitTextToSize(aiMessage, 170);
    doc.text(welcomeLines, 20, 75);
    
    // Impact summary
    let yPosition = 75 + (welcomeLines.length * 6) + 15;
    doc.text('🌍 Impact Summary:', 20, yPosition);
    const impactLines = doc.splitTextToSize(impactMessage, 170);
    doc.text(impactLines, 20, yPosition + 10);
    
    // Eco tip
    yPosition = yPosition + 10 + (impactLines.length * 6) + 15;
    if (yPosition > 250) { // Add new page if needed
      doc.addPage();
      yPosition = 30;
    }
    doc.text('🌱 Eco Tip:', 20, yPosition);
    const tipLines = doc.splitTextToSize(ecoTip, 170);
    doc.text(tipLines, 20, yPosition + 10);
    
    // Save the PDF
    doc.save(`Project_Seashield_Report_${user.displayName.replace(/\s+/g, '_')}.pdf`);
  };

  // Fallback download function using window.print
  const downloadFallback = () => {
    const printContent = reportRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #1e40af; margin-bottom: 20px;">Project Seashield Report - ${user.displayName}</h1>
        ${printContent}
      </div>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore React functionality
  };

  return (
    <>
      <div className="p-6 bg-white min-h-screen">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">Welcome, {user.displayName} 👋</h2>

        <div ref={reportRef} className="pdf-content">
          <div style={{
            backgroundColor: '#dbeafe',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            marginBottom: '24px',
            color: '#374151',
            whiteSpace: 'pre-wrap'
          }}>
            {aiMessage}
          </div>

          <div style={{
            backgroundColor: '#dcfce7',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            marginBottom: '24px',
            color: '#374151',
            whiteSpace: 'pre-wrap'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#166534',
              marginBottom: '8px'
            }}>🌍 Impact Summary</h3>
            {impactMessage}
          </div>

          <div style={{
            backgroundColor: '#fefce8',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            color: '#1f2937',
            whiteSpace: 'pre-wrap'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#a16207',
              marginBottom: '8px'
            }}>🌱 Eco Tip</h3>
            {ecoTip}
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          
          
          <button
            onClick={downloadFallback}
            className="px-6 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition"
          >
            🖨️ Print Report
          </button>
        </div>
      </div>
    </>
  );
}