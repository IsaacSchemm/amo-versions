interface Addon {
    name: string;
    summary: string | null;
}

interface AmoVersion {
    id: number;
    compatibility: {
        [key: string]: undefined | {
            min: string;
            max: string;
        }
    };
    files: AmoFile[];
    is_strict_compatibility_enabled: boolean;
    license: {
        id: number;
        name: string;
        text: string;
        url: string;
    };
    release_notes: string | null;
    url: string;
    version: string;
}

interface AmoFile {
    id: number;
    created: string;
    is_webextension: boolean;
    platform: string;
    size: number;
    status: string;
    url: string;
}

interface ExtendedFileInfo {
    id: number;
    bootstrapped: boolean;
    jetpack: boolean;
    has_webextension: boolean;
    is_strict_compatibility_enabled: boolean;
    targets: {
        [guid: string]: undefined | {
            min: string;
            max: string;
        }
    };
}

function replacePageParam(page: number) {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set("page", `${page}`);
    return `${location.protocol}//${location.host}${location.pathname}?${searchParams}`;
}

const viewModel = {
    addon: ko.observable<Addon>(),
    versions: ko.observableArray<FlatVersion>(),
    page: ko.observable<number>(),
    last_page: ko.observable<number>(),
    
    prev_page_url: ko.pureComputed(() => ""),
    next_page_url: ko.pureComputed(() => ""),

    prev: () => location.href = viewModel.prev_page_url(),

    next: () => location.href = viewModel.next_page_url()
};

viewModel.prev_page_url = ko.pureComputed(() => viewModel.page() > 1
    ? replacePageParam(viewModel.page() - 1)
    : "");
viewModel.next_page_url = ko.pureComputed(() => viewModel.page() < viewModel.last_page()
    ? replacePageParam(viewModel.page() + 1)
    : "");

const platform = (() => {
    let platform: string | null = null;
    const osStrings: any = {
        'windows': /Windows/,
        'mac': /Mac/,
        'linux': /Linux|BSD/,
        'android': /Android/,
    };
    for (const i in osStrings) {
        const pattern = osStrings[i];
        if (pattern.test(navigator.userAgent)) {
            platform = i;
            break;
        }
    }
    return platform;
})();

class FlatVersion {
    readonly file: AmoFile;
    readonly ext_file: KnockoutObservable<ExtendedFileInfo | null>;

    readonly install_url: string;
    readonly download_url: string;
    readonly released_display: string;

    readonly compatibility_display: KnockoutComputed<string>;

    readonly target: string;
    readonly app_name: string;
    readonly app_compatible: KnockoutComputed<boolean>;

    readonly converter_url: string;
    readonly convertible: KnockoutComputed<boolean>;

