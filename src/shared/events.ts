import { EventEmitter } from "node:events";

export type ServerEvent =
	| { type: "status-update"; payload: unknown }
	| { type: "test-results"; payload: unknown }
	| { type: "ai-findings"; payload: unknown }
	| { type: "visual-results"; payload: unknown }
	| { type: "fix-applied"; payload: unknown }
	| { type: "task-status"; payload: unknown }
	| { type: "log"; payload: { level: string; message: string; data?: unknown } };

class EventBus extends EventEmitter {
	publish(event: ServerEvent): void {
		this.emit("event", event);
	}
}

export const eventBus = new EventBus();