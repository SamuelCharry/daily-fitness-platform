# Routine fine tuning

The panel is below the muscle summary in the routine editor. It operates on the scheduled week, or treats each workout as one exposure when no weekdays are assigned. Zero-set exercises remain excluded. Two workouts on the same weekday share one muscle exposure and one time budget.

Targets are direct sets per muscle per training day, aggregated across chest regions and upper-back/trapezius entries. F2 uses sufficient/medium/high = 2/4/6; F3+ = 1/2/3. F1 uses application starting goals 6/8/10, explicitly distinguished from TNF's open-ended 6+ baseline. Each selected active exercise retains at least one set. At most one upper and one lower muscle can have high priority.

The deterministic allocator reserves minimums, then adds high-priority sets, then medium sets. It splits the result evenly across a muscle's exercises. Estimated minutes = sets * (rest + execution), including a rest per set; warm-up and transitions are excluded and disclosed. If minimums cannot fit, or the exercise count alone exceeds a finite baseline, Apply stays disabled. No exercise or calendar assignment is silently removed.

Apply and Undo are authenticated atomic operations. An exact expected routine snapshot prevents applying stale previews. The latest pre/post snapshot persists in routine_tuning; Undo refuses to overwrite subsequent manual edits. Existing exercise-slot IDs, rep ranges, RIR, comments and logged sessions remain intact. The editor flushes pending saves before preview/apply and refreshes its cards after the bulk update.

On server seed, creator_template.capture_creator_template takes one frozen copy from the explicitly authorized creator account, matched by its email digest. It accepts a unique PPLxUL/PPLUL/Push Pull Legs program (preferring active); ambiguity causes no publication. The template excludes private comments, email, body metrics and history. Later personal edits do not update it. The authenticated template endpoint copies programming settings into an independent owned routine, in one transaction. The actual production source is available only on the server, so local QA uses a disposable example account.

Verification:

- node frontend/scripts/test-plan-analysis.cjs
- .venv/Scripts/python.exe -m unittest discover -s backend/tests -v
- npm run build --prefix frontend
- npm run lint --prefix frontend

Browser QA uses an isolated local database: priorities, time reduction, impossible budgets, apply/reload/undo, rest in minutes, creator-template copy and mobile width.


## Review and exercise order

The editor keeps autosaving. Finish/Save and review flushes pending saves, fetches the saved routine, then shows the review and muscle summary. Each warning can be acknowledged; Keep my routine becomes available when all displayed warnings are accepted. Optimization is optional and can be opened without accepting warnings, to fix them. Acceptance is scoped to that review; subsequent edits invalidate it.

The optimizer sorts each workout by high, medium, then sufficient priority, preserving existing order within a level. Preview exposes the full proposed sequence. Apply validates complete per-workout permutations and persists order together with sets/rest; Undo restores all three.

## Quick substitution during training

A session-only mapping chooses a replacement for a workout slot; the base routine is never mutated. Alternatives are filtered by normalized muscle and ranked by shared joint action, then different equipment. Same muscle/pattern is explicitly not a guarantee of equivalent stimulus. Substitutions persist across reloads, can be restored to the original exercise, and do not carry into the next session.

Every newly saved set records its actual exercise ID. Existing logged sets are not relabelled; edits preserve their identity. The logging UI labels sets performed with an earlier exercise, keeps draft inputs separate, and does not reuse previous weights from a different exercise. History, CSV, progress and strength-map calculations use actual exercise IDs. Stale substitutions/log requests, foreign sessions and finished sessions are rejected. Schema changes are additive and old sets keep a fallback to their original workout slot.
