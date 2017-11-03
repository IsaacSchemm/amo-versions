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
* targets: array of objects, extracted from targetApplication in install.rdf
  * id: string
  * minVersion: string
  * maxVersion: string

**Examples**

    GET /api/addon/lastpass-password-manager/versions/2210787/files/751974

    {
      "id": 751974,
      "bootstrapped": true,
      "jetpack": true,
      "has_webextension": true,
      "is_strict_compatibility_enabled": false,
      "targets": {
        "{aa3c5121-dab2-40e2-81ca-7ea25febc110}": {
          "min": "38.0a1",
          "max": "*"
        },
        "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}": {
          "min": "38.0a1",
          "max": "*"
        }
      }
    }

    GET /api/addon/lightning/versions/2084735/files/633791

    {
      "id": 633791,
      "bootstrapped": false,
      "jetpack": false,
      "has_webextension": false,
      "is_strict_compatibility_enabled": true,
      "targets": {
        "{3550f703-e582-4d05-9a08-453d09bdfdc6}": {
          "min": "52.0",
          "max": "52.*"
        },
        "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}": {
          "min": "2.49",
          "max": "2.49.*"
        }
      }
    }
