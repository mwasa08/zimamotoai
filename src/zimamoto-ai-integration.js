// ============================================================
//  ZIMAMOTO AI — API Integration
//  Groq  → Discussion Rooms, Advice Room (fast chat)
//  Gemini Flash → PDF / File Analysis, Blog Summaries
// ============================================================

// ✅ PUT YOUR KEYS HERE (or in your .env file)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;     // https://console.groq.com
    // https://aistudio.google.com

// ─────────────────────────────────────────────
//  1. GROQ — Streaming Chat (Discussion Rooms & Advice Room)
// ─────────────────────────────────────────────

/**
 * sendGroqMessage
 * Streams a response from Groq and calls onChunk for each piece of text.
 *
 * @param {Array}    messages   - Full conversation history [{role, content}, ...]
 * @param {Function} onChunk    - Called with each text chunk as it arrives
 * @param {Function} onDone    - Called when streaming is complete
 * @param {string}   systemPrompt - Optional system prompt for ZIMAMOTO context
 */
async function sendGroqMessage(messages, onChunk, onDone, systemPrompt = "") {
  const fullMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: fullMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Groq API error");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(line => line.startsWith("data: "));

      for (const line of lines) {
        const data = line.replace("data: ", "").trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || "";
          if (text) {
            fullText += text;
            onChunk(text, fullText);
          }
        } catch (_) {}
      }
    }

    if (onDone) onDone(fullText);
  } catch (err) {
    console.error("Groq error:", err);
    onChunk("⚠️ Sorry, I couldn't connect. Please try again.", "");
    if (onDone) onDone("");
  }
}

// ─────────────────────────────────────────────
//  2. GEMINI FLASH — PDF / File Analysis & Blog Summaries
// ─────────────────────────────────────────────

/**
 * analyzeWithGemini
 * Sends text/document content to Gemini Flash for analysis.
 *
 * @param {string} prompt   - What you want Gemini to do with the content
 * @param {string} content  - The document text or file content
 * @returns {Promise<string>} - Gemini's full response
 */
async function analyzeWithGemini(prompt, content) {
  const fullPrompt = `${prompt}\n\n---\n${content}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Gemini API error");
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
  } catch (err) {
    console.error("Gemini error:", err);
    return "⚠️ Could not analyze the file. Please try again.";
  }
}

/**
 * analyzeFileWithGemini
 * Sends a base64-encoded file (PDF/image) directly to Gemini.
 *
 * @param {string} prompt    - Instruction for Gemini
 * @param {string} base64Data - Base64 string of the file
 * @param {string} mimeType  - e.g. "application/pdf" or "image/jpeg"
 * @returns {Promise<string>}
 */
async function analyzeFileWithGemini(prompt, base64Data, mimeType = "application/pdf") {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
  } catch (err) {
    console.error("Gemini file error:", err);
    return "⚠️ Could not read the file. Please try again.";
  }
}

// ─────────────────────────────────────────────
//  3. ZIMAMOTO SYSTEM PROMPTS
// ─────────────────────────────────────────────

const ZIMAMOTO_PROMPTS = {
  discussionRoom: `You are ZIMAMOTO AI, a helpful study assistant for Tanzanian university students.
You help students discuss academic topics, explain concepts clearly, and encourage collaborative learning.
Always respond in a friendly, encouraging tone. Support both English and Swahili.`,

  adviceRoom: `You are ZIMAMOTO AI, a personal academic advisor for Tanzanian students.
You give practical advice on study techniques, career paths, course selection, and student life challenges.
Be empathetic, culturally aware, and give actionable suggestions.`,

  fileAnalysis: `You are ZIMAMOTO AI analyzing a student's document.
Provide a clear summary, highlight key concepts, identify main topics, and suggest what to focus on for studying.
Be concise and structured. Use bullet points where helpful.`,

  blogSummary: `You are ZIMAMOTO AI. Summarize this blog post for a Tanzanian university student.
Extract the key takeaways in plain, simple language. Keep it under 200 words.`,
};

// ─────────────────────────────────────────────
//  4. READY-TO-USE FUNCTIONS FOR ZIMAMOTO FEATURES
// ─────────────────────────────────────────────

// --- Discussion Room ---
async function discussionRoomChat(conversationHistory, newMessage, onChunk, onDone) {
  const messages = [
    ...conversationHistory,
    { role: "user", content: newMessage },
  ];
  await sendGroqMessage(messages, onChunk, onDone, ZIMAMOTO_PROMPTS.discussionRoom);
}

// --- Advice Room ---
async function adviceRoomChat(conversationHistory, newMessage, onChunk, onDone) {
  const messages = [
    ...conversationHistory,
    { role: "user", content: newMessage },
  ];
  await sendGroqMessage(messages, onChunk, onDone, ZIMAMOTO_PROMPTS.adviceRoom);
}

// --- PDF / File Analysis (from extracted text) ---
async function analyzeStudyFile(fileText) {
  return await analyzeWithGemini(ZIMAMOTO_PROMPTS.fileAnalysis, fileText);
}

// --- PDF Analysis (raw file upload) ---
async function analyzeUploadedPDF(base64PDF) {
  return await analyzeFileWithGemini(ZIMAMOTO_PROMPTS.fileAnalysis, base64PDF, "application/pdf");
}

// --- Blog Summary ---
async function summarizeBlog(blogText) {
  return await analyzeWithGemini(ZIMAMOTO_PROMPTS.blogSummary, blogText);
}

// ─────────────────────────────────────────────
//  5. HELPER — Convert uploaded File to base64
// ─────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────
//  USAGE EXAMPLES
// ─────────────────────────────────────────────
/*

// ── Discussion Room ──────────────────────────
const history = [];
const userMessage = "Explain photosynthesis in simple terms";

discussionRoomChat(history, userMessage,
  (chunk, fullText) => {
    document.getElementById("ai-response").innerText = fullText; // live update
  },
  (finalText) => {
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: finalText });
    console.log("Done:", finalText);
  }
);

// ── PDF Upload & Analyze ─────────────────────
const fileInput = document.getElementById("pdf-input");
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const base64 = await fileToBase64(file);
  const result = await analyzeUploadedPDF(base64);
  document.getElementById("analysis-result").innerText = result;
});

// ── Blog Summary ─────────────────────────────
const blogContent = document.getElementById("blog-text").value;
const summary = await summarizeBlog(blogContent);
document.getElementById("summary-output").innerText = summary;

*/

// ─────────────────────────────────────────────
//  EXPORTS (if using modules)
// ─────────────────────────────────────────────
// export {
//   discussionRoomChat,
//   adviceRoomChat,
//   analyzeStudyFile,
//   analyzeUploadedPDF,
//   summarizeBlog,
//   fileToBase64,
// };
