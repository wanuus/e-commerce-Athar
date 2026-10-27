import type { FulfillmentStatus, OrderStatus } from "@prisma/client";

/** Allowed order status changes. CANCELLED and RETURNED are final. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return NEXT[status];
}

/** Fulfillment is tracked separately from the order status and derived from it. */
export function fulfillmentFor(status: OrderStatus): FulfillmentStatus {
  switch (status) {
    case "PROCESSING":
    case "PACKED":
      return "PACKING";
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "RETURNED":
      return "RETURNED";
    default:
      return "UNFULFILLED";
  }
}

export const LOW_STOCK_THRESHOLD = 3;
