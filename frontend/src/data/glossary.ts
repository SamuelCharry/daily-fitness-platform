import type { PersonalizationContext } from '../utils/personalization';

export interface GlossaryTerm {
  term: string;
  definition: string;
  whyItMatters: string;
  // Optional: returns a sentence applying the term to the user's own logged data,
  // or null when there isn't enough data yet. Add more of these as new terms need it -
  // this is the pattern, not a one-off for protein.
  personalize?: (ctx: PersonalizationContext) => string | null;
}

export interface GlossaryCategory {
  key: string;
  label: string;
  intro: string;
  terms: GlossaryTerm[];
}

export const GLOSSARY: GlossaryCategory[] = [
  {
    key: 'routines',
    label: 'Routines',
    intro: 'How a week of training gets grouped into sessions.',
    terms: [
      {
        term: 'Full Body',
        definition:
          'A split where every session trains all the major muscle groups, usually repeated 2–4x per week with a handful of sets per muscle each time.',
        whyItMatters:
          'A muscle only needs a few quality sets to get a strong growth signal, so spreading full-body sessions across the week lets you hit each one more often without any single day turning into a marathon. It is also the most efficient way for a newer lifter to build a base, since every session leans on compound lifts that recruit a lot of muscle at once.',
      },
      {
        term: 'Upper / Lower',
        definition:
          'A two-way split that alternates upper-body and lower-body sessions, commonly run 4x per week (two upper, two lower) so each region still gets trained twice.',
        whyItMatters:
          "It's the middle ground between Full Body's frequency and Push/Pull/Legs' focus: each session has enough room for real isolation work, while every muscle group still gets trained at least twice a week — the frequency most current evidence favors for maximizing growth.",
      },
      {
        term: 'Push / Pull / Legs (PPL)',
        definition:
          'Sessions grouped by movement direction — pushing muscles (chest, shoulders, triceps), pulling muscles (back, biceps), and legs — usually rotated across 6 or 7 days.',
        whyItMatters:
          'Because each muscle only shows up in one session type, PPL lets you pack in more total sets and exercise variety per muscle in a single sitting. The tradeoff is that it needs more training days per week to still reach two sessions per muscle before the week resets.',
      },
    ],
  },
  {
    key: 'variables',
    label: 'Training Variables',
    intro: 'The dials that actually decide whether a workout builds muscle.',
    terms: [
      {
        term: 'Volume',
        definition:
          'The number of hard working sets a muscle gets per week — not total weight moved, and not warm-up sets.',
        whyItMatters:
          "Volume is the dial you turn once frequency and intensity are already set, and more isn't automatically better. Volume and frequency trade off against each other — spread across 3x/week you might only need 1–3 sets per session, while 1x/week can call for 6 or more — so the right number depends entirely on how often that muscle is trained, not on a fixed weekly target.",
      },
      {
        term: 'Intensity & RIR',
        definition:
          'In a hypertrophy context, intensity means how close a set gets to failure. RIR (Reps in Reserve) is how that gets measured: 0 RIR is failure, 2 RIR means the set stopped two reps short.',
        whyItMatters:
          "A set only counts as a real working set if it's taken close enough to failure — generally within 0–2 RIR. Sets left too far from failure don't send a strong enough signal to grow, which is why RIR (not just the weight on the bar) is the number that tells you whether a set actually did anything.",
      },
      {
        term: 'Progressive Overload',
        definition:
          'Doing more than last time on the same exercise with the same technique — more reps, more weight, or both.',
        whyItMatters:
          "It's the one mechanism that forces a muscle to adapt. Without it, you can train hard indefinitely and still stall out, because the body has no reason to build tissue for a stimulus it can already handle without difficulty.",
      },
      {
        term: 'Frequency',
        definition: 'How many times per week a given muscle group gets directly trained.',
        whyItMatters:
          'Training a muscle just once a week still works, but the current evidence leans toward twice a week or more producing better results for the same total weekly volume — mostly because splitting the same sets across more sessions means less fatigue has built up going into each one, so every set stays higher quality.',
      },
    ],
  },
  {
    key: 'nutrition',
    label: 'Nutrition',
    intro: 'What you eat decides body composition; training decides where it comes from.',
    terms: [
      {
        term: 'Caloric Deficit / Surplus',
        definition:
          'Eating less than you burn (deficit) drives fat loss; eating more (surplus) supports a building phase.',
        whyItMatters:
          "This is the only lever that changes the direction of your body weight — training and protein intake decide how much of that change is fat versus muscle, but calories decide which way the scale moves. Because day-to-day weight swings with water and food weight, it's the trend over 2+ weeks that tells you the real deficit or surplus, not any single morning's number.",
        personalize: (ctx) => {
          if (ctx.avgCalories == null || ctx.weeklyWeightRateKg == null) return null;
          const maintenance = Math.round(ctx.avgCalories - ctx.weeklyWeightRateKg * 1100);
          const avg = Math.round(ctx.avgCalories);
          return `Based on your logged intake (~${avg} kcal/day avg) and your actual weight trend, your estimated maintenance is ~${maintenance} kcal/day.`;
        },
      },
      {
        term: 'Macronutrients',
        definition:
          'The three calorie-containing nutrients — protein and carbs at about 4 calories per gram, fat at about 9.',
        whyItMatters:
          'For natural hypertrophy, protein gets set first since it protects muscle during a deficit and supports growth during a surplus, fat gets a minimum floor for hormone health, and carbs fill in whatever calories are left over — a "gap filler" rather than the macro you plan your day around.',
      },
      {
        term: 'Protein Requirement',
        definition:
          'Research generally supports 1.6–2.2g of protein per kg of bodyweight (roughly 0.7–1g per lb) to maximize muscle growth — going higher has little added benefit for most natural lifters.',
        whyItMatters:
          "Protein is the one macro with a real hypertrophy ceiling below which growth suffers — undershoot it during a deficit and you risk losing muscle instead of just fat. Above about 2.2g/kg, more protein mostly just displaces calories that could go to carbs or fat without adding further muscle-building benefit.",
        personalize: (ctx) => {
          if (ctx.weightKg == null) return null;
          const min = Math.round(ctx.weightKg * 1.6);
          const optLow = Math.round(ctx.weightKg * 1.8);
          const optHigh = Math.round(ctx.weightKg * 2.2);
          return `With your current weight (${ctx.weightKg}kg): minimum ~${min}g/day, optimal ~${optLow}–${optHigh}g/day.`;
        },
      },
      {
        term: 'Daily Water Needs',
        definition:
          'A common baseline guideline is about 30–40ml of water per kg of bodyweight per day, before accounting for training, heat, or diet.',
        whyItMatters:
          "Being underhydrated hurts strength and endurance in the gym before it shows up as obvious thirst, and higher protein intakes (common in a hypertrophy-focused diet) increase water needs further since the kidneys use extra water to process it. This is a general guideline, not from either book — treat it as a floor to adjust from, not a precise target.",
        personalize: (ctx) => {
          if (ctx.weightKg == null) return null;
          const liters = ((ctx.weightKg * 35) / 1000).toFixed(1);
          return `With your current weight (${ctx.weightKg}kg): a baseline of ~${liters}L/day — more on hot days or heavy training sessions.`;
        },
      },
      {
        term: 'Food Quality Hierarchy',
        definition:
          'A rough ranking of food categories by how filling they are per calorie: vegetables, meat, fruit, refined carbs, oils, and junk food — from most to least satiating.',
        whyItMatters:
          "Two diets with identical calories and macros can feel completely different depending on where those calories come from. Leaning toward the vegetables/meat/fruit end of that list makes a calorie deficit far more sustainable, simply because those foods keep you fuller on fewer calories — which is usually the real reason diets fail, not a lack of willpower.",
      },
      {
        term: 'Meal Timing & Frequency',
        definition: 'How your daily calories and protein get spread across meals during the day.',
        whyItMatters:
          "Daily and weekly totals matter far more than exact timing for muscle growth — hitting your numbers consistently beats hitting a precise meal schedule. That said, spreading protein across 3–5 meals is a reasonable default for keeping hunger and recovery steady, especially during a deficit.",
      },
    ],
  },
  {
    key: 'supplements',
    label: 'Supplements',
    intro: 'What actually has evidence behind it, without the marketing.',
    terms: [
      {
        term: 'Creatine Monohydrate',
        definition:
          'A naturally occurring compound that increases the phosphocreatine your muscles use to fuel short, high-effort work.',
        whyItMatters:
          "It's the most studied supplement in sports nutrition: a consistent ~3–5g/day reliably improves strength and the amount of quality training volume you can do, which indirectly drives more growth over time. No loading phase or cycling is needed for it to work.",
      },
      {
        term: 'Protein Powder',
        definition: 'A concentrated, convenient protein source — not a special muscle-building compound.',
        whyItMatters:
          "A gram of protein from powder doesn't build muscle any better than a gram from food. Its only real advantage is convenience for hitting a daily protein target when whole food isn't practical, which matters most for people already close to their minimums.",
      },
      {
        term: 'Caffeine',
        definition: 'A stimulant that increases alertness and lowers perceived effort during a set.',
        whyItMatters:
          'A dose of roughly 3–6mg per kg of bodyweight, taken 30–60 minutes before training, reliably improves performance on a given set — and sets taken closer to true failure are the ones that drive growth. Tolerance builds quickly with daily use, so the benefit shrinks unless intake is cycled or reserved for harder sessions.',
      },
    ],
  },
  {
    key: 'body-composition',
    label: 'Body Composition',
    intro: 'What the numbers on your Dashboard actually mean.',
    terms: [
      {
        term: 'FFMI (Fat-Free Mass Index)',
        definition:
          "A height-adjusted measure of how much muscle you're carrying — similar to BMI, but built from fat-free mass instead of total weight, so it doesn't confuse a lean, muscular build with an overweight one.",
        whyItMatters:
          'For a natural lifter, FFMI has a rough ceiling — most drug-free men top out somewhere around 23-25 after years of training, and values well above that are a red flag for the number being unreliable (bad body-fat input) or for enhancement. As a natural-lifter guide: below 18 is below average, 18-19 average, 19-20 above average, 20-21 excellent, 21-22 superior, and 22-23 is a rare natural ceiling most people never reach. Women\'s natural FFMI tends to run about 3-4 points lower for equivalent development.',
      },
      {
        term: 'Body Fat Estimation Methods',
        definition:
          'The Dashboard shows three different body-fat estimates side by side: Navy (from waist/neck/hip tape measurements), Deurenberg (from BMI + age, no tape measure needed), and InBody (whatever you manually enter from a scan).',
        whyItMatters:
          "None of these are lab-accurate, and they can disagree by several percentage points on the same day — that's normal, not a bug. Navy is usually the most reliable of the two calculated methods since it's based on actual body measurements rather than just weight and height. Track the trend of whichever method you use consistently rather than comparing the raw numbers between methods.",
      },
    ],
  },
];
