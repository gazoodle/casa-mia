/** The part of noVNC (@novnc/novnc, MPL-2.0; it ships no types) that KioskRemote uses. */
declare module "@novnc/novnc" {
  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, urlOrChannel: string | WebSocket, options?: { shared?: boolean });
    scaleViewport: boolean;
    resizeSession: boolean;
    background: string;
    showDotCursor: boolean;
    sendKey(keysym: number, code: string | null, down?: boolean): void;
    disconnect(): void;
  }
}
