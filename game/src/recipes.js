// recipes.js — data for Dapur Kilat: every ingredient and every dish on the menu.
// One clear job: the menu. The game logic in game.js only reads these tables.

export const INGREDIENTS = [
  { id: 'bun',     name: 'Roti',   key: '1', prep: 'none', blurb: 'Siap pakai' },
  { id: 'patty',   name: 'Patty',  key: '2', prep: 'cook', blurb: 'Masak dulu' },
  { id: 'cheese',  name: 'Keju',   key: '3', prep: 'none', blurb: 'Siap pakai' },
  { id: 'lettuce', name: 'Selada', key: '4', prep: 'chop', blurb: 'Potong dulu' },
  { id: 'tomato',  name: 'Tomat',  key: '5', prep: 'chop', blurb: 'Potong dulu' },
  { id: 'egg',     name: 'Telur',  key: '6', prep: 'cook', blurb: 'Masak dulu' },
  { id: 'noodle',  name: 'Mie',    key: '7', prep: 'cook', blurb: 'Masak dulu' },
  { id: 'broth',   name: 'Kuah',   key: '8', prep: 'none', blurb: 'Siap pakai' },
  { id: 'chili',   name: 'Cabai',  key: '9', prep: 'none', blurb: 'Siap pakai' },
  { id: 'rice',    name: 'Nasi',   key: '0', prep: 'none', blurb: 'Siap pakai' },
];

export const RECIPES = [
  { id: 'burger',       name: 'Burger Kilat',  price: 120, level: 1, needs: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'] },
  { id: 'mie',          name: 'Mie Goreng',    price: 110, level: 1, needs: ['noodle', 'egg', 'chili', 'lettuce'] },
  { id: 'sandwich',     name: 'Roti Keju',     price: 90,  level: 1, needs: ['bun', 'cheese', 'tomato', 'lettuce'] },
  { id: 'nasitelur',    name: 'Nasi Telur',    price: 100, level: 2, needs: ['rice', 'egg', 'chili', 'tomato'] },
  { id: 'miekuah',      name: 'Mie Kuah',      price: 130, level: 2, needs: ['noodle', 'broth', 'egg', 'chili'] },
  { id: 'burgerdouble', name: 'Burger Jumbo',  price: 180, level: 3, needs: ['bun', 'patty', 'patty', 'cheese', 'cheese', 'tomato', 'lettuce'] },
];

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id);
}

export function recipeById(id) {
  return RECIPES.find((dish) => dish.id === id);
}

export function recipesForLevel(level) {
  return RECIPES.filter((dish) => dish.level <= level);
}

// True when the plate holds exactly the recipe's ingredients, in any order.
export function plateMatchesRecipe(plate, recipe) {
  if (plate.length !== recipe.needs.length) return false;
  const wanted = [...recipe.needs].sort();
  const have = [...plate].sort();
  return wanted.every((id, i) => id === have[i]);
}

// How many of the recipe's ingredients are already on the plate (for the ticket ticks).
export function plateMatchCount(plate, recipe) {
  const left = [...plate];
  let count = 0;
  for (const id of recipe.needs) {
    const at = left.indexOf(id);
    if (at >= 0) { left.splice(at, 1); count += 1; }
  }
  return count;
}
