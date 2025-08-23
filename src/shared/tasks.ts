import { nanoid } from "nanoid";
import { eventBus } from "./events.js";

export type TaskState = "pending" | "running" | "completed" | "failed";

export interface TaskInfo {
	id: string;
	type: string;
	state: TaskState;
	createdAt: string;
	updatedAt: string;
	meta?: Record<string, unknown>;
}

const tasks = new Map<string, TaskInfo>();

export function createTask(type: string, meta?: Record<string, unknown>): TaskInfo {
	const t: TaskInfo = { id: nanoid(8), type, state: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), meta };
	tasks.set(t.id, t);
	eventBus.publish({ type: "task-status", payload: t });
	return t;
}

export function setTaskState(id: string, state: TaskState, meta?: Record<string, unknown>): TaskInfo | null {
	const t = tasks.get(id);
	if (!t) return null;
	t.state = state;
	t.updatedAt = new Date().toISOString();
	if (meta) t.meta = { ...(t.meta || {}), ...meta };
	eventBus.publish({ type: "task-status", payload: t });
	return t;
}

export function getTask(id: string): TaskInfo | null { return tasks.get(id) || null; }
export function listTasks(): TaskInfo[] { return Array.from(tasks.values()); }