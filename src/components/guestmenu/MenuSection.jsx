import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DishCard from "./DishCard";
import useDialogFocus from "../../hooks/useDialogFocus";

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
  const [showAll, setShowAll] = useState(false);
  const dialogRef = useRef(null);
  const closeCategories = useCallback(() => setShowAll(false), []);
  useDialogFocus(showAll, dialogRef, closeCategories);

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
      {/* Category Bar */}
      <div className="guest-category-bar">
        {categories.slice(0, 4).map((item) => (
          <button 
            type="button" 
            key={item} 
            className={activeCategory === item ? "is-active" : ""} 
            onClick={() => setActiveCategory(item)}
          >
            {item}
          </button>
        ))}
        {categories.length > 4 && (
          <button type="button" className="guest-category-more" onClick={() => setShowAll(true)}>
            More ›
          </button>
        )}
      </div>

      {/* Subcategory Bar (only show if there are subcategories inside the active category) */}
      {subCategories.length > 1 && (
        <div className="guest-subcategory-bar">
          {subCategories.map((sub) => (
            <button
              type="button"
              key={sub}
              className={activeSubCategory === sub ? "is-active" : ""}
              onClick={() => setActiveSubCategory(sub)}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

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

      {showAll && (
        <div className="ops-sheet-backdrop" onClick={closeCategories}>
          <section 
            ref={dialogRef} 
            tabIndex={-1} 
            className="ops-action-sheet" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Menu categories" 
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Categories</h2>
            <div className="guest-category-picker">
              {categories.map((item) => (
                <button 
                  type="button" 
                  key={item} 
                  className={activeCategory === item ? "is-active" : ""} 
                  onClick={() => { setActiveCategory(item); closeCategories(); }}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="button" className="ops-sheet-cancel" onClick={closeCategories}>
              Close
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
