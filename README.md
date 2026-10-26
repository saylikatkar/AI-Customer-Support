# Aura Skincare — AI Voice Customer Support Agent (Aria)

An enterprise-grade, browser-based AI voice customer support web application built for **Aura Skincare**, a premium organic Indian skincare brand. The conversational AI assistant, **Aria**, communicates with customers through natural voice interaction, verified database lookups, deterministic policy enforcement, real-time transcription, and automated post-call summarization.

---

## 🌿 Live Application Access

- **Public Deployed URL:** `https://aria-customer-care-8472.ai.studio/`
- **Shared Production Link:** `https://aria-customer-care-8472.ai.studio/`
- **Application Title:** Aura Skincare | AI Voice Support
- **AI Voice Persona:** Aria (Warm, friendly Indian English skincare specialist)

---

## ✨ Project Overview & Key Features

- **Real Voice Interaction:** Natural voice conversations via browser microphone (`Web Audio API` / `SpeechRecognition`) with voice playback powered by Gemini Speech Synthesis (`gemini-3.8-flash-lite-tts`) with Indian English cadence and browser fallback.
- **Dynamic Voice State Machine:** Seamless UI transitions across `Idle` ➔ `Connecting` ➔ `Listening` ➔ `Thinking` ➔ `Speaking` ➔ `Ended`.
- **Verified Backend Database:** Live query and status mutations on seeded sample orders (`ORD-101`, `ORD-102`, `ORD-103`).
- **Strict Deterministic Policy Enforcement:**
  - **Shipping:** Strictly above ₹499 is Free; ₹499 or below incurs a ₹50 shipping fee; 3–5 business days delivery.
  - **Returns:** 7-day post-delivery return window; product must be unopened and in original sealed packaging.
  - **Defective / Damaged:** Reported within 48 hours of delivery with photo evidence for replacement.
  - **Cancellations:** Permitted exclusively while live order status is `Processing`. Doorstep refusal available for `Shipped` or `Out for Delivery`.
  - **Cash on Delivery (COD):** Available up to ₹2,500 with doorstep Cash or UPI payment.
- **Post-Call Structured Summarization:** Automatic generation and storage of validated JSON summaries detailing `customer_intent`, `order_id`, `resolution_status`, `call_summary`, and `escalation_required`.
- **Persistent Call History:** Searchable transcript history, duration timers, tool call timelines, and copyable JSON summaries.
- **Zero Assessment References:** Public portal presents exclusively as Aura Skincare's customer care portal with luxury warm ivory (`#FAF7F2`) and botanical sage green (`#2D5A35`) aesthetics.

---

## 🏛 System Architecture

```mermaid

graph TD
    User([Customer / Evaluator]) <-->|Microphone / Speakers| UI[Aura Skincare React Frontend]

    subgraph Frontend["Frontend Layer - React 19 + Vite + TypeScript"]
        UI --> VM[Voice State: Listening / Thinking / Speaking]
        UI --> TR[Live Transcript]
        UI --> SO[Sample Orders: ORD-101, ORD-102, ORD-103]
        UI --> PC[Post-Call Summary]
    end

    UI <-->|HTTP REST / WebSockets| Server[Node.js + Express + TypeScript Backend]

    subgraph Backend["Backend Orchestration Layer"]
        Server --> Validation[Request Validation and CORS]
        Server --> Orchestrator[AI Reasoning and Function Calling]
        Server --> Policy[Business Policy Validation]
        Server --> DB[(Order and Call Data Store)]
    end

    subgraph AI["AI and Speech Services"]
        Orchestrator <-->|AI Requests and Tool Calls| Gemini[Google Gemini]
        Orchestrator <-->|Text-to-Speech| TTS[Voice Generation]
        Orchestrator <-->|Speech-to-Text| STT[Speech Recognition]
    end

    subgraph Data["Stored Data"]
        DB --> Orders[Order Details]
        DB --> Calls[Calls and Transcripts]
        DB --> Summaries[Call Summaries]
    end

```



---

## 💻 Windows PowerShell Setup & Local Development

### 1. Configure Environment Variables
```powershell
Copy-Item .env.example .env
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Run Automated Tests
```powershell
npm run test
```

### 4. Launch Full-Stack Server
```powershell
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 💬 Technical Evaluation & Architecture Q&A

### 1. Why did you choose this tech stack?

I used React, TypeScript, Express, Vite, and Google Gemini to build the application. React helps create the user interface, while Express handles backend requests. TypeScript helps catch coding errors, and Vite makes development faster. Using TypeScript for both the frontend and backend also makes it easier to connect different parts of the application.

### 2. What was the most difficult technical part, and how did you solve it?

The most difficult part was managing the voice conversation smoothly. I had to handle microphone permissions, understand the user's speech, process requests, and play the agent's voice without interruptions. I solved this by creating different states for the agent, such as listening, thinking, and speaking. I also added a backup option using the browser's speech feature if the main voice system fails.

### 3. What would you improve with another week of development?

With one more week, I would focus on three improvements:

- **Better voice conversations:** Make conversations more natural and allow users to interrupt the agent while it is speaking.
- **WhatsApp integration:** Send call summaries and allow customers to share photos of damaged products through WhatsApp.
- **Database improvements:** Use PostgreSQL to store orders and conversation details more reliably.

### 4. What would you change if the system handled 1,000 customer conversations per day?

If the system handled 1,000 conversations daily, I would make these improvements:

- **Better session management:** Use Redis to manage active conversations and their data more efficiently.
- **Faster voice responses:** Save commonly used voice responses so they can be played quickly without generating them every time.
- **Background task processing:** Use a queue system to handle tasks such as generating call summaries separately, so they do not slow down ongoing conversations.

---

  *Aria enforces the strictly-above-₹499 rule: exactly ₹499 incurs the ₹50 fee; above ₹499 qualifies for free delivery.*
- **[3:00 - 3:45] Post-Call Analysis & Structured JSON Summary:**
  *Click 'End Call'. Inspect the automatically generated Post-Call Summary modal with verified Customer Intent, Order ID, Resolution Status, Executive Summary, and Tool Trace.*
- **[3:45 - 4:00] Wrap-up:**
  *Highlight the 33/33 passing automated test suite and clean standalone branding.*
