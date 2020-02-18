/**
 * @module "http/http-request"
 */ /** */

import { Headers, HttpRequestOptions, HttpResponse } from "../../http";
export const request: (options: HttpRequestOptions) => Promise<HttpResponse>;
export function addHeader(headers: Headers, key: string, value: string): void;
