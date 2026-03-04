// server.js — run with: node server.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const ANTHROPIC_API_KEY = "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";

app.post("/api/chat", async (req, res) => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: req.body.max_tokens || 1000,
        ...(req.body.system && { system: req.body.system }),
        messages: req.body.messages,
      }),
    });

    const data = await response.json();

    // Print full Anthropic response so we can see any errors
    console.log("Anthropic response:", JSON.stringify(data, null, 2));

    if (data.error) {
      return res.status(400).json({ error: data.error.message || JSON.stringify(data.error) });
    }

    const text = data.content.map(b => b.text || "").filter(Boolean).join("\n");
    res.json({ reply: text });

  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("✅ Proxy server running on http://localhost:5000"));
