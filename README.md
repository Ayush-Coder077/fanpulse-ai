# FanPulse AI 🏏

### A browser-local AI cricket companion for live match understanding

**FanPulse AI** is an AI-powered cricket companion built for the **Dream11 Forward Deployed Engineer Intern assignment**.

The problem is simple: during a live match, fans can see the score, but the score alone doesn't always explain **what just happened, why it matters, or what they should watch next**.

FanPulse combines **live cricket data from CricAPI** with a **browser-local AI model powered by WebLLM + WebGPU** to turn raw match data into simple, fan-friendly explanations.

## 🚀 Live Demo

**Deployed Application:**  
https://fanpulse-ai-dusky.vercel.app/

The application can be accessed directly from a browser without installing the project locally.

---

## 🎯 Problem

During a live cricket match, fans constantly switch between:

- Scorecards
- Commentary
- Player statistics
- Social media
- Fantasy apps

Most of these show **what happened**, but don't clearly explain:

> **"What does this mean for the match?"**

FanPulse is designed to bridge that gap.

---

## 💡 Solution

FanPulse acts as an **AI match companion** that converts live match information into useful context.

It answers questions such as:

- What just happened?
- Why was that wicket important?
- Is the chasing team under pressure?
- What should I watch in the next few overs?
- Which player is currently influencing the match?
- How has the momentum changed?

Instead of overwhelming fans with statistics, FanPulse focuses on **interpreting the situation**.

---

## ✨ Features

### 🏏 Live Match Data

Live cricket information is retrieved using **CricAPI**, including:

- Teams
- Score
- Wickets
- Overs
- Match status
- Recent events
- Batting/bowling information

### 📊 Match Context

FanPulse calculates and displays useful match statistics such as:

- Current Run Rate
- Required Run Rate
- Runs required
- Balls remaining
- Wickets remaining
- Recent match events
- Illustrative momentum

### 🤖 AI Match Insights

The AI converts the current match state into fan-friendly insights:

**What Just Happened?**

Explains the most important recent event.

**Why It Matters**

Explains how the event affects the current match situation.

**Watch Next**

Highlights what fans should pay attention to next.

### 💬 Ask Match AI

Fans can ask questions about the current match, for example:

> Why is this chase under pressure?

> What changed in the last few overs?

> Who is currently influencing the match?

> What should I watch in the next few balls?

### 🧠 Browser-Local AI

FanPulse can run its AI model directly inside the user's browser using:

- WebLLM
- WebGPU
- A quantized instruction-tuned language model

The model is downloaded to the user's browser and inference happens locally on their device.

This means the AI inference layer does **not require a remote LLM API key**.

### 🛡️ AI Fallback

If WebGPU or the local model is unavailable, FanPulse can still provide deterministic match insights based on the available cricket statistics.

This keeps the core experience functional even when local AI cannot run.

---

## 🏗️ Architecture

```text
                       ┌─────────────────┐
                       │     CricAPI     │
                       │  Live Cricket   │
                       │      Data       │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Match State    │
                       │     Engine      │
                       ├─────────────────┤
                       │ Score           │
                       │ Wickets         │
                       │ Overs           │
                       │ Run Rate        │
                       │ Required Rate   │
                       │ Recent Events   │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  AI Context     │
                       │    Builder      │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     WebLLM      │
                       │  Local AI Model │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     WebGPU      │
                       │ Local Inference │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   FanPulse UI   │
                       ├─────────────────┤
                       │ AI Insights     │
                       │ Match Context   │
                       │ Momentum        │
                       │ Watch Next      │
                       │ Ask Match AI    │
                       └─────────────────┘
```

### Important design decision

The application does **not** rely on the LLM to calculate cricket statistics.

Calculations such as:

- Score
- Required runs
- Run rate
- Balls remaining
- Wickets remaining

are handled by application logic.

The resulting match context is then provided to the AI model.

This reduces the chance of the LLM inventing or incorrectly calculating important match information.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Next.js | Application framework |
| React | UI |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Custom CSS | Responsive UI |
| CricAPI | Live cricket data |
| WebLLM | Browser-local LLM inference |
| WebGPU | Local GPU acceleration |
| Lucide | Icons |
| Vercel | Deployment |

---

## 📡 CricAPI Integration

FanPulse uses **CricAPI** as the live cricket data source.

The application transforms the API response into a normalized match state before using it throughout the UI and AI layer.

The general flow is:

```text
CricAPI
   ↓
API Response
   ↓
Data Normalization
   ↓
Match State
   ↓
Statistics / Context
   ↓
AI Insights
```

The API key is kept in environment variables and is not committed to the repository.

Example:

```env
CRICAPI_KEY=your_api_key
```

