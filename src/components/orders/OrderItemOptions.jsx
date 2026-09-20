import { orderItemDetails } from '../../utils/orderItemDetails';

export default function OrderItemOptions({ item }) {
  const details = orderItemDetails(item);
  if (!details.length) return null;
  return <span className="order-item-options">{details.map((line, index) =>
    <span key={index}>{line}</span>
  )}</span>;
}
