import { useMemo, useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import { getDishPricing } from "../../utils/pricing";
import SubcategoryChooser from "../menu/SubcategoryChooser";
import { categoryKey, dishCategoryName } from "../../utils/menuCategories";

export default function SimpleMenuSection({
  categories,
  dishes,
  activeCategory,
  setActiveCategory,
  getCartQuantity,
  addToCart,
  decreaseQuantity,
  orderingEnabled = true
}) {
  const [revealedDishId, setRevealedDishId] = useState(null);

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
    const groups = {};
    categoryFiltered.forEach((dish) => {
      const sub = (dish.subCategory || dish.subcategory || "").trim();
      const groupName = sub || "";
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(dish);
    });
    
    return groups;
  }, [categoryFiltered]);

  const hasAnyDishes = Object.values(groupedDishes).some(g => g.length > 0);

  return (
    <section className="guest-menu-section guest-simple-menu">
      <div className="guest-menu-main-panel">
        <SubcategoryChooser
          options={categories}
          value={activeCategory}
          label="Category"
          onChange={setActiveCategory}
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
                    const RowMain = orderingEnabled ? "button" : "div";
                    return (
                      <div className="guest-simple-row" key={dish._id}>
                        <RowMain
                          {...(orderingEnabled ? {
                            type: "button",
                            onClick: () => { setRevealedDishId(dish._id); addToCart(dish); },
                            "aria-label": `Add ${dish.name}`,
                          } : {})}
                          className="guest-simple-row__main"
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
                        </RowMain>
                        {orderingEnabled && (quantity > 0 || revealedDishId === dish._id) && (
                          <div className="guest-qty guest-qty--large">
                            <button type="button" aria-label={`Remove one ${dish.name}`} onClick={() => { if (quantity <= 1) setRevealedDishId(null); decreaseQuantity(dish._id); }}>
                              <FiMinus />
                            </button>
                            <b>{quantity}</b>
                            <button type="button" aria-label={`Add one ${dish.name}`} onClick={() => { setRevealedDishId(dish._id); addToCart(dish); }}>
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
