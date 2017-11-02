ExtendedVersionInfoApi
======================

This is an Azure Functions project, written in C#.

Keep in mind that this API has to download .xpi files from Mozilla in order to
extract information from them (although the responses are cached in memory for
a short period of time.) If you can cache these responses indefinitely on your
server, you probably should.

**Error conditions**

* Any error conditions from addons.mozilla.org (e.g. 404) will be passed through.

**See also**

* http://addons-server.readthedocs.io/en/latest/topics/api/addons.html

Usage
-----

    GET /addon/{addon_id}/versions/{version_id}/files/{file_id}

**Parameters**

* addon_id: The add-on ID (int), slug (string), or extension identifier
  (string, usually in the format of an email address or GUID).
* version_id: The version ID (int).
* file_id: The file ID (int).

**Response**

* file_id: int
* bootstrapped: boolean
  * Detected from install.rdf.
  * Bootstrapped (restartless) add-ons can be installed and removed without
    restarting the browser.
* jetpack: boolean
  * Detected based on the presence of harness-options.json or package.json.
  * These add-ons use the deprecated Firefox Add-on SDK.
* has_webextension: boolean
  * Embedded WebExtensions are detected from the install.rdf.
  * For standalone WebExtensions (modern Firefox add-ons), this API will set
    this field to true and the others to false.
* is_strict_compatibility_enabled: boolean
  * Detected from the install.rdf. This will only be true for legacy add-ons
    that specify the corresponding field in install.rdf (such as Lightning).

**Example**

    GET /api/addon/8542/versions/2210787/files/751974

    {
      "file_id": 751974,
      "bootstrapped": true,
      "jetpack": true,
      "has_webextension": true,
      "is_strict_compatibility_enabled": false
    }
