const API_BASE = 'https://kirana-mitra-ai-backend.onrender.com/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchInventory() {
  const res = await fetch(`${API_BASE}/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function adjustStock(productId, delta) {
  const res = await fetch(`${API_BASE}/inventory/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, delta })
  });
  if (!res.ok) throw new Error('Failed to adjust stock');
  return res.json();
}

export async function updateProductImage(productId, imageUrl) {
  const res = await fetch(`${API_BASE}/products/${productId}/image`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl })
  });
  if (!res.ok) throw new Error('Failed to update product image');
  return res.json();
}

export async function deleteProduct(productId) {
  const res = await fetch(`${API_BASE}/products/${productId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
}

export async function sendVoiceCommand(transcript, lang = 'te') {
  const res = await fetch(`${API_BASE}/voice-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, lang })
  });
  if (!res.ok) throw new Error('Voice command failed');
  return res.json();
}

export async function sendCameraCommand(imageB64, voiceTranscript = '', lang = 'te') {
  const res = await fetch(`${API_BASE}/camera-command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_b64: imageB64, voice_transcript: voiceTranscript, lang })
  });
  if (!res.ok) throw new Error('Camera command failed');
  return res.json();
}

export async function sendClarification(sessionId, replyText, lang = 'te') {
  const res = await fetch(`${API_BASE}/clarify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, reply_text: replyText, lang })
  });
  if (!res.ok) throw new Error('Clarification failed');
  return res.json();
}

export async function fetchPurchaseRecommendation(budget = 5000, lang = 'te') {
  const res = await fetch(`${API_BASE}/purchase-recommendation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ budget, lang })
  });
  if (!res.ok) throw new Error('Purchase recommendation failed');
  return res.json();
}

export async function fetchTransactions() {
  const res = await fetch(`${API_BASE}/transactions`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function resetDatabase() {
  const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
  if (!res.ok) throw new Error('Reset failed');
  return res.json();
}

let currentAudio = null;

/**
 * Text-To-Speech read aloud helper:
 * 1. Primary: Uses Google Live TTS stream (/api/tts) with authentic native Telugu / Hindi / English accent.
 * 2. Fallback: Uses Web Speech Synthesis API with matching locale.
 */
export function speakText(text, lang = 'te') {
  if (!text || !text.trim()) return;

  // Stop any ongoing audio
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  // 1. Primary: Google Live voice stream from backend
  try {
    const audioUrl = `${API_BASE}/tts?text=${encodeURIComponent(text.trim())}&lang=${encodeURIComponent(lang)}`;
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    audio.play().catch(err => {
      console.warn('Backend Google Live TTS playback notice, falling back to Web Speech:', err);
      speakWithWebSpeech(text, lang);
    });
    return;
  } catch (err) {
    console.warn('Google Live Audio initialization notice:', err);
  }

  // 2. Fallback: Browser Web Speech Synthesis
  speakWithWebSpeech(text, lang);
}

function speakWithWebSpeech(text, lang = 'te') {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const localeMap = {
    'te': 'te-IN',
    'hi': 'hi-IN',
    'en': 'en-IN'
  };
  utterance.lang = localeMap[lang] || 'te-IN';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => 
    v.lang.toLowerCase().includes(lang) || 
    (lang === 'te' && v.name.toLowerCase().includes('telugu')) ||
    (lang === 'hi' && v.name.toLowerCase().includes('hindi'))
  );
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }
  window.speechSynthesis.speak(utterance);
}
