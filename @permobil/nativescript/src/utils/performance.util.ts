declare const global: any;

export const performance = {
  /**
   * Prints the system time to the terminal. Can be prefixed with a string to help identify the event.
   */
  now: (label?: string) => {
    if (global.android) {
      console.log(
        `${label ? label + ': ' : ''}${java.lang.System.nanoTime() / 1000000}`
      );
    } else if (global.ios) {
      console.log(`${label} ${CACurrentMediaTime()}`);
    }
  }
};
