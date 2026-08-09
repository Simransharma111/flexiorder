import { useCallback, useRef, useState } from "react";
import DishCard from "./DishCard";
import useDialogFocus from "../../hooks/useDialogFocus";

export default function MenuSection({ categories, dishes, activeCategory, setActiveCategory, getCartQuantity, addToCart, decreaseQuantity, increaseQuantity, orderingEnabled = true }) {
  const [showAll, setShowAll] = useState(false);
  const dialogRef = useRef(null);
  const closeCategories = useCallback(() => setShowAll(false), []);
  useDialogFocus(showAll, dialogRef, closeCategories);
  const filtered = activeCategory === "All" ? dishes : dishes.filter((dish) => (typeof dish.category === "object" ? dish.category?.name : dish.category) === activeCategory);
  return <section className="guest-menu-section guest-visual-menu">
    <div className="guest-category-bar">
      {categories.slice(0, 4).map((item) => <button type="button" key={item} className={activeCategory === item ? "is-active" : ""} onClick={() => setActiveCategory(item)}>{item}</button>)}
      {categories.length > 4 && <button type="button" className="guest-category-more" onClick={() => setShowAll(true)}>More ›</button>}
    </div>
    <div className="guest-visual-list">{filtered.map((dish) => <DishCard key={dish._id} dish={dish} quantity={getCartQuantity(dish._id)} onAdd={addToCart} onDecrease={decreaseQuantity} onIncrease={increaseQuantity} orderingEnabled={orderingEnabled} />)}{!filtered.length && <p className="ops-empty-row">No dishes available</p>}</div>
    {showAll && <div className="ops-sheet-backdrop" onClick={closeCategories}><section ref={dialogRef} tabIndex={-1} className="ops-action-sheet" role="dialog" aria-modal="true" aria-label="Menu categories" onClick={(event) => event.stopPropagation()}><h2>Categories</h2><div className="guest-category-picker">{categories.map((item) => <button type="button" key={item} className={activeCategory === item ? "is-active" : ""} onClick={() => { setActiveCategory(item); closeCategories(); }}>{item}</button>)}</div><button type="button" className="ops-sheet-cancel" onClick={closeCategories}>Close</button></section></div>}
  </section>;
}
