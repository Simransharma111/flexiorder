import { useMemo } from "react";
import DishCard from "./DishCard";
import { groupMenuSections } from "../../utils/menuOrdering";
import SubcategoryChooser from "../menu/SubcategoryChooser";
import { categoryKey, dishCategoryName } from "../../utils/menuCategories";

export default function MenuSection({ 
  categories, 
  dishes, 
  activeCategory, 
  setActiveCategory, 
  getCartQuantity, 
  addToCart, 
  decreaseQuantity, 
  increaseQuantity, 
  orderingEnabled = true 
}) {
  // Filter dishes by main category
  const categoryFiltered = useMemo(() => {
    return activeCategory === "All" 
      ? dishes 
      : dishes.filter((dish) => {
          return categoryKey(dishCategoryName(dish)) === categoryKey(activeCategory);
        });
  }, [dishes, activeCategory]);

  // Keep subcategory headings for organization without adding a second,
  // easily-confused filter control to the customer menu.
  const groupedDishes = useMemo(() => {
    return groupMenuSections(categoryFiltered, categories);
  }, [categoryFiltered, categories]);

  const hasAnyDishes = groupedDishes.length > 0;

  return (
    <section className="guest-menu-section guest-visual-menu">
      <div className="guest-menu-main-panel">
        <SubcategoryChooser
          options={categories}
          value={activeCategory}
          label="Category"
          onChange={setActiveCategory}
        />

        {/* List grouped by subcategory */}
        {hasAnyDishes ? (
          groupedDishes.map(({ key, category, sub: subCatName, dishes: subCatDishes }) => {
            if (!subCatDishes.length) return null;
            return (
              <div key={key} className="guest-subcategory-group">
                {category && <h2 className="guest-category-heading">{category}</h2>}
                {subCatName && <h3 className="guest-subcategory-header">{subCatName}</h3>}
                <div className="guest-visual-list">
                  {subCatDishes.map((dish) => (
                    <DishCard
                      key={dish._id}
                      dish={dish}
                      quantity={getCartQuantity(dish._id)}
                      onAdd={addToCart}
                      onDecrease={decreaseQuantity}
                      onIncrease={increaseQuantity}
                      orderingEnabled={orderingEnabled}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <p className="ops-empty-row">No dishes available</p>
        )}
      </div>
    </section>
  );
}
