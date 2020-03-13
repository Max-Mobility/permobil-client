/**
 * Simple function that allows you to `wait` for a set duration in milliseconds before this resolves.
 * Can be useful in scenarios where you cannot use `async/await` - such as class constructors.
 * @param msDuration [number] - The duration to wait in milliseconds.
 */
export const wait = (msDuration: number) => {
  return new Promise(resolve => setTimeout(resolve, msDuration));
};
