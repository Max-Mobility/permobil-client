import { Page } from 'tns-core-modules/ui/page';
/**
 * Sets margins for the safe area on iOS devices with safeAreaInsets
 * @param page [Page] - The page instance.
 */
export declare function setMarginForIosSafeArea(page: Page): void;
export declare function getSafeAreaInsets(): undefined | {
    top: number;
    left: number;
    bottom: number;
    right: number;
};
export declare function isIosSimulator(): any;
