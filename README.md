# AI TRPG Demo

A web-based AI tabletop role-playing demo built for the **AIDM7040 Generative AI for Digital Media** group project.

This project explores how a large language model can take over part of a traditional **TRPG game master (GM)** role in a lightweight digital format. Instead of requiring a human host to narrate the story, role-play NPCs, interpret player actions, and maintain pacing, the system combines **LLM-generated narrative output** with **rule-based game logic** to create a suspense-driven interactive experience.

The current demo is set in **St. Alden Residential Academy**, a burned boarding school hiding an illegal treatment and experiment system. Players investigate the reopened missing-student case through different roles and routes, collect evidence, survive dangerous scenes, and uncover their own connection to the truth.

---

## Project Goal

The goal of this project is to make TRPG-style storytelling more accessible in a short-form web experience.

Traditional tabletop role-playing games are highly immersive, but they often require:

- an experienced human game master,
- preparation time,
- rule explanation,
- and players who are already comfortable with role-playing and story-driven systems.

This project asks a practical question:

> Can a hybrid AI system act as a lightweight digital GM while preserving narrative tension, player agency, and replayable interaction?

---

## Core Features

### 1. Role-based play
Players can start a new investigation as one of three roles:

- **Detective** — strongest in observation and clue reconstruction
- **Hacker** — better at damaged systems, terminals, and facility logic
- **Priest** — highest willpower when facing memory shocks and deep treatment zones

Each role has different starting stats and inventory.

### 2. Two investigation routes
The demo currently supports two playable scenarios:

- **Main Campus Route** (`basement_case`)
  - Enter through the ruined school gate
  - Follow Lucas's archive traces
  - Descend into the underground treatment core

- **Wellness Center Route** (`infirmary_case`)
  - Approach through the outer treatment wing
  - Follow Nina's marks and logs
  - Uncover what Student Wellness Center was really built for

### 3. Two run lengths
Players can choose different pacing modes:

- **Short Mode** — a faster route for demo play
- **Long Mode** — adds more route reconstruction, memory pressure, corroboration beats, and identity evidence

### 4. Hybrid AI + rules architecture
The system does **not** rely on free generation alone.

- The **LLM layer** handles narration, NPC dialogue, and adaptive scene feedback.
- The **rule layer** handles dice checks, state updates, danger increase, HP loss, clue flags, and scene transitions.

This makes the experience more flexible than a fixed branching story, but more stable than an unconstrained chatbot.

### 5. Dice-check mechanic
When players perform important actions, the system may trigger a **skill check**.

Skill categories include:

- `observation`
- `persuasion`
- `willpower`

The result combines:

- a d20 roll,
- the selected role's skill modifier,
- and rule-based success/failure logic.

Possible outcomes include:

- `fail`
- `success`
- `great_success`

### 6. Stateful narrative progression
The game tracks key variables during play, including:

- current scene,
- HP,
- danger level,
- inventory,
- story flags,
- turn count,
- and final session summary.

These variables determine whether the player:

- unlocks a new area,
- finds evidence,
- triggers memory-related story beats,
- reveals their identity,
- becomes overwhelmed,
- or escapes with the truth.

---

## Story Setting

The demo takes place in **St. Alden Residential Academy**, a boarding school destroyed by fire years ago. After an explorer team uploads footage of a hidden underground treatment area, the missing-student case is reopened.

As the player investigates, it becomes clear that:

- the school was working with **Helix Juvenile Development Institute**,
- the so-called **Student Wellness Center** was not a normal support space,
- students were turned into long-term experiment samples,
- and the player is not simply an outside investigator.

The current story design includes major evidence beats tied to:

- Lucas's hidden route fragments,
- Nina's repeated marks and notes,
- Ethan's treatment system and authority control,
- Helix contracts and protocols,
- and the player's forgotten identity as a surviving “successful sample.”

---

## Tech Stack

### Front end
- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**

### AI / backend integration
- **OpenAI SDK** configured to call the **DeepSeek API**
- **Next.js Route Handlers** for session start and action resolution
- **Zod** included for validation-related extension work

### Project language distribution
- TypeScript (main)
- CSS
- JavaScript (minimal)

---

## Project Structure

```text
ai-trpg/
├── app/
│   ├── api/
│   │   └── game/
│   │       ├── start/route.ts      # Start a new session
│   │       └── action/route.ts     # Preview / resolve player actions
│   ├── create/page.tsx             # Character / route / mode setup page
│   ├── game/[sessionId]/page.tsx   # Main gameplay page
│   └── page.tsx                    # Landing page
├── lib/
│   ├── ai.ts                       # DeepSeek client via OpenAI SDK
│   ├── rules.ts                    # Rule-based action analysis and state logic
│   └── ...
├── public/                         # Static assets
├── types/
│   └── game.ts                     # Core game/session types
├── package.json
└── README.md
```

