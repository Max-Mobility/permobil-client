import debounce from 'lodash/debounce';

// Modified version of debounceRight from
// https://github.com/jashkenas/underscore/issues/310 - this version
// of debounce calls the final function with all arguments aggregated
// together according to the combine function (provided)
export function debounceRight(func, wait, opts, combine) {
  let allArgs;

  const wrapper = debounce(() => {
    const args = allArgs;
    allArgs = undefined;
    func(args);
  }, wait, opts);

  return (...args) => {
    allArgs = combine(allArgs, [...args]);
    wrapper();
  };
}
