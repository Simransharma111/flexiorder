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
