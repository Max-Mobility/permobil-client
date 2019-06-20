import { Router } from '@angular/router';
/** A router wrapper, adding extra functions. */
export declare class RouterExtService {
    private router;
    private previousUrl;
    private currentUrl;
    constructor(router: Router);
    getPreviousUrl(): string;
}
