import { threadId, MessagePort, TransferListItem } from "worker_threads";
import { v4 } from "uuid";

enum MessageType {
  RECV = "recv",
  SEND = "send",
  EMIT = "emit",
}

class Error extends global.Error {
  constructor({
    message,
    name,
    stack,
  }: {
    message: string;
    name: string;
    stack: string;
  }) {
    super();
    this.name = name;
    this.message = message;
    this.stack = stack;
  }
}

/**
 * This class should be used to wrap the ports of an MessageChannel instance between two workers
 */
export default class PortHelper {
  constructor(private port: MessagePort) {
    this.port.once("close", function on_close(this: MessagePort) {
      this.removeAllListeners("message");
    });
  }

  /**
   * This function binds the port to a class and call its functions by event name with the message as params
   * @param obj Any class with functions
   * @param events A whitelist of events to passthru, all if empty
   * @returns A function to remove the listener
   */
  passthru<T>(obj: T, events: (keyof T)[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    function passthru_listener(message: {
      index: string;
      threadId: number;
      type: MessageType;
      event: keyof T;
      content: any;
    }): () => void {
      if (
        message.threadId === threadId ||
        message.type !== MessageType.SEND ||
        (events.length > 0 && events.indexOf(message.event) === -1)
      )
        return;

      try {
        if (!obj[message.event])
          throw new global.Error(
            "Unimplemented passthru event " + message.event,
          );

        const resp = obj[message.event as any](message.content);
        if (resp instanceof Promise)
          resp
            .then((nmessage: any) => {
              self.port.postMessage(
                {
                  index: message.index,
                  threadId,
                  type: MessageType.RECV,
                  event: message.event,
                  content: nmessage === undefined ? null : nmessage,
                },
                nmessage?._transferList || [],
              );
            })
            .catch((err: Error) =>
              self.port.postMessage({
                index: message.index,
                threadId,
                type: MessageType.RECV,
                event: message.event,
                error: {
                  message: err.message,
                  name: err.name,
                  stack: err.stack,
                },
              }),
            );
        else
          self.port.postMessage(
            {
              index: message.index,
              threadId,
              type: MessageType.RECV,
              event: message.event,
              content: resp === undefined ? null : resp,
            },
            resp?._transferList || [],
          );
      } catch (err) {
        self.port.postMessage({
          index: message.index,
          threadId,
          type: MessageType.RECV,
          event: message.event,
          error: {
            message: err.message,
            name: err.name,
            stack: err.stack,
          },
        });
      }
    }

    self.port.on("message", passthru_listener);
    return () => {
      this.port.removeListener("message", passthru_listener);
    };
  }

  send<T>(
    event: string,
    message?: any,
    transferList?: TransferListItem[],
  ): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return new Promise((resolve, reject) => {
      const index = v4();
      function send_listener(message: {
        index: string;
        threadId: number;
        type: MessageType;
        event: string;
        content: any;
        error?: {
          message: string;
          name: string;
          stack: string;
        };
      }) {
        if (
          message.index !== index ||
          message.threadId === threadId ||
          message.type !== MessageType.RECV ||
          message.event !== event
        )
          return;
        self.port.off("message", send_listener);
        self.port.off("close", send_close);

        if (message.error) reject(new Error(message.error));
        else resolve(message.content === undefined ? null : message.content);
      }
      function send_close() {
        self.port.off("message", send_listener);
        self.port.off("close", send_close);
        reject(new global.Error("close"));
      }
      self.port.on("message", send_listener);
      self.port.on("close", send_close);

      self.port.postMessage(
        {
          index,
          threadId,
          type: MessageType.SEND,
          event,
          content: message === undefined ? null : message,
        },
        transferList,
      );
    });
  }

  recv<T>(
    event: string,
    listener: (message?: T) => Promise<any | void> | any,
  ): () => void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    function recv_listener(message: {
      index: string;
      threadId: number;
      type: MessageType;
      event: string;
      content: T;
    }) {
      if (
        message.threadId === threadId ||
        message.type !== MessageType.SEND ||
        message.event !== event
      )
        return;

      try {
        const resp = listener(message.content);
        if (resp instanceof Promise)
          resp
            .then((nmessage: any) => {
              self.port.postMessage(
                {
                  index: message.index,
                  threadId,
                  type: MessageType.RECV,
                  event: message.event,
                  content: nmessage === undefined ? null : nmessage,
                },
                nmessage?._transferList || [],
              );
            })
            .catch((err: Error) =>
              self.port.postMessage({
                index: message.index,
                threadId,
                type: MessageType.RECV,
                event: message.event,
                error: {
                  message: err.message,
                  name: err.name,
                  stack: err.stack,
                },
              }),
            );
        else
          self.port.postMessage(
            {
              index: message.index,
              threadId,
              type: MessageType.RECV,
              event: message.event,
              content: resp === undefined ? null : resp,
            },
            resp?._transferList || [],
          );
      } catch (err) {
        self.port.postMessage({
          index: message.index,
          threadId,
          type: MessageType.RECV,
          event: message.event,
          error: {
            message: err.message,
            name: err.name,
            stack: err.stack,
          },
        });
      }
    }

    self.port.on("message", recv_listener);
    return () => {
      self.port.off("message", recv_listener);
    };
  }

  emit(event: string, message?: any, transferList?: TransferListItem[]): void {
    this.port.postMessage(
      {
        threadId,
        type: MessageType.EMIT,
        event,
        content: message === undefined ? null : message,
      },
      transferList,
    );
  }

  wait<T>(event: string): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return new Promise((resolve, reject) => {
      function wait_listener(message: {
        threadId: number;
        type: MessageType;
        event: string;
        content: T;
      }) {
        if (
          message.threadId === threadId ||
          message.type !== MessageType.EMIT ||
          message.event !== event
        )
          return;
        self.port.off("message", wait_listener);
        self.port.off("close", wait_close);
        resolve(message.content || null);
      }
      function wait_close() {
        self.port.off("message", wait_listener);
        self.port.off("close", wait_close);
        reject(new global.Error("close"));
      }
      self.port.on("message", wait_listener);
      self.port.on("close", wait_close);
    });
  }

  close() {
    this.port.removeAllListeners("message");
    this.port.close();
  }

  waitClose(): Promise<void> {
    return new Promise((resolve) => this.port.once("close", () => resolve()));
  }
}
