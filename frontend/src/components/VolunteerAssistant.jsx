import React, { useState } from 'react';
import { fetchGeminiResponse } from '../utils/gemini'; // Your existing Gemini API call

const VolunteerAssistant = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const reply = await fetchGeminiResponse(`You're a friendly eco-assistant. Respond to this: ${input}`);
      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I had trouble fetching a reply.' }]);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto mt-8 px-4 pt-24 bg-white shadow-lg rounded-xl space-y-4">
      <h2 className="text-xl font-semibold text-green-700">💬 Ask EcoBuddy</h2>
      <div className="h-64 overflow-y-auto bg-gray-100 p-3 rounded-lg space-y-2">
        {messages.map((msg, index) => (
          <div key={index} className={`p-2 rounded-md ${msg.sender === 'user' ? 'bg-blue-100 text-right' : 'bg-green-100 text-left'}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          placeholder="Ask anything..."
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default VolunteerAssistant;
