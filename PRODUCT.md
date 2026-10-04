# Cool for the Summer

Personal web training journal for one natural bodybuilding athlete, in Spanish. The existing React / FastAPI / SQLite stack is retained. The user explicitly requests replacing the visual identity, spreadsheet-like convenience, tracking workouts and weight, and server deployment.

## Core tasks
- Log bodyweight, nutrition, recovery and notes in a keyboard-friendly editable table.
- Plan workouts and log actual sets (kg, repetitions, RIR), preserving existing routines and history.
- Review weight averages, completed sessions and preparation together.
- Export personal records and keep server-side persistence.

## Brand commitments
Cool for the Summer is the exact product name. Spreadsheet comfort is the pinned visual and interaction direction: a clear, light working surface, compact rows, readable numbers and direct editing; the user confirmed red without black and a workout flow inspired by their experience of Jeff Nippard's app. Personal utility outranks marketing. Replace the existing red/black identity.

## Constraints and assumptions
Use existing data and API; never populate invented personal measurements. Single-user local mode may bypass login explicitly; public deployment must protect private data. Hosting destination and spreadsheet structure are pending user answers. Proposed working colors are warm white, warm ink and brick red. Preparation means tracking and user-entered goals, not automatic clinical or contest advice.

## Stack
React 19, TypeScript, Vite; FastAPI, SQLAlchemy, SQLite. Docker Compose with durable database storage and reverse proxy for deployment.

