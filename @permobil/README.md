# @permobil/core

Purpose: Anything inside of the `permobil/core` package should be plain javascript with no dependencies on frameworks or third party libraries.

This allows us to use it in any application/project regardless of framework.

# @permobil/nativescript

Purpose: Anything in the `@permobil/nativescript` package should ONLY ever have ONE dependency if necessary and that is on the `tns-core-modules` of the nativescript framework. So these are NativeScript app specific utilities, classes, enums, services, etc.

# @permobil/angular

Purpose: Anything that is specific to `Angular` can be put in here.