    constructor(readonly version: AmoVersion) {
        this.file = [
            ...version.files.filter(f => f.platform == platform || f.platform == "all"),
            ...version.files
        ][0];
        this.ext_file = ko.observable(null);

        if (this.file.is_webextension) {
            // We already know what these fields will be
            this.ext_file({
                id: this.file.id,
                bootstrapped: false,
                has_webextension: true,
                is_strict_compatibility_enabled: false,
                jetpack: false,
                targets: {
                    "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}": version.compatibility["firefox"],
                    "{aa3c5121-dab2-40e2-81ca-7ea25febc110}": version.compatibility["android"]
                }
            });
        }

        const xpi_url = this.file.url.replace(/src=$/, "src=version-history");
        this.install_url = xpi_url;
        this.download_url = xpi_url.replace(/downloads\/file\/([0-9]+)/, "downloads/file/$1/type:attachment");

        this.released_display = new Date(this.file.created).toLocaleDateString(navigator.language, {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        this.compatibility_display = ko.pureComputed(() => {
            let compatiblityStrs: string[] = [];

            // Get compatibility information for Mozilla-related applications from AMO.
            // An add-on won't be listed unless it has at least one of these.
            const applications_by_name: {
                [key: string]: string | undefined
            } = {
                firefox: "Firefox",
                android: "Firefox for Android",
                thunderbird: "Thunderbird",
                seamonkey: "SeaMonkey"
            };

            // Other applications might be listed in the install.rdf.
            const applications_by_guid: {
                [key: string]: string | undefined
            } = {
                "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}": "Pale Moon",
                "toolkit@mozilla.org": "Toolkit"
            };

            const ext_file = this.ext_file();

            // See which Mozilla applications this works with
            for (let id in applications_by_name) {
                const c = this.version.compatibility[id];
                if (!c) continue;

                if (id == "thunderbird" || id == "seamonkey") {
                    // Some add-ons with embedded WebExtensions incorrectly
                    // declare compatibility with SM/TB.
                    if (ext_file && ext_file.has_webextension) {
                        continue;
                    }
                }

                const name = applications_by_name[id] || id;
                compatiblityStrs.push(`${name} ${c.min} - ${c.max}`);
            }

            if (ext_file) {
                // Data is loaded
                // See if there are any other applications this works with
                for (let guid in applications_by_guid) {
                    const c = ext_file.targets[guid];
                    if (!c) continue;

                    const name = applications_by_guid[guid] || guid;
                    compatiblityStrs.push(`${name} ${c.min} - ${c.max}`);
                }
            }

            return compatiblityStrs.join(", ");
        });

        this.target = /SeaMonkey/.test(navigator.userAgent) ? "seamonkey"
            : /PaleMoon/.test(navigator.userAgent) ? "palemoon"
                : /Thunderbird/.test(navigator.userAgent) ? "thunderbird"
                    : /Android/.test(navigator.userAgent) ? "android"
                        : "firefox";
        this.app_name = /SeaMonkey/.test(navigator.userAgent) ? "SeaMonkey"
            : /PaleMoon/.test(navigator.userAgent) ? "Pale Moon"
                : /Thunderbird/.test(navigator.userAgent) ? "Thunderbird"
                    : "Firefox";

        this.app_compatible = ko.pureComputed(() => {
            const ext_file = this.ext_file();
            const amo_compat = this.version.compatibility[this.target];
            switch (this.target) {
                case "palemoon":
                    if (ext_file) {
                        // Data is loaded
                        if (ext_file.has_webextension) return false; // No WebExtensions support

                        const rdf_compat = ext_file.targets["{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}"];
                        if (rdf_compat) {
                            // This add-on supports Pale Moon specifically
                            if (!FlatVersion.checkMinVersion(rdf_compat.min)) return false; // Only supports newer versions
                            if (ext_file.is_strict_compatibility_enabled) {
                                if (!FlatVersion.checkMaxVersion(rdf_compat.max)) return false; // Only supports older versions
                            }
                            return true;
                        }
                    }

                    // No support for Pale Moon, check Firefox
                    return this.version.compatibility["firefox"] != null && !this.file.is_webextension;
                case "seamonkey":
                case "thunderbird":
                    if (!amo_compat) return false; // Not compatible
                    if (!FlatVersion.checkMinVersion(amo_compat.min)) return false; // Only supports newer versions
                    if (ext_file) {
                        // Data is loaded
                        if (ext_file.has_webextension) return false; // No WebExtensions support
                        if (ext_file.is_strict_compatibility_enabled) {
                            if (!FlatVersion.checkMaxVersion(amo_compat.max)) return false; // Only supports older versions
                        }
                    }
                    return true;
                default:
                    if (!amo_compat) return false; // Not compatible
                    if (!FlatVersion.checkMinVersion(amo_compat.min)) return false; // Only supports newer versions
                    if (this.version.is_strict_compatibility_enabled) {
                        if (!FlatVersion.checkMaxVersion(amo_compat.max)) return false; // Only supports older versions (includes legacy add-ons in Fx 57+)
                    }
                    return true;
            }
        });

        this.converter_url = `https://addonconverter.fotokraina.com/?url=${encodeURIComponent(xpi_url)}`;
        this.convertible = ko.pureComputed(() => {
            if (this.target != "seamonkey") return false;

            const amo_compat = this.version.compatibility["seamonkey"];
            if (amo_compat) return false;

            const ext_file = this.ext_file();
            if (ext_file && ext_file.has_webextension) return false;

            return true;
        });
    }

    private static getAppVersion(): string {
        const versionMatch = /SeaMonkey\/([0-9\.]+)/.exec(navigator.userAgent)
            || /PaleMoon\/([0-9\.]+)/.exec(navigator.userAgent)
            || /rv:([0-9\.]+)/.exec(navigator.userAgent);
        return versionMatch ? versionMatch[1] : "999";
    }

    private static checkMinVersion(min: string) {
        const addonMinVersion = min.split('.');
        
        const myVersion = this.getAppVersion().split('.');

        for(let i = 0; i < addonMinVersion.length; i++) {
            const theirMin = addonMinVersion[i] == '*'
                ? 0
                : +addonMinVersion[i];
            const mine = myVersion.length > i
                ? myVersion[i]
                : 0;
            if (theirMin > mine) {
                return false;
            }
        }
        return true;
    }

    private static checkMaxVersion(max: string) {
        const addonMaxVersion = max.split('.');

        const myVersion = this.getAppVersion().split('.');

        for(let i = 0; i < addonMaxVersion.length; i++) {
            const theirMax = addonMaxVersion[i] == '*'
                ? Infinity
                : +addonMaxVersion[i];
            const mine = myVersion.length > i
                ? myVersion[i]
                : 0;
            if (theirMax < mine) {
                return false;
            }
        }
        return true;
    }
}

async function get_json(url: string) {
    const response = await fetch(url);
    if (response.status >= 400) {
        throw new Error(`${url} returned status code ${response.status}: ${await response.text()}`);
    }
    return response.json();
}

window.onload = async () => {
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    const page = +(searchParams.get('page') || "1");
    const page_size = +(searchParams.get('page_size') || "10");

    if (id == null) {
        document.getElementById("main")!.innerHTML = "Use the ?id= parameter to specify an add-on, using a slug, GUID, or numeric ID.";
        return;
    }

    ko.applyBindings(viewModel, document.body);

    const addon = await get_json(`https://addons.mozilla.org/api/v3/addons/addon/${id}?lang={navigator.language}`);
    viewModel.addon(addon);

    const versions_response = await get_json(`https://addons.mozilla.org/api/v3/addons/addon/${id}/versions?page=${page}&page_size=${page_size}&lang={navigator.language}`);
    viewModel.page(page);
    viewModel.last_page(Math.ceil(versions_response.count / page_size));

    const versions_ext = versions_response.results.map((v: AmoVersion) => new FlatVersion(v));
    viewModel.versions(versions_ext);

    const suite_navbar_links: any = {
        first: () => viewModel.page() > 1
            ? replacePageParam(1)
            : "",
        prev: viewModel.prev_page_url(),
        next: viewModel.next_page_url(),
        last: viewModel.page() < viewModel.last_page()
            ? replacePageParam(viewModel.last_page())
            : ""
    };
    for (let key in suite_navbar_links) {
        const value = suite_navbar_links[key];
        if (value) {
            const link = document.createElement("link");
            link.rel = key;
            link.href = value;
            document.head.appendChild(link);
        }
    }
    
    viewModel.versions().map(async fv => {
        try {
            if (fv.ext_file() == null) {
                fv.ext_file(await get_json(`https://amo-versions.azurewebsites.net/api/addon/${addon.id}/versions/${fv.version.id}/files/${fv.file.id}`));
            }
        } catch (e) {
            console.error(e);
        }
    });
};
