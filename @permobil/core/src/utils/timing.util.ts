export const wait = (msDuration: number) => {
  return new Promise(resolve => setTimeout(resolve, msDuration));
};
