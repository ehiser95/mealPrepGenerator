// Built-in nutrition database — approximate values per 100g, for estimation only.
// Sources: general USDA-style reference values. Always verify against packaging
// or an official database for medical/diet-critical use.
const FOOD_DB = {
  "chicken breast, cooked": { cal: 165, protein: 31, carbs: 0, fat: 3.6 },
  "chicken thigh, cooked": { cal: 209, protein: 26, carbs: 0, fat: 10.9 },
  "ground beef 90/10, cooked": { cal: 217, protein: 26, carbs: 0, fat: 12 },
  "ground turkey, cooked": { cal: 176, protein: 27, carbs: 0, fat: 8 },
  "salmon, cooked": { cal: 206, protein: 22, carbs: 0, fat: 13 },
  "tilapia, cooked": { cal: 128, protein: 26, carbs: 0, fat: 2.7 },
  "shrimp, cooked": { cal: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  "egg, whole": { cal: 155, protein: 13, carbs: 1.1, fat: 11 },
  "egg white": { cal: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  "tofu, firm": { cal: 144, protein: 17, carbs: 3, fat: 8 },
  "black beans, cooked": { cal: 132, protein: 8.9, carbs: 23.7, fat: 0.5 },
  "chickpeas, cooked": { cal: 164, protein: 8.9, carbs: 27.4, fat: 2.6 },
  "lentils, cooked": { cal: 116, protein: 9, carbs: 20, fat: 0.4 },
  "white rice, cooked": { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  "brown rice, cooked": { cal: 123, protein: 2.7, carbs: 25.6, fat: 1 },
  "quinoa, cooked": { cal: 120, protein: 4.4, carbs: 21.3, fat: 1.9 },
  "sweet potato, baked": { cal: 90, protein: 2, carbs: 20.7, fat: 0.2 },
  "potato, baked": { cal: 93, protein: 2.5, carbs: 21.2, fat: 0.1 },
  "oats, dry": { cal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  "whole wheat bread": { cal: 247, protein: 13, carbs: 41, fat: 3.4 },
  "broccoli, cooked": { cal: 35, protein: 2.4, carbs: 7.2, fat: 0.4 },
  "spinach, raw": { cal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  "kale, raw": { cal: 49, protein: 4.3, carbs: 8.8, fat: 0.9 },
  "bell pepper": { cal: 31, protein: 1, carbs: 6, fat: 0.3 },
  "onion": { cal: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  "garlic": { cal: 149, protein: 6.4, carbs: 33, fat: 0.5 },
  "tomato": { cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  "cucumber": { cal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  "carrot": { cal: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
  "zucchini": { cal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  "mushroom": { cal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  "avocado": { cal: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  "olive oil": { cal: 884, protein: 0, carbs: 0, fat: 100 },
  "butter": { cal: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  "peanut butter": { cal: 588, protein: 25, carbs: 20, fat: 50 },
  "almonds": { cal: 579, protein: 21, carbs: 22, fat: 50 },
  "walnuts": { cal: 654, protein: 15, carbs: 14, fat: 65 },
  "chia seeds": { cal: 486, protein: 17, carbs: 42, fat: 31 },
  "greek yogurt, plain nonfat": { cal: 59, protein: 10.2, carbs: 3.6, fat: 0.4 },
  "cottage cheese, low fat": { cal: 72, protein: 12, carbs: 3, fat: 1 },
  "milk, 2%": { cal: 50, protein: 3.4, carbs: 4.9, fat: 2 },
  "almond milk, unsweetened": { cal: 15, protein: 0.6, carbs: 0.6, fat: 1.2 },
  "cheddar cheese": { cal: 403, protein: 25, carbs: 1.3, fat: 33 },
  "mozzarella, part skim": { cal: 254, protein: 24, carbs: 2.8, fat: 16 },
  "banana": { cal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  "apple": { cal: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  "blueberries": { cal: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
  "strawberries": { cal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  "orange": { cal: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
  "honey": { cal: 304, protein: 0.3, carbs: 82.4, fat: 0 },
  "maple syrup": { cal: 260, protein: 0, carbs: 67, fat: 0.2 },
  "pasta, cooked": { cal: 131, protein: 5, carbs: 25, fat: 1.1 },
  "whole wheat pasta, cooked": { cal: 124, protein: 5.3, carbs: 25, fat: 1.1 },
  "corn tortilla": { cal: 218, protein: 5.7, carbs: 44.6, fat: 2.9 },
  "flour tortilla": { cal: 310, protein: 8, carbs: 49, fat: 7.6 },
  "hummus": { cal: 166, protein: 7.9, carbs: 14.3, fat: 9.6 },
  "feta cheese": { cal: 264, protein: 14.2, carbs: 4.1, fat: 21.3 },
  "edamame": { cal: 121, protein: 11, carbs: 10, fat: 5 },
};

// Curated starter suggestions. These are estimates inspired by common
// meal-prep style dishes, not scraped from any specific article — verify
// against the linked (root-domain only) trusted site before relying on them.
// YouTube links use YouTube's real search endpoint with a suggested query,
// since we can't safely guess a specific working video URL.
const RECOMMENDED_MEALS = [
  {
    id: "rec-1",
    name: "High-Protein Turkey Chili",
    mealType: "Dinner",
    sourceLabel: "Skinnytaste",
    sourceUrl: "https://www.skinnytaste.com",
    youtubeQuery: "high protein turkey chili meal prep",
    perServing: { cal: 380, protein: 35, carbs: 30, fat: 12 },
    prepTimeMin: 10,
    cookTimeMin: 30,
    steps: [
      "Brown the ground turkey with diced onion and garlic.",
      "Stir in beans, diced tomatoes, and chili seasoning; simmer 20-25 minutes.",
      "Cool slightly, then portion into containers.",
    ],
  },
  {
    id: "rec-2",
    name: "Greek Chicken & Quinoa Bowl",
    mealType: "Lunch",
    sourceLabel: "The Clean Eating Couple",
    sourceUrl: "https://www.thecleaneatingcouple.com",
    youtubeQuery: "greek chicken quinoa meal prep bowl",
    perServing: { cal: 450, protein: 38, carbs: 42, fat: 14 },
    prepTimeMin: 15,
    cookTimeMin: 20,
    steps: [
      "Cook quinoa according to package directions.",
      "Season and grill or pan-sear the chicken; slice.",
      "Assemble bowls with quinoa, chicken, and vegetables; portion into containers.",
    ],
  },
  {
    id: "rec-3",
    name: "Overnight Oats with Berries",
    mealType: "Breakfast",
    sourceLabel: "Eating Bird Food",
    sourceUrl: "https://www.eatingbirdfood.com",
    youtubeQuery: "high protein overnight oats meal prep",
    perServing: { cal: 320, protein: 18, carbs: 45, fat: 8 },
    prepTimeMin: 10,
    cookTimeMin: 0,
    steps: [
      "Combine oats, milk, and yogurt in a jar.",
      "Stir in berries and a sweetener of choice.",
      "Refrigerate overnight; portion into containers.",
    ],
  },
  {
    id: "rec-4",
    name: "Sheet Pan Salmon & Veggies",
    mealType: "Dinner",
    sourceLabel: "Budget Bytes",
    sourceUrl: "https://www.budgetbytes.com",
    youtubeQuery: "sheet pan salmon meal prep",
    perServing: { cal: 420, protein: 34, carbs: 25, fat: 20 },
    prepTimeMin: 10,
    cookTimeMin: 20,
    steps: [
      "Preheat the oven and arrange salmon and chopped vegetables on a sheet pan.",
      "Season with oil, salt, and pepper.",
      "Roast until the salmon flakes easily; portion into containers.",
    ],
  },
  {
    id: "rec-5",
    name: "Black Bean & Sweet Potato Bowl",
    mealType: "Lunch",
    sourceLabel: "Minimalist Baker",
    sourceUrl: "https://minimalistbaker.com",
    youtubeQuery: "black bean sweet potato meal prep bowl",
    perServing: { cal: 400, protein: 15, carbs: 65, fat: 10 },
    prepTimeMin: 15,
    cookTimeMin: 25,
    steps: [
      "Roast cubed sweet potato until tender.",
      "Warm black beans with cumin and lime.",
      "Combine with a grain of choice; portion into containers.",
    ],
  },
  {
    id: "rec-6",
    name: "Egg White & Veggie Muffins",
    mealType: "Breakfast",
    sourceLabel: "iFOODreal",
    sourceUrl: "https://ifoodreal.com",
    youtubeQuery: "egg white veggie muffins meal prep",
    perServing: { cal: 180, protein: 20, carbs: 8, fat: 7 },
    prepTimeMin: 10,
    cookTimeMin: 20,
    steps: [
      "Whisk egg whites with chopped vegetables.",
      "Pour into a greased muffin tin.",
      "Bake until set; portion into containers.",
    ],
  },
  {
    id: "rec-7",
    name: "Ground Turkey Burrito Bowl",
    mealType: "Dinner",
    sourceLabel: "The Recipe Critic",
    sourceUrl: "https://therecipecritic.com",
    youtubeQuery: "ground turkey burrito bowl meal prep",
    perServing: { cal: 480, protein: 36, carbs: 48, fat: 15 },
    prepTimeMin: 10,
    cookTimeMin: 20,
    steps: [
      "Brown the ground turkey with taco seasoning.",
      "Cook rice and warm black beans.",
      "Assemble bowls with turkey, rice, beans, and toppings; portion into containers.",
    ],
  },
  {
    id: "rec-8",
    name: "Greek Yogurt Protein Parfait",
    mealType: "Snack",
    sourceLabel: "Gimme Delicious",
    sourceUrl: "https://gimmedelicious.com",
    youtubeQuery: "greek yogurt protein parfait meal prep",
    perServing: { cal: 220, protein: 20, carbs: 24, fat: 5 },
    prepTimeMin: 10,
    cookTimeMin: 0,
    steps: [
      "Layer Greek yogurt with granola and berries.",
      "Repeat layers as desired.",
      "Portion into containers and refrigerate.",
    ],
  },
  {
    id: "rec-9",
    name: "Shrimp & Broccoli Stir Fry",
    mealType: "Dinner",
    sourceLabel: "Damn Delicious",
    sourceUrl: "https://damndelicious.net",
    youtubeQuery: "shrimp broccoli stir fry meal prep",
    perServing: { cal: 350, protein: 30, carbs: 28, fat: 12 },
    prepTimeMin: 10,
    cookTimeMin: 15,
    steps: [
      "Saute shrimp until pink; set aside.",
      "Stir-fry broccoli and garlic until crisp-tender.",
      "Combine with sauce and shrimp; portion into containers.",
    ],
  },
  {
    id: "rec-10",
    name: "Almond Butter Energy Bites",
    mealType: "Snack",
    sourceLabel: "Cookie and Kate",
    sourceUrl: "https://cookieandkate.com",
    youtubeQuery: "almond butter energy bites no bake",
    perServing: { cal: 150, protein: 5, carbs: 16, fat: 8 },
    prepTimeMin: 15,
    cookTimeMin: 0,
    steps: [
      "Mix almond butter, oats, and honey.",
      "Roll into balls.",
      "Refrigerate and portion into containers.",
    ],
  },
];

const ACTIVITY_LEVELS = {
  sedentary: { label: "Sedentary (little/no exercise)", mult: 1.2 },
  light: { label: "Lightly active (1-3 days/wk)", mult: 1.375 },
  moderate: { label: "Moderately active (3-5 days/wk)", mult: 1.55 },
  active: { label: "Very active (6-7 days/wk)", mult: 1.725 },
  athlete: { label: "Athlete (2x/day training)", mult: 1.9 },
};

const RECIPE_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"];

const UNIT_TO_GRAMS = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 };

// Diet filters for the Meal Prep Planner. Thresholds are deliberately
// simplified (this app can't model diet phases or exact clinical protocols)
// but are grounded in how each diet is commonly and consistently described:
//  - Keto: ~70-75% of calories from fat, 20-25% protein, 5-10% carbs.
//  - Atkins: low-carb/higher-protein; historically phased (induction ~20g
//    net carbs/day up to a higher maintenance intake), which a per-recipe
//    filter can't represent, so this approximates the general approach.
//  - Low carb: a commonly used clinical threshold is roughly <=26% of
//    calories from carbohydrate.
//  - Volumetrics ("high volume, low calorie"): ranks/filters by energy
//    density (calories per gram) rather than a macro ratio, per Dr. Barbara
//    Rolls' Volumetrics research — low-density foods (produce, lean protein,
//    broth-based dishes) are roughly under ~1.5-2 kcal/g, vs. energy-dense
//    foods (oils, nuts, fried food) well above that.
//  - Carnivore: animal products only (meat, poultry, fish, eggs, dairy) with
//    no plant foods; checked ingredient-by-ingredient against the food
//    database below, so it only works for known ingredients.
const DIETS = {
  any: {
    label: "No specific diet",
    description: "No dietary restrictions — matches any recipe.",
  },
  keto: {
    label: "Keto (ketogenic)",
    description: "Very low carb, high fat: roughly 70-75% of calories from fat, 20-25% from protein, and 5-10% from carbs.",
    kind: "macroRatio",
    maxCarbPct: 10,
    minFatPct: 65,
  },
  atkins: {
    label: "Atkins-style (low carb)",
    description: "Low-carb, higher-protein eating in the style of the Atkins diet. This approximates the general approach — not the specific induction/maintenance phase targets — by keeping carbs low.",
    kind: "macroRatio",
    maxCarbPct: 15,
  },
  lowcarb: {
    label: "Low carb",
    description: "General low-carb eating: no more than about 26% of calories from carbohydrate, a commonly used low-carb threshold.",
    kind: "macroRatio",
    maxCarbPct: 26,
  },
  volumetrics: {
    label: "High volume, low calorie",
    description: "Favors lower energy-density recipes (more food weight per calorie, like vegetables, lean protein, and broth-based dishes) so portions feel larger for the same calories. Estimated as calories per gram across the whole recipe, so it only works for recipes with a real ingredient list (not the Recommended tab's placeholder entries).",
    kind: "density",
    maxKcalPerGram: 1.6,
  },
  carnivore: {
    label: "Carnivore",
    description: "Animal products only — meat, poultry, fish, eggs, and dairy — with no vegetables, fruit, grains, or legumes. Checked ingredient-by-ingredient against the built-in food database, so it only works for recipes built from known ingredients (not custom or placeholder ones).",
    kind: "ingredient",
  },
};

// Which FOOD_DB entries count as animal-derived, for the Carnivore diet filter.
const ANIMAL_FOOD_KEYS = new Set([
  "chicken breast, cooked",
  "chicken thigh, cooked",
  "ground beef 90/10, cooked",
  "ground turkey, cooked",
  "salmon, cooked",
  "tilapia, cooked",
  "shrimp, cooked",
  "egg, whole",
  "egg white",
  "greek yogurt, plain nonfat",
  "cottage cheese, low fat",
  "milk, 2%",
  "cheddar cheese",
  "mozzarella, part skim",
  "feta cheese",
  "butter",
]);

// Ingredients that are widely available pre-chopped or frozen at the
// grocery store, used to surface time-saving tips for a given recipe.
const FREEZABLE_OR_PRECUT_INGREDIENTS = new Set([
  "broccoli, cooked",
  "spinach, raw",
  "kale, raw",
  "bell pepper",
  "onion",
  "carrot",
  "zucchini",
  "mushroom",
  "edamame",
  "blueberries",
  "strawberries",
  "banana",
  "shrimp, cooked",
]);

const GENERIC_MEAL_PREP_TIPS = [
  "Cook proteins in one big batch, then portion once they've cooled — reheats better than cooking a whole tray fresh each day.",
  "Let food cool to room temperature before sealing containers; sealing while hot traps steam and makes everything soggy.",
  "Cook grains and starches slightly under, since they keep softening a bit as they reheat.",
  "Store sauces or dressings separately and add them at serving time so greens or grains don't get soggy in the fridge.",
  "Label containers with the date — most meal-prepped dishes keep 3-4 days refrigerated, or 2-3 months frozen.",
];
