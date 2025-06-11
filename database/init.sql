-- ─── init.sql ─────────────────────────────────────────────────────────────────

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  hashed_password VARCHAR(200) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE
);

-- ─── SETTINGS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allergies JSONB DEFAULT '[]',
  dislikes JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '[]',
  favorites JSONB DEFAULT '[]'
);

-- ─── PANTRY ITEMS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pantry_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  temporary BOOLEAN DEFAULT FALSE
);

-- ─── INGREDIENTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingredients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50)
);

-- ─── RECIPES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  instructions TEXT NOT NULL,
  prep_time INTEGER DEFAULT 30,
  servings INTEGER DEFAULT 4,
  cooking_method VARCHAR(50) DEFAULT 'any',
  diet VARCHAR(50) DEFAULT 'any'
);

-- ─── RECIPE ↔ INGREDIENTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity FLOAT DEFAULT 1.0,
  unit VARCHAR(20) DEFAULT 'unit',
  PRIMARY KEY (recipe_id, ingredient_id)
);


-- ─── SEED DATA ─────────────────────────────────────────────────────────────────

-- 1) Ingredients
INSERT INTO ingredients (name, category) VALUES
  ('onion',          'vegetable'),
  ('olive oil',      'oil'),
  ('salt',           'seasoning'),
  ('pepper',         'seasoning'),
  ('chicken breast', 'meat'),
  ('garlic',         'vegetable'),
  ('lemon',          'fruit'),
  ('butter',         'dairy'),
  ('pasta',          'grain'),
  ('tomato',         'vegetable')
ON CONFLICT DO NOTHING;

-- 2) Recipes
INSERT INTO recipes (title, instructions, prep_time, servings, cooking_method, diet) VALUES
  (
    'Grilled Lemon Chicken',
    '1. Marinate chicken breasts in olive oil, lemon juice, minced garlic, salt & pepper for 10 min.\n'
  || '2. Preheat grill (or pan) on medium-high heat, cook chicken 6–7 min per side until done.\n'
  || '3. Let rest 5 min, slice and serve with a wedge of lemon.',
    20,
    2,
    'grill',
    'low-carb'
  ),
  (
    'One-Pan Chicken & Onions',
    '1. Heat olive oil & butter in a skillet, add sliced onion and cook until translucent.\n'
  || '2. Season chicken with salt & pepper, move onions aside and sear chicken 5 min per side.\n'
  || '3. Cover and simmer 8 min more until cooked through. Serve hot.',
    25,
    2,
    'pan-fry',
    'any'
  ),
  (
    'Chicken Pasta Primavera',
    '1. Boil pasta until al dente.\n'
  || '2. In another pan, sauté chopped onion & garlic in olive oil. Add diced tomato and cook 3 min.\n'
  || '3. Stir in bite-sized chicken pieces, season with salt & pepper and cook until done.\n'
  || '4. Toss pasta into sauce, finish with a squeeze of lemon.',
    25,
    2,
    'boil',
    'any'
  ),
  (
    'Creamy Garlic Chicken Soup',
    '1. Sauté diced onion & minced garlic in butter until soft.\n'
  || '2. Add chopped chicken, cover with water or broth, bring to a boil then simmer 15 min.\n'
  || '3. Season with salt & pepper, stir in a splash of cream (or butter) and serve.',
    30,
    4,
    'boil',
    'any'
  ),
  (
    'Tomato-Garlic Chicken Stir-Fry',
    '1. Heat olive oil in wok or pan, add sliced onion & garlic and stir-fry 2 min.\n'
  || '2. Add chicken strips, cook until opaque.\n'
  || '3. Add chopped tomato, season with salt & pepper, toss briefly and serve over rice or on its own.',
    20,
    2,
    'stir-fry',
    'any'
  )
ON CONFLICT DO NOTHING;

-- 3) recipe_ingredients links
--   We assume ingredient IDs in the same order as above:
--     1:onion, 2:olive oil, 3:salt, 4:pepper, 5:chicken breast,
--     6:garlic, 7:lemon, 8:butter, 9:pasta, 10:tomato

INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES
  -- Grilled Lemon Chicken  (recipe_id=1)
  (1, 5, 1.0, 'piece'),
  (1, 2, 1.0, 'tbsp'),
  (1, 7, 1.0, 'unit'),
  (1, 6, 2.0, 'cloves'),
  (1, 3, NULL, NULL),
  (1, 4, NULL, NULL),

  -- One-Pan Chicken & Onions (2)
  (2, 5, 1.0, 'piece'),
  (2, 1, 1.0, 'unit'),
  (2, 2, 1.0, 'tbsp'),
  (2, 8, 1.0, 'tbsp'),
  (2, 3, NULL, NULL),
  (2, 4, NULL, NULL),

  -- Chicken Pasta Primavera (3)
  (3, 9, 200.0, 'g'),
  (3, 5, 1.0, 'piece'),
  (3, 1, 0.5, 'unit'),
  (3, 6, 2.0, 'cloves'),
  (3, 10, 1.0, 'unit'),
  (3, 2, 1.0, 'tbsp'),
  (3, 3, NULL, NULL),
  (3, 4, NULL, NULL),

  -- Creamy Garlic Chicken Soup (4)
  (4, 5, 1.0, 'piece'),
  (4, 1, 1.0, 'unit'),
  (4, 6, 3.0, 'cloves'),
  (4, 8, 1.0, 'tbsp'),
  (4, 3, NULL, NULL),
  (4, 4, NULL, NULL),

  -- Tomato-Garlic Chicken Stir-Fry (5)
  (5, 5, 1.0, 'piece'),
  (5, 1, 0.5, 'unit'),
  (5, 6, 2.0, 'cloves'),
  (5, 10, 1.0, 'unit'),
  (5, 2, 1.0, 'tbsp'),
  (5, 3, NULL, NULL),
  (5, 4, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ─── FAVORITE RECIPES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorite_recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  image VARCHAR(300),
  ready_in_minutes INTEGER,
  servings INTEGER,
  ingredients TEXT, -- stored as JSON string
  instructions TEXT
);

