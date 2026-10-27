import { z } from "zod";

/**
 * Egyptian mobile numbers: 010, 011, 012, 015 + 8 digits.
 * Accepts 01xxxxxxxxx, +201xxxxxxxxx, 00201xxxxxxxxx, 201xxxxxxxxx.
 * Returns E.164 (+201xxxxxxxxx) or null.
 */
export function normalizeEgyptPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const m = /^(?:\+?20|0020|0)?(1[0125]\d{8})$/.exec(digits);
  return m ? `+20${m[1]}` : null;
}

export const egyptPhoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeEgyptPhone(v);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_phone" });
      return z.NEVER;
    }
    return n;
  });
