interface Addon {
    name: string;
    summary: string | null;
}

interface AmoVersion {
    id: number;
    compatibility: {
        [key: string]: {
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
        [guid: string]: {
            min: string;
            max: string;
        }
    };
}

const viewModel = {
    addon: ko.observable<Addon>(),
    versions: ko.observableArray<FlatVersion>(),
    page: ko.observable<number>(),
    last_page: ko.observable<boolean>(),
    next_page: ko.observable<boolean>(),

    back: () => {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("page", `${viewModel.page() - 1}`);
        location.href = `${location.protocol}//${location.host}${location.pathname}?${searchParams}`;
    },

    next: () => {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("page", `${viewModel.page() + 1}`);
        location.href = `${location.protocol}//${location.host}${location.pathname}?${searchParams}`;
    }
};

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

    constructor(readonly version: AmoVersion) {
        this.file = [
            ...version.files.filter(f => f.platform == platform || f.platform == "all"),
            ...version.files
        ][0];
        this.ext_file = ko.observable(null);

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

            const applications_by_name: {
                [key: string]: string | undefined
            } = {
                firefox: "Firefox",
                android: "Firefox for Android",
                thunderbird: "Thunderbird",
                seamonkey: "SeaMonkey"
                };

            const applications_by_guid: {
                [key: string]: string | undefined
            } = {
                "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}": "Pale Moon",
                "toolkit@mozilla.org": "Toolkit"
            };

            for (let id in applications_by_name) {
                const c = this.version.compatibility[id];
                if (!c) continue;

                const name = applications_by_name[id] || id;
                compatiblityStrs.push(`${name} ${c.min} - ${c.max}`);
            }

            const f = this.ext_file();
            if (f) {
                for (let guid in applications_by_guid) {
                    const c = f.targets[guid];
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
                    // TODO more logic here
                    return true;
                case "seamonkey":
                case "thunderbird":
                    if (!amo_compat) return false;
                    if (!this.checkMinVersion(amo_compat.min)) return false;
                    if (!ext_file) return true;
                    if (ext_file.has_webextension) return false;
                    if (ext_file.is_strict_compatibility_enabled) {
                        if (!this.checkMaxVersion(amo_compat.max)) return false;
                    }
                    return true;
                default:
                    if (!amo_compat) return false;
                    if (!this.checkMinVersion(amo_compat.min)) return false;
                    if (this.version.is_strict_compatibility_enabled) {
                        if (!this.checkMaxVersion(amo_compat.max)) return false;
                    }
                    return true;
            }
        });
    }

    getAppVersion(): string {
        const versionMatch = /SeaMonkey\/([0-9\.]+)/.exec(navigator.userAgent)
            || /PaleMoon\/([0-9\.]+)/.exec(navigator.userAgent)
            || /rv:([0-9\.]+)/.exec(navigator.userAgent);
        return versionMatch ? versionMatch[1] : "999";
    }

    checkMinVersion(min: string) {
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

    checkMaxVersion(max: string) {
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

function extendVersionInfo(v: AmoVersion): FlatVersion {
    return new FlatVersion(v);
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

    const addon = await fetch(`https://addons.mozilla.org/api/v3/addons/addon/${id}?lang={navigator.language}`)
        .then(r => r.json());
    viewModel.addon(addon);

    const versions_response = await fetch(`https://addons.mozilla.org/api/v3/addons/addon/${id}/versions?page=${page}&page_size=${page_size}&lang={navigator.language}`)
        .then(r => r.json());
    viewModel.page(page);
    viewModel.last_page(page > 1);
    viewModel.next_page(versions_response.next != null);

    const versions_ext = versions_response.results.map((v: AmoVersion) => new FlatVersion(v));
    viewModel.versions(versions_ext);
    
    viewModel.versions().map(async fv => {
        try {
            const url = `https://amo-versions.azurewebsites.net/api/addon/${addon.id}/versions/${fv.version.id}/files/${fv.file.id}`;
            const r = await fetch(url);
            if (r.status >= 300) {
                throw new Error(`${url} returned status code ${r.status}: ${await r.text()}`);
            }
            fv.ext_file(await r.json());
        } catch (e) {
            console.error(e);
        }
    });
};
