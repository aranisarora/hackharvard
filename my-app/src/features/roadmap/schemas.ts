import { z } from "zod";

const ChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  isCompleted: z.boolean().default(false),
});

const MentorSchema = z.object({
  name: z.string(),
  title: z.string(),
  company: z.string(),
  email: z.string().email().default("mentor@example.com"),
  profileImage: z.string().url().default("https://via.placeholder.com/150"),
  description: z.string().default(""),
}).optional();

const TaskSchema = z.object({
  id: z.string().optional(),
  category: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
  deadline: z.string().date().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  isCompleted: z.boolean().default(false),
  mentor: MentorSchema,
}).optional();

const RoadmapSchema = z.object({
  tasks: z.array(TaskSchema),
});

const DashboardUserSchema = z.object({
  email: z.string().default(""),
  targetJob: z.string().optional(),
  targetCompany: z.string().optional(),
});

const CategorySchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  bgColor: z.string().optional(),
  tasks: z.array(z.object({
    title: z.string().optional(),
    completed: z.boolean().default(false),
  })).optional(),
  progress: z.number().min(0).max(100).default(0),
});

const DashboardSchema = z.object({
  user: DashboardUserSchema,
  overallProgress: z.number().min(0).max(100),
  categories: z.array(CategorySchema),
});

export const RoadmapGenerationSchema = z.object({
  initialCV: z.string().optional(),
  targetCV: z.string().optional(),
  roadmap: RoadmapSchema,
  dashboard: DashboardSchema,
});

export type RoadmapGeneration = z.infer<typeof RoadmapGenerationSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Dashboard = z.infer<typeof DashboardSchema>;
export type Roadmap = z.infer<typeof RoadmapSchema>;
