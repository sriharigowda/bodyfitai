# BodyFitAI

AI-powered fitness analysis website. Enter 12 body measurements and get a personalized calorie target, macro split, body fat %, and AI-generated fitness plan.

## Tech Stack
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Claude API** (Anthropic) for AI insights
- **Vercel** for hosting

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/bodyfitai.git
cd bodyfitai
npm install
```

### 2. Set up your API Key

```bash
cp .env.example .env.local
```

Open `.env.local` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Get your API key at: https://console.anthropic.com

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

### Option B — GitHub + Vercel Dashboard

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Click Deploy

## Project Structure

```
bodyfitai/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts      # Claude API endpoint
│   ├── globals.css           # Global styles + CSS variables
│   ├── layout.tsx            # Root layout + metadata
│   └── page.tsx              # Main page + multi-step form
├── components/
│   └── ResultsPage.tsx       # Results display with AI insights
├── lib/
│   └── calculations.ts       # BMR, TDEE, body fat formulas
├── .env.example
└── README.md
```

## How it works

1. User enters 12 body measurements across 4 steps
2. Frontend sends measurements to `/api/analyze`
3. Server calculates: body fat % (US Navy method), BMR (Mifflin-St Jeor), TDEE, macros
4. Server sends all data to Claude API for personalized AI insights
5. Results page shows everything: calories, macros, body composition, meal plan, workout tips

## Formulas Used

- **Body Fat %**: US Navy Circumference Method
- **BMR**: Mifflin-St Jeor Equation
- **TDEE**: BMR × Activity Multiplier
- **Macros**: Based on goal (protein 2.0-2.2g/kg, 25% fat, remainder carbs)
