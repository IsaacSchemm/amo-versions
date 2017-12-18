interface Addon {
    id: number;
    current_version: AmoVersion;
    guid: string;
    name: string;
    type: "theme" | "search" | "persona" | "language" | "extension" | "dictionary";
    url: string;
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
    const searchParams = new URLSearchParams(location.search.substr(1));
    searchParams.set("page", `${page}`);
    return `${location.protocol}//${location.host}${location.pathname}?${searchParams}`;
}

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
    readonly loading: KnockoutObservable<boolean>;

    readonly install_url: string;
    readonly download_url: string;
    readonly released_display: string;

    readonly compatibility_display: KnockoutComputed<string>;

    readonly target: string;
    readonly app_name: string;
    readonly app_compatible: KnockoutComputed<boolean>;

    readonly converter_url: string;
    readonly convertible: KnockoutComputed<boolean>;

    readonly show_hybrid_warning: KnockoutComputed<boolean>;

    constructor(readonly addon: Addon, readonly version: AmoVersion) {
        this.file = [
            ...version.files.filter(f => f.platform == platform || f.platform == "all"),
            ...version.files
        ][0];
        this.ext_file = ko.observable(null);
        this.loading = ko.observable(false);

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
                : /Goanna/.test(navigator.userAgent) ? ""
                    : /Thunderbird/.test(navigator.userAgent) ? "thunderbird"
                        : /Android/.test(navigator.userAgent) ? "android"
                            : /Firefox/.test(navigator.userAgent) ? "firefox"
                                : "";
        this.app_name = this.target == "seamonkey" ? "SeaMonkey"
            : this.target == "palemoon" ? "Pale Moon"
                : this.target == "thunderbird" ? "Thunderbird"
                    : this.target == "firefox" ? "Firefox"
                        : "Browser";

        this.show_hybrid_warning = ko.pureComputed(() => {
            const f = this.ext_file();
            return f != null && f.has_webextension && ["seamonkey", "palemoon", "thunderbird"].indexOf(this.target) >= 0;
        })

        this.app_compatible = ko.pureComputed(() => {
            if (addon.type == "dictionary") return true;
            if (addon.type == "persona") return true;
            if (addon.type == "search") return "AddSearchProvider" in window.external;

            const ext_file = this.ext_file();
            const amo_compat = this.version.compatibility[this.target];
            switch (this.target) {
                case "palemoon":
                    if (this.file.is_webextension) return false; // No WebExtensions support

                    if (ext_file) {
                        const rdf_compat = ext_file.targets["{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}"];
                        if (rdf_compat) {
                            // This add-on supports Pale Moon specifically
                            if (!FlatVersion.checkMinVersion(rdf_compat.min)) return false; // Only supports newer versions
                            if (ext_file.is_strict_compatibility_enabled) {
                                if (!FlatVersion.checkMaxVersion(rdf_compat.max)) return false; // Only supports older versions
                            }
                            return true;
                        } else {
                            // To the best of my knowledge, Pale Moon will only install jetpack
                            // (PMKit) add-ons if they're targeted to Pale Moon specifically.
                            if (ext_file.jetpack) return false;
                            // Some hybrid add-ons might work without the WebExtensions part (NoScript?),
                            // but if Pale Moon isn't listed in install.rdf, assume it won't work
                            if (ext_file.has_webextension) return false;
                        }
                    }

                    // No support for Pale Moon, check Firefox
                    return this.version.compatibility["firefox"] != null && !this.file.is_webextension;
                case "seamonkey":
                case "thunderbird":
                    if (!amo_compat) return false; // Not compatible
                    if (!FlatVersion.checkMinVersion(amo_compat.min)) return false; // Only supports newer versions
                    if (addon.type == "language") {
                        if (!FlatVersion.checkMaxVersion(amo_compat.max)) return false; // Only supports older versions
                    }
                    if (this.file.is_webextension) return false; // No WebExtensions support
                    if (ext_file) {
                        // Data is loaded
                        if (ext_file.is_strict_compatibility_enabled) {
                            if (!FlatVersion.checkMaxVersion(amo_compat.max)) return false; // Only supports older versions
                        }
                    }
                    return true;
                case "firefox":
                case "android":
                    if (!amo_compat) return false; // Not compatible
                    if (!FlatVersion.checkMinVersion(amo_compat.min)) return false; // Only supports newer versions
                    if (addon.type == "language" || this.version.is_strict_compatibility_enabled) {
                        if (!FlatVersion.checkMaxVersion(amo_compat.max)) return false; // Only supports older versions (includes legacy add-ons in Fx 57+)
                    }
                    return true;
                default:
                    return true;
            }
        });

        this.converter_url = `https://addonconverter.fotokraina.com/?url=${encodeURIComponent(xpi_url)}`;
        this.convertible = ko.pureComputed(() => {
            if (this.addon.type != "extension") return false;
            if (this.target != "seamonkey") return false;

            const amo_compat = this.version.compatibility["seamonkey"];
            if (amo_compat) return false;

            // Some hybrid add-ons might work without the WebExtensions part (NoScript?),
            // but if SeaMonkey isn't listed in install.rdf, assume it won't work
            const ext_file = this.ext_file();
            if (ext_file && ext_file.has_webextension) return false;

            return true;
        });
    }

    addSearchProvider() {
        (window.external as any).AddSearchProvider(this.install_url);
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

        for (let i = 0; i < addonMinVersion.length; i++) {
            const theirMin = addonMinVersion[i] == '*'
                ? 0
                : +addonMinVersion[i];
            const mine = myVersion.length > i
                ? myVersion[i]
                : 0;
            if (theirMin < mine) {
                return true;
            } else if (theirMin > mine) {
                return false;
            }
        }
        return true;
    }

    private static checkMaxVersion(max: string) {
        const addonMaxVersion = max.split('.');

        const myVersion = this.getAppVersion().split('.');

        for (let i = 0; i < addonMaxVersion.length; i++) {
            const theirMax = addonMaxVersion[i] == '*'
                ? Infinity
                : +addonMaxVersion[i];
            const mine = myVersion.length > i
                ? myVersion[i]
                : 0;
            if (theirMax > mine) {
                return true;
            } else if (theirMax < mine) {
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