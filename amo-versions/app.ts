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

interface FlatVersion extends AmoVersion {
    strings: {
        install_url: string | null;
        download_url: string | null;
        released_display: string;
    };
    file: AmoFile;
    ext_file: KnockoutObservable<ExtendedFileInfo | null>;
    compatibility_display: KnockoutObservable<string>;
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

const extendedFileInfoPromises: PromiseLike<void>[] = [];

function extendVersionInfo(v: AmoVersion): FlatVersion {
    const file = v.files.filter((f: any) => f.platform == platform || f.platform == "all")[0] || v.files[0];
    
    const xpi_url = file.url.replace(/src=$/, "src=version-history");

    const applications_by_name: {
        [key: string]: string | undefined
    } = {
        firefox: "Firefox",
        android: "Firefox for Android",
        thunderbird: "Thunderbird",
        seamonkey: "SeaMonkey"
    };

    let compatiblityStrs: string[] = [];
    for (let id in applications_by_name) {
        const c = v.compatibility[id];
        if (!c) continue;

        const name = applications_by_name[id] || id;
        compatiblityStrs.push(`${name} ${c.min} - ${c.max}`);
    }
    const compatibility_display = ko.observable<string>(compatiblityStrs.join(", "));

    const ext_file = ko.observable<ExtendedFileInfo | null>(null);
    ext_file.subscribe(f => {
        if (!f) return;

        const applications_by_guid: {
            [key: string]: string | undefined
        } = {
            "{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}": "Pale Moon",
            "toolkit@mozilla.org": "Toolkit"
        };
        
        for (let guid in applications_by_guid) {
            const c = f.targets[guid];
            if (!c) continue;

            const name = applications_by_guid[guid] || guid;
            compatibility_display(`${compatibility_display()}, ${name} ${c.min} - ${c.max}`);
        }
    });

    return {
        ...v,
        file: file,
        strings: {
            install_url: xpi_url,
            download_url: xpi_url.replace(/downloads\/file\/([0-9]+)/, "downloads/file/$1/type:attachment"),
            released_display: new Date(file.created).toLocaleDateString(navigator.language, {
                day: "numeric",
                month: "long",
                year: "numeric"
            })
        },
        ext_file: ext_file,
        compatibility_display: compatibility_display
    };
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

    const versions_ext = versions_response.results.map(extendVersionInfo);
    viewModel.versions(versions_ext);
    
    viewModel.versions().map(async v => {
        try {
            const url = `https://amo-versions.azurewebsites.net/api/addon/${addon.id}/versions/${v.id}/files/${v.file.id}`;
            const r = await fetch(url);
            if (r.status >= 300) {
                throw new Error(`${url} returned status code ${r.status}: ${await r.text()}`);
            }
            v.ext_file(await r.json());
        } catch (e) {
            console.error(e);
        }
    });
};
