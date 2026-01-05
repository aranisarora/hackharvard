import { z } from "zod";

// Placeholder schemas for tickets feature
export const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

