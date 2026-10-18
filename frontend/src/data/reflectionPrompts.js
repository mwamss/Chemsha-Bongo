import reflectionData from './reflectionQuestions.json';

// Flatten all questions with category context
const allQuestions = [];
reflectionData.categories.forEach((cat) => {
  cat.questions.forEach((q) => {
    allQuestions.push({
      id: q.id,
      question: q.question,
      category: cat.name,
    });
  });
});

/**
 * Returns metadata about the reflection questions collection.
 */
export const getReflectionMetadata = () => ({
  title: reflectionData.title,
  description: reflectionData.description,
  questionCount: reflectionData.question_count || allQuestions.length,
  usageNote: reflectionData.usage_note,
  sourceNotes: reflectionData.source_notes,
});

/**
 * Returns all reflection categories with their question counts.
 */
export const getAllCategories = () => {
  return reflectionData.categories.map((cat) => ({
    name: cat.name,
    count: cat.questions.length,
  }));
};

/**
 * Returns list of category names only.
 */
export const getCategoryNames = () => {
  return reflectionData.categories.map((cat) => cat.name);
};

/**
 * Returns all 160 reflection questions flattened with category name.
 */
export const getAllQuestions = () => {
  return [...allQuestions];
};

/**
 * Returns questions belonging to a specific category (case-insensitive substring match).
 */
export const getPromptsByCategory = (categoryName) => {
  if (!categoryName) return getAllQuestions();
  const lower = categoryName.toLowerCase().trim();
  const found = reflectionData.categories.find(
    (c) => c.name.toLowerCase() === lower || c.name.toLowerCase().includes(lower)
  );
  if (!found) return [];
  return found.questions.map((q) => ({
    id: q.id,
    question: q.question,
    category: found.name,
  }));
};

/**
 * Returns a random prompt from either the entire catalog or a specific category.
 * Optionally excludes a prompt ID to avoid repeating the immediately preceding question.
 */
export const getRandomPrompt = (categoryName = null, excludeId = null) => {
  let pool = categoryName ? getPromptsByCategory(categoryName) : allQuestions;
  if (!pool || pool.length === 0) pool = allQuestions;
  if (excludeId !== null && pool.length > 1) {
    const filtered = pool.filter((q) => q.id !== excludeId);
    if (filtered.length > 0) pool = filtered;
  }
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
};

/**
 * Returns a deterministic Daily Reflection prompt keyed by the date.
 * All users on a given day will experience the same Daily Check-In/Contemplation prompt.
 */
export const getDailyPrompt = (date = new Date()) => {
  const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : String(date);
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % allQuestions.length;
  return {
    ...allQuestions[index],
    date: dateStr,
  };
};

const CATEGORY_THEME_MAP = {
  "Questions About Your Past": {
    theme: "Past & Roots",
    description: "Honoring past experiences, lessons, and personal origins."
  },
  "Questions About Your Emotions": {
    theme: "Emotional Landscape",
    description: "Noticing feelings with gentleness, curiosity, and non-judgment."
  },
  "Questions About Your Thoughts": {
    theme: "Mind & Perspective",
    description: "Observing mental patterns, thought habits, and inner clarity."
  },
  "Questions About Your Healthy Habits": {
    theme: "Daily Rhythms",
    description: "Cultivating small, sustainable habits that support well-being."
  },
  "Questions About Your Beliefs": {
    theme: "Core Principles",
    description: "Examining values, guiding convictions, and personal truths."
  },
  "Questions About Your Relationships": {
    theme: "Connection & Trust",
    description: "Deepening empathy, boundaries, and interpersonal presence."
  },
  "Questions About Your Career": {
    theme: "Vocation & Work",
    description: "Reflecting on purpose, craft, effort, and fulfillment."
  },
  "Questions About Your Future Plans": {
    theme: "Future Horizons",
    description: "Planting deliberate intentions and looking forward with calm."
  },
  "Daily Mental Check-In": {
    theme: "Daily Check-In",
    description: "Arriving into the present moment with honesty and care."
  },
  "Grounding and Gentle Distraction": {
    theme: "Grounding & Calm",
    description: "Centering awareness through breath and present sensory grounding."
  },
  "Open-Ended Mental Discussion": {
    theme: "Open Dialogue",
    description: "Spacious questions inviting deeper contemplation and dialogue."
  },
  "Thoughts and Perspective": {
    theme: "Perspective Shift",
    description: "Viewing challenges with patience, broadness, and self-kindness."
  },
  "Coping, Needs, and Support": {
    theme: "Needs & Support",
    description: "Recognizing needs, asking for support, and replenishing energy."
  },
  "Meaning, Values, and Next Steps": {
    theme: "Values & Next Steps",
    description: "Taking realistic, meaningful actions aligned with what matters."
  }
};

/**
 * Enriches a raw reflection question with code, suggested pause,
 * and contemplation points for the Guided Inquiry view.
 */
export const enrichPrompt = (prompt) => {
  if (!prompt) return null;
  const cat = prompt.category || "Daily Mental Check-In";
  const themeInfo = CATEGORY_THEME_MAP[cat] || {
    theme: cat,
    description: "Mindful contemplation and honest reflection."
  };

  const idNum = Number(prompt.id) || 1;
  const pauseMinutes = (idNum % 4) + 4; // 4 to 7 minutes

  const somaticPoint = {
    title: "Somatic Resonance · Point 1",
    text: "Where in your physical body or daily routine do you feel this question most clearly? Is it tight shoulders, shallow breath, or quiet fatigue?",
    instruction: "Pause for 3 breaths before writing"
  };

  const releasePoint = {
    title: "Gentle Release · Point 2",
    text: "What would realistically happen if you met this inquiry with spacious curiosity instead of self-judgment? Who would you be without this silent obligation?",
    instruction: "Ask this to yourself or your conversation partner"
  };

  return {
    ...prompt,
    code: `#${String(idNum).padStart(3, '0')} · ${cat}`,
    pauseMinutes,
    shortTitle: themeInfo.theme,
    themeDescription: themeInfo.description,
    somaticPoint,
    releasePoint,
  };
};

/**
 * Returns companion inquiry questions from different categories for today's focus.
 */
export const getCompanionPrompts = (currentId = null, count = 3) => {
  const currentNum = Number(currentId) || 1;
  const otherQuestions = allQuestions.filter((q) => q.id !== currentNum);

  const companions = [];
  const usedCategories = new Set();
  const seed = (currentNum * 17 + 23) % otherQuestions.length;

  for (let i = 0; i < otherQuestions.length && companions.length < count; i++) {
    const candidate = otherQuestions[(seed + i * 19) % otherQuestions.length];
    if (!usedCategories.has(candidate.category)) {
      usedCategories.add(candidate.category);
      companions.push(enrichPrompt(candidate));
    }
  }

  while (companions.length < count && otherQuestions.length > companions.length) {
    const candidate = otherQuestions[(seed + companions.length * 7) % otherQuestions.length];
    companions.push(enrichPrompt(candidate));
  }

  return companions;
};

export default {
  getReflectionMetadata,
  getAllCategories,
  getCategoryNames,
  getAllQuestions,
  getPromptsByCategory,
  getRandomPrompt,
  getDailyPrompt,
  enrichPrompt,
  getCompanionPrompts,
};

