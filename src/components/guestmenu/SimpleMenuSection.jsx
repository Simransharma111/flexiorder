import { useEffect, useMemo, useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import { getDishPricing } from "../../utils/pricing";
import SubcategoryChooser from "../menu/SubcategoryChooser";

export default function SimpleMenuSection({
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
    <section className="guest-menu-section guest-simple-menu">
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
                <div className="guest-simple-list">
                  {subCatDishes.map((dish) => {
                    const quantity = getCartQuantity(dish._id);
                    const foodType = String(dish.foodType || "").toLowerCase().replace(/[\s_-]/g, "");
                    const isNonVeg = ["nonveg", "nonvegetarian"].includes(foodType);
                    const knownType = isNonVeg || ["veg", "vegetarian"].includes(foodType);
                    const { basePrice, finalPrice, hasDiscount } = getDishPricing(dish);
                    return (
                      <div className="guest-simple-row" key={dish._id}>
                        <button
                          type="button"
                          disabled={!orderingEnabled}
                          className="guest-simple-row__main"
                          onClick={() => orderingEnabled && addToCart(dish)}
                          aria-label={orderingEnabled ? `Add ${dish.name}` : dish.name}
                        >
                          <span className={`food-mark ${isNonVeg ? "is-nonveg" : knownType ? "is-veg" : "is-unknown"}`} aria-label={isNonVeg ? "Non-vegetarian" : knownType ? "Vegetarian" : "Dietary type not specified"} />
                          <span className="guest-simple-row__name">
                            <strong>{dish.name}</strong>
                            <small>{dish.containsEgg && !isNonVeg ? "Contains egg · " : ""}{dish.spiceLevel ? `${dish.spiceLevel} spice` : dish.prepTime ? `${dish.prepTime} min` : ""}</small>
                          </span>
                          <span className="guest-menu-price">
                            {hasDiscount && <del>₹{basePrice.toFixed(0)}</del>}
                            <b>₹{finalPrice.toFixed(0)}</b>
                          </span>
                          {orderingEnabled && !quantity && <span className="guest-add-label">Add</span>}
                        </button>
                        {orderingEnabled && quantity > 0 && (
                          <div className="guest-qty">
                            <button type="button" aria-label={`Remove one ${dish.name}`} onClick={() => decreaseQuantity(dish._id)}>
                              <FiMinus />
                            </button>
                            <b>{quantity}</b>
                            <button type="button" aria-label={`Add one ${dish.name}`} onClick={() => increaseQuantity(dish._id)}>
                              <FiPlus />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
