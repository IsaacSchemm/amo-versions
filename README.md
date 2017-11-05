xpi-versions
============

This is a website that lists current and past versions of extensions hosted at
https://addons.mozilla.org, and also shows additional information (extracted
from the extension itself) to help determine when an extension might work in a
non-Firefox browser (SeaMonkey, Pale Moon, Basilisk). For example, you could
use this site to find the last SeaMonkey-compatible version of an add-on which
has changed to use WebExtensions.

Usage:

    index.html?id={addon-slug}

Screenshot: https://i.imgur.com/rB0TiOi.png

For each version of an extension, one or more of the following tags will be
shown:

* **Restart Required** - A classic XUL overlay extension.
* **Restartless** - A bootstrapped extension.
* **Jetpack** - Uses the deprecated Add-on SDK.
* **WebExtensions** - The new Firefox add-on API. Some versions of add-ons made
  before Firefox 57 use both WebExtensions and one of the types listed above.

Strict compatiblity checking will be honored for add-ons that use it (e.g. Lightning).

Supported browsers
------------------

* **SeaMonkey**
  * The install button will only be shown if an add-on is compatible with your
    version of SeaMonkey (and does not use WebExtensions.)
  * For add-ons that weren't built for SeaMonkey but don't use WebExtensions,
    another button will be shown that links to the Add-on Converter.
* **Pale Moon**
  * Add-ons with Pale Moon compatiblity will be checked against the current
    version of Pale Moon.
  * For add-ons that weren't built for Pale Moon, the install button will only
    be shown if the add-on is Firefox-compatible and does not use Jetpack or
    WebExtensions.
* **Firefox** (Desktop / Android)
  * The install button will only be shown if an add-on is compatible with your
    version of Firefox.
* **Other browsers**
  * The install button will always be shown, although it may not work.

API
---

To extract information that addons.mozilla.org doesn't keep track of,
xpi-versions makes a call to an Azure Function, which downloads the .xpi file
from Mozilla and returns the relevant information. This info is cached in
memory for a while on the server. See XpiVersionsApi for more details.