---

## How the System Works

### 1. Start a session
The player selects:

- a **role**,
- a **scenario route**,
- a **game mode**,
- an optional **name**,
- and a danger threshold.

The server then creates an initial `GameState` object with:

- `sessionId`
- `world`
- `scenario`
- `gameMode`
- `currentScene`
- `character`
- `flags`
- `log`
- `danger`
- `maxDanger`
- `turnCount`
- `isFinished`

### 2. Submit an action
During play, the player enters an action through the website UI.

The system first sends a **preview request** to determine whether the action needs a roll check.

### 3. Trigger a dice check when needed
If the action matches a skill-based intent, the system:

- identifies the skill,
- calculates the modifier from the character build,
- rolls a d20,
- and stores the result.

The UI then displays the dice animation and result before the action is fully resolved.

### 4. Resolve action and update state
After the roll, the system:

- applies rule-based effects,
- updates danger / HP / flags / inventory,
- checks whether scene progression conditions are met,
- and decides whether the session can end.

### 5. Generate narration with structured context
The updated game state is passed to the LLM prompt, including:

- current scene,
- role and stats,
- inventory,
- danger level,
- recent story log,
- unlocked flags,
- current route,
- and current pacing mode.

The model then returns JSON-formatted output with:

- `narration`
- `npcReply`
- `suggestedActions`

### 6. Render response on the website
The front end updates:

- story log,
- visible status,
- suggested next actions,
- dice result,
- and scene progress.

This loop repeats until the player escapes, finds the truth, is overwhelmed, or ends the session.

---

## Current Gameplay Systems

### Character stats
Each character includes:

- `hp`
- `observation`
- `persuasion`
- `willpower`
- `inventory`

### Core scenes
Current scenes include:

- `gate`
- `hallway`
- `archive`
- `basement`
- `courtyard`
- `clinic_hall`
- `infirmary`
- `quarantine_room`

### State flags
The system tracks many evidence and progression flags, such as:

- `truth_found`
- `identity_revealed`
- `memory_trigger_found`
- `release_record_found`
- `escape_log_found`
- `escaped_with_evidence`
- `overwhelmed`
- `hp_depleted`

### Session summary
When a run ends, the system can produce a structured summary containing:

- session title,
- outcome,
- story summary,
- and key findings.

---

## Local Development

### Prerequisites
- Node.js (recent LTS recommended)
- npm
- a valid **DeepSeek API key**

### 1. Clone the repository
```bash
git clone https://github.com/guaiwu012/AI-trpg.git
cd AI-trpg/ai-trpg
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create environment variables
Create a `.env.local` file in `ai-trpg/` and add:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### 4. Run the development server
```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Available Scripts

```bash
npm run dev     # start local development server
npm run build   # build production version
npm run start   # run production server
npm run lint    # run ESLint
```

---

## Deployment

The project is designed for web deployment and is currently linked to Vercel.

Live demo:
- `https://ai-trpg-nu.vercel.app`

To deploy your own copy:

1. Import the repository into Vercel
2. Set the environment variable:
   - `DEEPSEEK_API_KEY`
3. Build and deploy

---

## API Overview

### `POST /api/game/start`
Creates a new game session.

Typical request body:

```json
{
  "role": "detective",
  "scenario": "basement_case",
  "gameMode": "long",
  "maxDanger": 15,
  "name": "Player"
}
```

### `POST /api/game/action`
Handles player actions.

The endpoint supports two phases:

- `preview` — determine whether a roll check is required
- `resolve` — apply game logic and generate the final response

---

## Evaluation

This project was also evaluated through a post-play user questionnaire.

The evaluation focused on:

- immersion,
- plot attraction,
- interactivity,
- AI system performance,
- creativity stimulation,
- and overall experience.

The questionnaire results were used in the project report to assess whether the AI TRPG format successfully improved accessibility and player engagement.

---

## Known Limitations

The current version is a functional demo, not a full commercial game. Some limitations remain:

- suspense atmosphere can still be strengthened,
- the interface is still text-heavy,
- audiovisual feedback is limited,
- some interaction beats can be clearer,
- and story expansion is still ongoing.

These limitations are also part of the next iteration goals.

---

## Future Work

Planned or possible next steps include:

- stronger visual and audio feedback,
- richer NPC behavior,
- more route divergence,
- more scenario branches,
- better persistence / save systems,
- expanded evidence visualization,
- multi-language support,
- and broader user testing.

---

## Course Context

This repository was developed for:

**AIDM7040 – Generative AI for Digital Media**

It is part of a course project exploring how LLM-based systems can be used in interactive storytelling and digital media applications.

---
