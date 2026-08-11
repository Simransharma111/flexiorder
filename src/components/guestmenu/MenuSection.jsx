import { useEffect, useMemo, useState } from "react";
import DishCard from "./DishCard";
import SubcategoryChooser from "../menu/SubcategoryChooser";

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
  // Subcategory state
  const [activeSubCategory, setActiveSubCategory] = useState("All");

  // Reset subcategory on category change
  useEffect(() => {
    setActiveSubCategory("All");
  }, [activeCategory]);

  // Filter dishes by main category
  const categoryFiltered = useMemo(() => {
    return activeCategory === "All" 
      ? dishes 
      : dishes.filter((dish) => {
          const cat = typeof dish.category === "object" ? dish.category?.name : dish.category;
          return cat === activeCategory;
        });
  }, [dishes, activeCategory]);

  // Extract unique subcategories from the current category's dishes
  const subCategories = useMemo(() => {
    const set = new Set();
    categoryFiltered.forEach((dish) => {
      const sub = dish.subCategory || dish.subcategory || "";
      if (sub && sub.trim()) {
        set.add(sub.trim());
      }
    });
    return ["All", ...Array.from(set)];
  }, [categoryFiltered]);

  // Filter and group by subcategory
  const groupedDishes = useMemo(() => {
    const groups = {};
    categoryFiltered.forEach((dish) => {
      const sub = (dish.subCategory || dish.subcategory || "").trim();
      const groupName = sub || "";
      
      // If we are filtering for a specific subcategory, skip others
      if (activeSubCategory !== "All" && groupName !== activeSubCategory) {
        return;
      }
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(dish);
    });
    
    return groups;
  }, [categoryFiltered, activeSubCategory]);

  const hasAnyDishes = Object.values(groupedDishes).some(g => g.length > 0);

  return (
    <section className="guest-menu-section guest-visual-menu">
      <div className="guest-category-bar" role="group" aria-label="Categories">
        {categories.map((item) => (
          <button 
            type="button" 
            key={item} 
            className={activeCategory === item ? "is-active" : ""}
            aria-pressed={activeCategory === item}
            onClick={() => {
              setActiveSubCategory("All");
              setActiveCategory(item);
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {/* Right Main Panel: Subcategory pills + Dishes */}
      <div className="guest-menu-main-panel">
        <SubcategoryChooser
          key={activeCategory}
          options={subCategories}
          value={activeSubCategory}
          onChange={setActiveSubCategory}
        />

        {/* List grouped by subcategory */}
        {hasAnyDishes ? (
          Object.entries(groupedDishes).map(([subCatName, subCatDishes]) => {
            if (!subCatDishes.length) return null;
            return (
              <div key={subCatName || "other"} className="guest-subcategory-group">
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
