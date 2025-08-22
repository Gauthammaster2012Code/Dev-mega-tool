import { EventEmitter } from "node:events";
class EventBus extends EventEmitter {
    publish(event) {
        this.emit("event", event);
    }
}
export const eventBus = new EventBus();
//# sourceMappingURL=events.js.map