export declare class Log {
    /**
     * Print to the console for debugging.
     */
    static D(...args: any[]): void;
    /**
     * Print to the console for errors.
     * @param args [any[]]
     */
    static E(...args: any[]): void;
    /**
     * Print to the console for warnings.
     * @param args [any[]]
     */
    static W(...args: any[]): void;
}
