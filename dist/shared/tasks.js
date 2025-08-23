import { nanoid } from "nanoid";
import { eventBus } from "./events.js";
const tasks = new Map();
export function createTask(type, meta) {
    const t = { id: nanoid(8), type, state: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), meta };
    tasks.set(t.id, t);
    eventBus.publish({ type: "task-status", payload: t });
    return t;
}
export function setTaskState(id, state, meta) {
    const t = tasks.get(id);
    if (!t)
        return null;
    t.state = state;
    t.updatedAt = new Date().toISOString();
    if (meta)
        t.meta = { ...(t.meta || {}), ...meta };
    eventBus.publish({ type: "task-status", payload: t });
    return t;
}
export function getTask(id) { return tasks.get(id) || null; }
export function listTasks() { return Array.from(tasks.values()); }
//# sourceMappingURL=tasks.js.map