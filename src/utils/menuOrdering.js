export const sortDishesForDisplay = (dishes = []) => dishes
  .map((dish, index) => ({ dish, index }))
  .sort((left, right) => {
    const leftOrder = Number(left.dish?.displayOrder);
    const rightOrder = Number(right.dish?.displayOrder);
    const leftPriority = Number.isFinite(leftOrder) && leftOrder > 0
      ? leftOrder
      : Number.POSITIVE_INFINITY;
    const rightPriority = Number.isFinite(rightOrder) && rightOrder > 0
      ? rightOrder
      : Number.POSITIVE_INFINITY;
    return leftPriority - rightPriority || left.index - right.index;
  })
  .map(({ dish }) => dish);
import { categoryKey, dishCategoryName } from './menuCategories';

export const groupMenuSections = (dishes = [], categories = []) => {
  const groups = new Map();
  for (const dish of sortDishesForDisplay(dishes)) {
    const name = dishCategoryName(dish) || 'Uncategorized';
    const key = categoryKey(name);
    if (!groups.has(key)) groups.set(key, { name, subgroups: new Map() });
    const sub = String(dish.subCategory || dish.subcategory || '').trim();
    const group = groups.get(key);
    if (!group.subgroups.has(sub)) group.subgroups.set(sub, []);
    group.subgroups.get(sub).push(dish);
  }
  const order = categories.map(categoryKey);
  return [...groups.values()].sort((a, b) => {
    const rank = (name) => { const i = order.indexOf(categoryKey(name)); return i < 0 ? Infinity : i; };
    return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
  }).flatMap(group => [...group.subgroups].map(([sub, items], index) => ({
    key: JSON.stringify([categoryKey(group.name), sub]),
    category: index === 0 ? group.name : '', sub, dishes: items,
  })));
};
