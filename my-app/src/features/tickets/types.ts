// Placeholder types for tickets feature
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

