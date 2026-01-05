import { UserProfile, RoadmapTask, TargetCV } from '@/types';

const STORAGE_KEYS = {
  USERS: 'pathforge_users',
  CURRENT_USER: 'pathforge_current_user',
  ROADMAP: 'pathforge_roadmap',
  TARGET_CV: 'pathforge_target_cv',
};

// User management
export const saveUser = (user: UserProfile): void => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.email === user.email);
  
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const getUsers = (): UserProfile[] => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

export const getUserByEmail = (email: string): UserProfile | null => {
  const users = getUsers();
  return users.find(u => u.email === email) || null;
};

export const setCurrentUser = (user: UserProfile): void => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
};

export const getCurrentUser = (): UserProfile | null => {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// Roadmap management
export const saveRoadmap = (userId: string, tasks: RoadmapTask[]): void => {
  const roadmaps = getRoadmaps();
  roadmaps[userId] = tasks;
  localStorage.setItem(STORAGE_KEYS.ROADMAP, JSON.stringify(roadmaps));
};

export const getRoadmaps = (): Record<string, RoadmapTask[]> => {
  const data = localStorage.getItem(STORAGE_KEYS.ROADMAP);
  return data ? JSON.parse(data) : {};
};

export const getUserRoadmap = (userId: string): RoadmapTask[] => {
  const roadmaps = getRoadmaps();
  return roadmaps[userId] || [];
};

export const updateTask = (userId: string, taskId: string, updates: Partial<RoadmapTask>): void => {
  const tasks = getUserRoadmap(userId);
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex >= 0) {
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    saveRoadmap(userId, tasks);
  }
};

// Target CV management
export const saveTargetCV = (userId: string, targetCV: TargetCV): void => {
  const cvs = getTargetCVs();
  cvs[userId] = targetCV;
  localStorage.setItem(STORAGE_KEYS.TARGET_CV, JSON.stringify(cvs));
};

export const getTargetCVs = (): Record<string, TargetCV> => {
  const data = localStorage.getItem(STORAGE_KEYS.TARGET_CV);
  return data ? JSON.parse(data) : {};
};

export const getUserTargetCV = (userId: string): TargetCV | null => {
  const cvs = getTargetCVs();
  return cvs[userId] || null;
};

// Generate unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
