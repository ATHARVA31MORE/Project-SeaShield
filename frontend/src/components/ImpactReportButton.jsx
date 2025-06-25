// Fixed ImpactReportButton.jsx with proper PDF encoding
import { jsPDF } from 'jspdf';
import { fetchGeminiResponse } from '../utils/gemini';
import dayjs from 'dayjs';

const ImpactReportButton = ({ 
  userName, 
  ecoScore, 
  totalWasteCollected, 
  checkIns, 
  badges, 
  streak 
}) => {
  const generateVolunteerSummary = async () => {
    const totalEvents = checkIns.length;
    const avgWastePerEvent = totalEvents > 0 ? (totalWasteCollected / totalEvents).toFixed(1) : 0;
    const plasticBagsEquivalent = Math.floor(totalWasteCollected / 0.5);
    const monthsActive = totalEvents > 0 ? 
      Math.ceil((new Date() - new Date(checkIns[0].timestamp)) / (1000 * 60 * 60 * 24 * 30)) : 0;

    const prompt = `
      Generate a motivational and personalized 2-3 paragraph impact summary for beach cleanup volunteer ${userName}.
      
      Their achievements:
      - EcoScore: ${ecoScore} points
      - Total waste collected: ${totalWasteCollected}kg 
      - Events participated: ${totalEvents}
      - Average waste per event: ${avgWastePerEvent}kg
      - Current streak: ${streak} days
      - Badges earned: ${badges.join(', ') || 'None yet'}
      - Active for: ${monthsActive} months
      - Equivalent plastic bags prevented: ${plasticBagsEquivalent}
      
      Make it inspiring, personal, and highlight their environmental impact with specific comparisons.
      Focus on marine life protection and ocean conservation. End with encouragement for future participation.
      Keep it conversational and motivating. DO NOT use any emojis in the response - use plain text only.
    `;

    return await fetchGeminiResponse(prompt);
  };

  const generateImpactStatistics = async () => {
    const totalEvents = checkIns.length;
    const avgWastePerEvent = totalEvents > 0 ? (totalWasteCollected / totalEvents).toFixed(1) : 0;

    const prompt = `
      Generate 5-6 creative impact statistics for volunteer ${userName} based on their beach cleanup data:
      - EcoScore: ${ecoScore} points
      - Total waste: ${totalWasteCollected}kg
      - Events: ${totalEvents}
      - Streak: ${streak} days
      - Badges: ${badges.join(', ') || 'None'}
      
      Format as bullet points without any emojis. Make each statistic creative and meaningful 
      (e.g., "Helped protect sea turtles by removing X kg of plastic waste" or "Cleaned enough waste to fill X containers").
      Be specific with numbers and creative with comparisons. Each point should be one line.
      Start each bullet point with a dash (-). Use plain text only, no emojis or special characters.
    `;

    return await fetchGeminiResponse(prompt);
  };

  const generateMotivationalMessage = async () => {
    const prompt = `
      Generate a short, powerful motivational message (2-3 sentences) for volunteer ${userName} 
      who has collected ${totalWasteCollected}kg of waste and earned ${ecoScore} EcoScore points.
      
      Make it inspiring and forward-looking, encouraging them to continue their environmental journey.
      Focus on their role as an ocean guardian and environmental champion.
      Use plain text only, no emojis or special characters.
    `;

    return await fetchGeminiResponse(prompt);
  };

  // Helper function to clean text for PDF
  const cleanTextForPDF = (text) => {
    return text
      .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-ASCII characters
      .replace(/•/g, '-') // Replace bullets with dashes
      .replace(/"/g, '"') // Replace smart quotes
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/—/g, '-') // Replace em dash
      .replace(/–/g, '-') // Replace en dash
      .trim();
  };

  const generatePDF = async () => {
    try {
      // Show loading state
      const button = document.querySelector('[data-generating]');
      if (button) {
        button.textContent = 'Generating Report...';
        button.disabled = true;
      }

      // Generate all content via Gemini
      const [summary, statistics, motivationalMessage] = await Promise.all([
        generateVolunteerSummary(),
        generateImpactStatistics(),
        generateMotivationalMessage()
      ]);

      // Clean all text for PDF compatibility
      const cleanSummary = cleanTextForPDF(summary);
      const cleanStatistics = cleanTextForPDF(statistics);
      const cleanMotivational = cleanTextForPDF(motivationalMessage);

      const pdf = new jsPDF();
      
      // Set default font
      pdf.setFont('helvetica');
      
      // Header with decorative elements
      pdf.setFontSize(20);
      pdf.setTextColor(41, 128, 185);
      pdf.text('VOLUNTEER IMPACT REPORT', 20, 25);
      
      // Add a line under header
      pdf.setDrawColor(41, 128, 185);
      pdf.setLineWidth(1);
      pdf.line(20, 30, 190, 30);
      
      // Volunteer info
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      let y = 45;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Volunteer: ${userName}`, 20, y); y += 8;
      pdf.text(`Report Date: ${dayjs().format('DD MMMM YYYY')}`, 20, y); y += 15;
      
      // Basic Stats Box
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(15, y, 180, 25, 3, 3, 'FD');
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      y += 8;
      pdf.text(`EcoScore: ${ecoScore} points`, 20, y);
      pdf.text(`Waste Collected: ${totalWasteCollected}kg`, 70, y);
      pdf.text(`Events: ${checkIns.length}`, 130, y);
      y += 6;
      pdf.text(`Streak: ${streak} days`, 20, y);
      if (badges.length > 0) {
        pdf.text(`Badges: ${badges.join(', ')}`, 70, y);
      }
      y += 20;
      
      // Impact Statistics Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(34, 139, 34);
      pdf.text('YOUR IMPACT STATISTICS', 20, y); y += 10;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      const statisticsLines = pdf.splitTextToSize(cleanStatistics, 170);
      pdf.text(statisticsLines, 20, y);
      y += statisticsLines.length * 5 + 15;
      
      // Impact Summary Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(34, 139, 34);
      pdf.text('YOUR ENVIRONMENTAL IMPACT', 20, y); y += 10;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      
      const summaryLines = pdf.splitTextToSize(cleanSummary, 170);
      pdf.text(summaryLines, 20, y);
      y += summaryLines.length * 5 + 15;
      
      // Check if we need a new page
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
      
      // Motivational Message Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(220, 20, 60);
      pdf.text('KEEP MAKING A DIFFERENCE!', 20, y); y += 10;
      
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      
      const motivationalLines = pdf.splitTextToSize(cleanMotivational, 170);
      pdf.text(motivationalLines, 20, y);
      y += motivationalLines.length * 6 + 20;
      
      // Footer with border
      pdf.setDrawColor(41, 128, 185);
      pdf.setLineWidth(0.5);
      pdf.line(20, y, 190, y);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(128, 128, 128);
      pdf.text('Generated by EcoCleanup Platform | Protecting Our Oceans Together', 20, y + 8);
      
      // Save the PDF
      const safeName = userName ? userName.replace(/\s+/g, '_') : 'Volunteer';
      const filename = `${safeName}_Impact_Report_${dayjs().format('YYYY-MM-DD')}.pdf`;
      pdf.save(filename);
      
      // Reset button state
      if (button) {
        button.textContent = 'Download Impact Report';
        button.disabled = false;
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Sorry, there was an error generating your report. Please try again.');
      
      // Reset button state
      const button = document.querySelector('[data-generating]');
      if (button) {
        button.textContent = 'Download Impact Report';
        button.disabled = false;
      }
    }
  };

  return (
    <button
      onClick={generatePDF}
      data-generating
      className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold"
    >
      📄 Download Impact Report
    </button>
  );
};

export default ImpactReportButton;