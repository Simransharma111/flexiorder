import { FiClock, FiMinus, FiPlus } from "react-icons/fi";
import { getDishPricing } from "../../utils/pricing";

export default function DishCard({ dish, quantity, onAdd, onDecrease, onIncrease, orderingEnabled = true }) {
  const { basePrice, finalPrice, hasDiscount } = getDishPricing(dish);
  const foodType = String(dish.foodType || "").toLowerCase().replace(/[\s_-]/g, "");
  const nonVeg = ["nonveg", "nonvegetarian"].includes(foodType);
  const knownType = nonVeg || ["veg", "vegetarian"].includes(foodType);
  return <article className="guest-visual-dish">
    {dish.image ? <img src={dish.image} alt="" /> : <div className="guest-visual-dish__placeholder" aria-hidden="true">{dish.name?.charAt(0)}</div>}
    <div className="guest-visual-dish__content">
      <div className="guest-visual-dish__title"><span className={`food-mark ${nonVeg ? "is-nonveg" : knownType ? "is-veg" : "is-unknown"}`} /><strong>{dish.name}</strong></div>
      {dish.description && <p>{dish.description}</p>}
      <div className="guest-dish-meta">{dish.containsEgg && !nonVeg && <span>Contains egg</span>}{dish.spiceLevel && <span>{dish.spiceLevel} spice</span>}{dish.prepTime && <span><FiClock /> {dish.prepTime} min</span>}</div>
      <div className="guest-visual-dish__foot">
        <span className="guest-menu-price">{hasDiscount && <del>₹{basePrice.toFixed(0)}</del>}<b>₹{finalPrice.toFixed(0)}</b></span>
        {orderingEnabled && (quantity > 0 ? <div className="guest-qty"><button type="button" aria-label={`Remove one ${dish.name}`} onClick={() => onDecrease(dish._id)}><FiMinus /></button><b>{quantity}</b><button type="button" aria-label={`Add one ${dish.name}`} onClick={() => onIncrease(dish._id)}><FiPlus /></button></div> : <button type="button" className="guest-add-button" aria-label={`Add ${dish.name}`} onClick={() => onAdd(dish)}>Add</button>)}
      </div>
    </div>
  </article>;
}
