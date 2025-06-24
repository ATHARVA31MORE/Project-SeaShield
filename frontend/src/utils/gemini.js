export const fetchGeminiResponse = async (prompt, imageBase64 = null) => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  // Build the parts array based on whether we have an image or not
  const parts = [];
  
  if (imageBase64) {
    // Add image part for vision capabilities
    parts.push({
      inline_data: {
        mime_type: "image/jpeg", // Assuming JPEG, you can make this dynamic
        data: imageBase64
      }
    });
  }
  
  // Add text prompt
  parts.push({ text: prompt });

  const body = {
    contents: [
      {
        parts: parts,
      },
    ],
  };

  try {
    // Use gemini-1.5-flash for vision capabilities (supports both text and images)
    // For image analysis, we need to use the vision-enabled model
    const model = imageBase64 ? 'gemini-1.5-flash' : 'gemini-1.5-flash';
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Gemini API Error:', errorData);
      throw new Error(`HTTP error! status: ${res.status} - ${errorData.error?.message || 'Unknown error'}`);
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

// Helper function specifically for image verification
export const verifyCleanupImage = async (imageBase64) => {
  const prompt = `
    Analyze this image for a beach/environmental cleanup event verification.
    
    Look for these VALID elements:
    - Trash, litter, waste materials, or debris
    - People actively cleaning or picking up trash
    - Cleanup equipment like gloves, trash bags, grabbers, or tools
    - Beach cleanup scenes or environmental restoration activities
    - Before/after cleanup comparisons
    - Waste collection or sorting activities
    
    INVALID elements (reject these):
    - Simple selfies without cleanup context
    - Random personal photos unrelated to cleanup
    - Food photos, landscapes without cleanup activity
    - Screenshots or memes
    - Blurry or unclear images
    - Indoor photos unrelated to environmental work
    
    Respond with EXACTLY this format:
    STATUS: VALID or INVALID
    REASON: Brief explanation (max 50 words)
    
    Be strict but fair - the image should clearly show cleanup-related content.
  `;

  try {
    const response = await fetchGeminiResponse(prompt, imageBase64);
    
    // Parse the response
    const isValid = response.includes('STATUS: VALID');
    const reasonMatch = response.match(/REASON: (.+)/);
    const reason = reasonMatch ? reasonMatch[1].trim() : 'No reason provided';
    
    return {
      isValid,
      reason,
      fullResponse: response
    };
  } catch (error) {
    console.error('Image verification error:', error);
    // Default to allowing the image if verification fails
    return {
      isValid: true,
      reason: 'Verification service unavailable, image allowed',
      fullResponse: `Error: ${error.message}`
    };
  }
};

// Helper function to get image mime type from file
export const getImageMimeType = (file) => {
  // Map common image types
  const mimeTypes = {
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'image/gif': 'image/gif',
    'image/webp': 'image/webp'
  };
  
  return mimeTypes[file.type] || 'image/jpeg';
};

// Helper function to convert file to base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove the data URL prefix (data:image/jpeg;base64,)
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};