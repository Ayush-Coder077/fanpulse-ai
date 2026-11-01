# FanPulse AI 🏏

**A browser-local AI cricket companion** built as a prototype for the Dream11 Forward Deployed Engineer Intern assignment.

FanPulse helps fans understand the match, not just read the score. It explains what happened, why it matters, what to watch next, and answers questions about the current match.

## What it demonstrates

- Live-style ball-by-ball match simulator
- Score, overs, current run rate, required run rate and balls remaining
- Recent-delivery timeline and illustrative momentum indicator
- Match insight cards and fantasy-context panel
- Ask Match AI chat interface
- Optional local LLM inference in the browser using WebLLM + WebGPU
- Deterministic statistics-based fallback when WebGPU/model loading is unavailable

## Tech stack

- Next.js + React + TypeScript
- Tailwind CSS (base setup) + custom responsive CSS
- WebLLM (`@mlc-ai/web-llm`)
- Qwen 2.5 1.5B Instruct (quantized browser model)
- Lucide icons

## Run locally

Requirements:
- Node.js 20 or newer
- Latest Chrome or Edge recommended for WebGPU
- A compatible GPU/browser for local model inference
- Enough memory and disk space for the model download

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Click **Load local AI model**. The first run downloads the model assets into the browser's cache. This may take several minutes and uses bandwidth/storage. Subsequent loads may be faster.

## Deploy

You can deploy the Next.js app to Vercel:

1. Push this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Deploy with the default Next.js settings.
4. Open the deployed HTTPS URL in a WebGPU-capable browser.
5. Test model loading on the deployed URL before submitting.

No server-side AI key is required. The LLM is downloaded and runs in each reviewer's browser. The deployed site serves the app; it does not run the model for reviewers.

## Important product limitations

- This is a **simulated match feed**, not a licensed live-score integration.
- Model download size and inference speed vary by device, browser, GPU and network.
- WebGPU availability is not universal. If unavailable, the app still shows score-derived fallback insights and the demo can be explored.
- The momentum bar is an illustrative heuristic, **not** a win-probability model.
- Fantasy impact is qualitative context, not official Dream11 scoring or points prediction.
- The sample match state and player names are fictional demo data.

## Suggested demo flow

1. Open the deployed site and explain the fan problem.
2. Show the score and required run rate.
3. Click **Next ball** to advance the simulated match.
4. Point out how the insight and match context update.
5. Load the browser AI and ask: “Why is this chase under pressure?”
6. Explain the privacy and architecture: the browser downloads the model and runs inference locally using WebGPU; no remote LLM API is called.

## Architecture

```text
Browser (reviewer's device)
  ├── Next.js UI
  ├── Match state + deterministic cricket calculations
  └── WebLLM
       └── WebGPU
            └── Local quantized language model
```

## Before submission

- [ ] Test on a second device/browser
- [ ] Confirm WebGPU and model loading work
- [ ] Test the fallback experience
- [ ] Confirm all demo claims match what the app actually does
- [ ] Add your own short screen recording if the submission form permits it
