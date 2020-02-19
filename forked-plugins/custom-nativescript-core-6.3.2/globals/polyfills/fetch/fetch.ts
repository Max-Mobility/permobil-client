import "../../core";
import { installPolyfills } from "../polyfill-helpers";
import "../xhr";


global.registerModule("fetch", () => require("../../../fetch"));

installPolyfills("fetch", ["fetch", "Headers", "Request", "Response"]);
