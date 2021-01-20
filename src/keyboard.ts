export class Keyboard {
  constructor(handlers) {
    document.addEventListener("keyup", (ev: KeyboardEvent) => {
      if (ev.code in handlers) {
        handlers[ev.code]();
      }
    });
  }
}
