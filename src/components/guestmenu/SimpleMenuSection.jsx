import { useCallback, useRef, useState } from "react";
import { FiMinus, FiPlus, FiX } from "react-icons/fi";
import { getDishPricing } from "../../utils/pricing";
import useDialogFocus from "../../hooks/useDialogFocus";

function CategoryPicker({ categories, activeCategory, setActiveCategory }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const closePicker = useCallback(() => setOpen(false), []);
  useDialogFocus(open, dialogRef, closePicker);
  const visible = categories.slice(0, 4);
  return <>
    <div className="guest-category-bar">
      {visible.map((item) => <button type="button" key={item} className={activeCategory === item ? "is-active" : ""} onClick={() => setActiveCategory(item)}>{item}</button>)}
      {categories.length > 4 && <button type="button" className="guest-category-more" onClick={() => setOpen(true)}>More ›</button>}
    </div>
    {open && <div className="ops-sheet-backdrop" onClick={closePicker}>
      <section ref={dialogRef} tabIndex={-1} className="ops-action-sheet" role="dialog" aria-modal="true" aria-label="Menu categories" onClick={(event) => event.stopPropagation()}>
        <div className="guest-category-picker__head"><h2>Categories</h2><button type="button" className="ops-icon-button" aria-label="Close categories" onClick={closePicker}><FiX /></button></div>
        <div className="guest-category-picker">{categories.map((item) => <button type="button" key={item} className={activeCategory === item ? "is-active" : ""} onClick={() => { setActiveCategory(item); closePicker(); }}>{item}</button>)}</div>
      </section>
    </div>}
  </>;
}

export default function SimpleMenuSection({ categories, dishes, activeCategory, setActiveCategory, getCartQuantity, addToCart, decreaseQuantity, increaseQuantity, orderingEnabled = true }) {
  const filtered = activeCategory === "All" ? dishes : dishes.filter((dish) => (typeof dish.category === "object" ? dish.category?.name : dish.category) === activeCategory);
  return (
    <section className="guest-menu-section guest-simple-menu">
      <CategoryPicker categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
      <div className="guest-simple-list">
        {filtered.map((dish) => {
          const quantity = getCartQuantity(dish._id);
          const foodType = String(dish.foodType || "").toLowerCase().replace(/[\s_-]/g, "");
          const isNonVeg = ["nonveg", "nonvegetarian"].includes(foodType);
          const knownType = isNonVeg || ["veg", "vegetarian"].includes(foodType);
          const { basePrice, finalPrice, hasDiscount } = getDishPricing(dish);
          return <div className="guest-simple-row" key={dish._id}>
            <button type="button" disabled={!orderingEnabled} className="guest-simple-row__main" onClick={() => orderingEnabled && addToCart(dish)} aria-label={orderingEnabled ? `Add ${dish.name}` : dish.name}>
              <span className={`food-mark ${isNonVeg ? "is-nonveg" : knownType ? "is-veg" : "is-unknown"}`} aria-label={isNonVeg ? "Non-vegetarian" : knownType ? "Vegetarian" : "Dietary type not specified"} />
              <span className="guest-simple-row__name"><strong>{dish.name}</strong><small>{dish.containsEgg && !isNonVeg ? "Contains egg · " : ""}{dish.spiceLevel ? `${dish.spiceLevel} spice` : dish.prepTime ? `${dish.prepTime} min` : ""}</small></span>
              <span className="guest-menu-price">{hasDiscount && <del>₹{basePrice.toFixed(0)}</del>}<b>₹{finalPrice.toFixed(0)}</b></span>
              {orderingEnabled && !quantity && <span className="guest-add-label">Add</span>}
            </button>
            {orderingEnabled && quantity > 0 && <div className="guest-qty"><button type="button" aria-label={`Remove one ${dish.name}`} onClick={() => decreaseQuantity(dish._id)}><FiMinus /></button><b>{quantity}</b><button type="button" aria-label={`Add one ${dish.name}`} onClick={() => increaseQuantity(dish._id)}><FiPlus /></button></div>}
          </div>;
        })}
        {!filtered.length && <p className="ops-empty-row">No dishes available</p>}
      </div>
    </section>
  );
}
