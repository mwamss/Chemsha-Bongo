-- Chemsha Bongo Mini-Game Registry Seed Data
-- Seeded into PostgreSQL upon initial container start or via migration script

INSERT INTO games (id, title, subtitle, category, category_label, icon, color_accent, is_active, created_at)
VALUES
  (
    'color-clash',
    'Color Clash',
    'Inhibition Challenge',
    'focus',
    'Attention & Focus',
    '🎨',
    '#ef4444',
    TRUE,
    NOW()
  ),
  (
    'chimp-memory',
    'Chimp Memory',
    'Working Memory Grid',
    'memory',
    'Working Memory',
    '🐵',
    '#10b981',
    TRUE,
    NOW()
  ),
  (
    'rapid-math',
    'Rapid Math',
    'Mental Arithmetic',
    'math',
    'Mental Calculation',
    '⚡',
    '#3b82f6',
    TRUE,
    NOW()
  ),
  (
    'confusing-arrows',
    'Confusing Arrows',
    'Spatial Direction Reflex',
    'reflex',
    'Spatial Reflexes',
    '🧭',
    '#f59e0b',
    TRUE,
    NOW()
  ),
  (
    'number-sequence',
    'Pattern Sequence',
    'Pattern Deduction',
    'logic',
    'Logic & Induction',
    '🧩',
    '#8b5cf6',
    TRUE,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  category = EXCLUDED.category,
  category_label = EXCLUDED.category_label,
  icon = EXCLUDED.icon,
  color_accent = EXCLUDED.color_accent,
  is_active = EXCLUDED.is_active;
