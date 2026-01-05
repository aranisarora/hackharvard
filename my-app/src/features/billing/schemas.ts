import { z } from "zod";

// Placeholder schemas for billing feature
export const updateSubscriptionSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

