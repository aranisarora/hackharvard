// Placeholder types for billing feature
export interface Subscription {
  id: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "cancelled" | "past_due";
  currentPeriodEnd: Date;
}

