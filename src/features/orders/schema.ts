import { z } from "zod";
import { GOVERNORATE_KEYS } from "@/lib/config/egypt";
import { egyptPhoneSchema } from "@/lib/validation/phone";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: egyptPhoneSchema,
  governorate: z.enum(GOVERNORATE_KEYS),
  city: z.string().trim().min(1).max(80),
  district: optionalText(80),
  street: z.string().trim().min(3).max(200),
  building: optionalText(40),
  apartment: optionalText(40),
  floor: optionalText(40),
  landmark: optionalText(120),
  postalCode: optionalText(20),
  instructions: optionalText(300),
  customerNote: optionalText(500),
  paymentMethod: z.enum(["COD", "CARD"]),
  expectedTotal: z.coerce.number().int().nonnegative(),
  idempotencyKey: z.string().min(10).max(100),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
