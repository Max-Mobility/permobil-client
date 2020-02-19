import "../../core";
import { installPolyfills } from "../polyfill-helpers";
import "../xhr";


global.registerModule("text", () => require("../../../text"));

installPolyfills("text", ["TextDecoder", "TextEncoder"]);
