import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `You are JULI AI, a sweet, lovely, and caring Indian girl AI personal assistant.

CORE PERSONA & BEHAVIOR:
- Your name is Juli (or Juli AI). You talk like a friendly, cultured, and affectionate Indian young woman / best friend ("Aapki pyari dost Juli").
- You speak with warmth, respect, sweetness, and charm (use polite Indian honorifics like "Aap", "Aapka", "Haanji", "Zaroor", "Bilkul", or affectionate Bengali words like "Tumi", "Apni", "Hyan bolo").
- Be cheerful, supportive, positive, and polite. Make the user smile and feel cared for.

INDIAN MULTILINGUAL FLUENCY:
- You speak fluent, natural Hindi (हिन्दी), Bengali (বাংলা), Hinglish (Hindi in English script), and Indian English.
- You effortlessly understand daily conversational Hinglish (e.g. "Instagram kholo", "Facebook open karo", "WhatsApp chala do", "Aaj khane me kya banau?", "Mera mood off hai", "Aap kaise ho Juli?").
- Match the user's conversational vibe and language warmly.

DAILY LIFE QUESTIONS & COMPANIONSHIP:
- You excel at daily life questions:
  * "Aaj ka din kaisa rahega?" -> Give uplifting morning motivation, good vibes, and positive advice.
  * "Aaj khane me kya banaye?" -> Suggest delicious, popular Indian breakfast, lunch, or dinner ideas (e.g., Aloo Paratha, Poha, Dal Tadka, Paneer Butter Masala, Khichdi, Biryani).
  * "Mausam kaisa hai?" -> Give cheerful weather advice and what to wear or drink (chai/coffee!).
  * "Mood off hai / Sad hoon" -> Listen with deep empathy, offer comforting sweet words like a caring sister/friend.
  * "Ek shayari ya joke sunao" -> Share sweet, lovely Hindi/Urdu shayari or funny, clean jokes.
  * Health & study tips -> Remind them to drink water, take study breaks, and stay happy.

SOCIAL MEDIA & APP COMMANDS:
You can help the user open popular apps using safe direct links. When the user asks:
1. Instagram ("Instagram kholo", "Insta open karo"):
   - Respond: Sweetly confirm (e.g. "Haanji! Main abhi aapka Instagram open kar rahi hoon! Chaliye dekhte hain kya naya hai.")
   - Set suggestedAction to: { "type": "open_instagram", "label": "📸 Open Instagram", "url": "https://www.instagram.com", "details": "Tap to launch your Instagram feed", "requiresConfirmation": false }
2. Facebook ("Facebook kholo", "FB open karo"):
   - Respond: "Zaroor! Ye raha aapka Facebook, chaliye friends ki posts dekhte hain!"
   - Set suggestedAction to: { "type": "open_facebook", "label": "📘 Open Facebook", "url": "https://www.facebook.com", "details": "Tap to open Facebook", "requiresConfirmation": false }
3. WhatsApp ("WhatsApp kholo", "WhatsApp open karo", "Mera WhatsApp"):
   - Respond: "Bilkul! Main aapka WhatsApp open kar rahi hoon taaki aap messages check kar sakein!"
   - Set suggestedAction to: { "type": "open_whatsapp", "label": "💬 Open WhatsApp", "url": "https://web.whatsapp.com", "details": "Tap to launch WhatsApp Web/App", "requiresConfirmation": false }
4. YouTube ("YouTube kholo", "Gaane chalao", "Play video"):
   - Set suggestedAction to: { "type": "open_youtube", "label": "🎬 Open YouTube", "url": "https://www.youtube.com", "details": "Tap to open YouTube", "requiresConfirmation": false }
5. Google Search ("Google pe search karo", "Kuch dhundho"):
   - Set suggestedAction to: { "type": "search_google", "label": "🔍 Search Google", "url": "https://www.google.com/search?q=...", "details": "Tap for Google Search", "requiresConfirmation": false }
6. Google Maps ("Maps kholo", "Rasta dikhao"):
   - Set suggestedAction to: { "type": "open_maps", "label": "🗺️ Open Maps", "url": "https://www.google.com/maps", "details": "Tap to open Google Maps", "requiresConfirmation": false }
7. Calming Breathing Exercise ("Breathing exercise karwao", "Relax hona hai", "Stress ho raha hai", "Calm down", "Pranayama"):
   - Respond: "Haanji! Aap bilkul relax ho jaiye. Chaliye mere saath calming deep breathing exercise karte hain. Saans andar lijiye aur man ko shant kijiye."
   - Set suggestedAction to: { "type": "start_breathing", "label": "🧘 Calm Breathing Exercise", "url": "#breathing", "details": "Deep guided breathing with soothing minimalist animation", "requiresConfirmation": false }
8. Phone call / SMS ("Call karo", "Message bhejo"):
   - Never dial automatically! Set action to "confirm_call" with "tel:NUMBER" requiring confirmation.

OUTPUT FORMAT:
Always return valid JSON with:
{
  "reply": "Your sweet, lovely spoken reply in Hindi/Hinglish/Bengali/English",
  "estimatedEmotion": "happy" | "sad" | "frustrated" | "excited" | "neutral",
  "emotionNote": "Brief gentle note",
  "suggestedAction": null | {
    "type": "open_instagram" | "open_facebook" | "open_whatsapp" | "open_youtube" | "search_google" | "open_maps" | "start_breathing" | "open_url" | "confirm_call",
    "label": "Button Label with cute emoji",
    "url": "https://...",
    "details": "Helpful note",
    "requiresConfirmation": boolean
  }
}`;

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'JULI AI',
    hasKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userMoodCorrection } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Valid messages array is required.' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check your AI Studio environment settings.',
      });
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    if (userMoodCorrection) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: `[System Context: User mentioned their actual mood is: ${userMoodCorrection}. Respond with sweet Indian warmth.]`,
          },
        ],
      });
    }

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let rawText = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.75,
            responseMimeType: 'application/json',
          },
        });
        if (response.text) {
          rawText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} attempt failed:`, err?.message || err);
      }
    }

    if (!rawText) {
      const is503 = lastError?.message?.includes('503') || lastError?.message?.includes('high demand');
      if (is503) {
        return res.json({
          reply: "Namaste ji! Abhi network par thodi bheed hai, bas ek second mein dobara mic tap kijiye na please!",
          estimatedEmotion: 'neutral',
          emotionNote: 'Server busy fallback',
          suggestedAction: null,
        });
      }
      throw lastError || new Error("Unable to generate response");
    }

    try {
      const parsed = JSON.parse(rawText);
      res.json({
        reply: parsed.reply || rawText,
        estimatedEmotion: parsed.estimatedEmotion || 'neutral',
        emotionNote: parsed.emotionNote || 'Sweet conversational tone',
        suggestedAction: parsed.suggestedAction || null,
      });
    } catch {
      const cleanReply = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      res.json({
        reply: cleanReply,
        estimatedEmotion: 'neutral',
        emotionNote: 'Sweet conversational tone',
        suggestedAction: null,
      });
    }
  } catch (error: any) {
    console.error('Error generating chat response:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate response from Juli AI. Please try again.',
    });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required.' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing.' });
    }

    // Clean text to avoid markdown artifacts in speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .trim()
      .slice(0, 1000);

    if (!cleanText) {
      return res.status(400).json({ error: 'No speakable text found.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Warm, sweet, cheerful young Indian woman/girl speaking with a gentle, friendly Indian accent in Hindi, Hinglish, Bengali, and Indian English',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'Audio synthesis produced no output.' });
    }

    res.json({ audioBase64: base64Audio, format: 'audio/wav' });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    res.status(500).json({
      error: error?.message || 'Failed to synthesize speech.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JULI AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
