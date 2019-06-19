export class Log {
  /**
   * Print to the console for debugging.
   */
  static D(...args: any[]) {
    console.log('DEBUG: ', ...args);
    console.log('---------------------------------------------------');
  }

  /**
   * Print to the console for errors.
   * @param args [any[]]
   */
  static E(...args: any[]) {
    console.log('ERROR: ', ...args);
    console.log('---------------------------------------------------');
  }

  /**
   * Print to the console for warnings.
   * @param args [any[]]
   */
  static W(...args: any[]) {
    console.log('WARNING: ', ...args);
    console.log('---------------------------------------------------');
  }
}
