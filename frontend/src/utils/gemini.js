export const fetchGeminiResponse = async (prompt) => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  try {
    // Updated to use gemini-1.5-flash (recommended for most use cases)
    // Alternative: gemini-1.5-pro for more complex tasks
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    
    // Check if response has the expected structure
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      console.error('Unexpected response structure:', data);
      return "No response from Gemini.";
    }
  } catch (error) {
    console.error('Error fetching Gemini response:', error);
    return `Error: ${error.message}`;
  }
};