---

## 🤖 Local AI Architecture

FanPulse uses WebLLM to run an instruction-tuned language model directly inside the browser.

```text
User opens FanPulse
        ↓
Browser loads WebLLM
        ↓
Model downloads/caches locally
        ↓
WebGPU initializes
        ↓
Match context is provided to model
        ↓
Local inference
        ↓
AI explanation
```

The deployed application provides the interface and match data, while AI inference can happen locally on the reviewer's device.

### Why local AI?

The approach demonstrates that an AI-powered product does not always need a server-side LLM API.

Benefits include:

- No remote LLM API key required
- Reduced dependency on an external inference service
- AI processing happens on the user's device
- Interesting architecture for privacy-sensitive use cases
- Demonstrates practical browser-based AI

---

## ⚡ Running Locally

### Requirements

- Node.js 20+
- Modern Chrome or Edge
- Internet connection
- WebGPU-capable device for local AI
- Sufficient memory/storage for the browser model

### Installation

```bash
git clone <your-github-repository>
cd fanpulse-ai
npm install
```

### Environment Variables

Create `.env.local`:

```env
CRICAPI_KEY=your_api_key
```

### Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 🌐 Deployment

FanPulse is deployed as a **Next.js application on Vercel**.

Deployment flow:

```text
GitHub Repository
       ↓
Vercel
       ↓
FanPulse Web Application
       ↓
User's Browser
       ├── CricAPI → Match Data
       └── WebLLM → Local AI
```

For production deployment, configure the required CricAPI environment variable through the deployment platform.

No server-side LLM API key is required for the browser-local AI layer.

---

## 🔄 Live Data & Demo Fallback

FanPulse primarily uses live match information from CricAPI.

However, live APIs can occasionally have:

- No active match
- Delayed updates
- API limits
- Network failures
- Temporary service issues

For this reason, the application includes a fallback/demo experience so the core product can still be demonstrated when live match data is unavailable.

The fallback is clearly separated from the live-data experience.

---

## 📈 Momentum Indicator

The momentum indicator is an **illustrative heuristic** based on match context and recent events.

It is **not a machine-learning win-probability model** and should not be interpreted as an official probability of winning.

The goal is to help fans visually understand whether the recent phase of the match appears to be favoring one side.

---

## 🏆 Fantasy Context

FanPulse can provide qualitative fantasy-related context around players and match situations.

For example:

- Player involvement
- Recent impact
- Batting/bowling opportunity
- Match situation

However, FanPulse does **not** claim to provide official Dream11 fantasy points, scoring calculations, or guaranteed fantasy predictions.

---

## ⚠️ Limitations

- CricAPI data availability depends on the API provider and plan.
- Live match updates may not always be instantaneous.
- WebGPU support varies across browsers and devices.
- Local AI inference performance depends on the user's hardware.
- The first model load may require significant download time and storage.
- AI-generated explanations may occasionally be imperfect.
- Momentum is an illustrative heuristic, not win probability.
- Fantasy information is qualitative rather than official Dream11 scoring.
- The application is a prototype and is not an official Dream11 product.

---

## 🎬 Suggested Demo

A short demonstration can follow this flow:

### 1. Start with the problem

> "During a live cricket match, fans can see the score, but they don't always understand what the score actually means."

### 2. Open the live match

Show:

- Score
- Overs
- Required run rate
- Balls remaining
- Recent events

### 3. Show the AI explanation

Highlight:

**What Just Happened?**

**Why It Matters**

**Watch Next**

### 4. Ask Match AI

Example:

> "Why is this chase under pressure?"

Then ask:

> "What should I watch next?"

### 5. Explain the architecture

Show that:

```text
Live Match Data
      ↓
Match State Engine
      ↓
AI Context
      ↓
Browser-local LLM
      ↓
Fan-friendly explanation
```

The key engineering decision is that **the application calculates the facts and the AI explains them**.

---

## 🎯 Built For

This project was built as part of the **Dream11 Forward Deployed Engineer Intern assignment**.

The goal was to demonstrate:

- Product thinking
- Understanding of sports fans
- AI integration
- Live-data integration
- Full-stack development
- Practical system design
- Handling AI limitations and fallbacks
- Building a usable prototype quickly

---

## 👨‍💻 Author

**Ayush Datkhile**

Computer Science Graduate | Full Stack Developer | AI/LLM Builder

GitHub: `https://github.com/Ayush-Coder077`

LinkedIn: `https://linkedin.com/in/ayush-datkhile`

---

## 📌 Final Product Idea

> **FanPulse is not another live scorecard.**

It sits between raw cricket data and the fan to answer one simple question:

### **"I can see what happened. But what does it mean?"** 🏏