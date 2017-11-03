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
    }[];
}

interface FlatVersionFileInfo extends AmoVersion {
    strings: {
        install_url: string | null;
        download_url: string | null;

        released_display: string;
        compatibility_display: string;
    };
    file: AmoFile;
    ext_file: KnockoutObservable<ExtendedFileInfo | null>;
}

const viewModel = {
    addon: ko.observable<Addon>(),
    versions: ko.observableArray<FlatVersionFileInfo>()
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

function extendVersionInfo(addon_id: number, v: AmoVersion): FlatVersionFileInfo {
    const file = v.files.filter((f: any) => f.platform == platform || f.platform == "all")[0] || v.files[0];

    const observable = ko.observable<ExtendedFileInfo | null>(null);
    fetch(`https://amo-versions-lakora.azurewebsites.net/api/addon/${addon_id}/versions/${v.id}/files/${file.id}`)
        .then(r => r.json())
        .then(o => observable(o))
        .catch(e => console.error(e));

    const xpi_url = file.url.replace(/src=$/, "src=version-history");

    const applications = [
        { id: "firefox", name: "Firefox" },
        { id: "android", name: "Firefox for Android" },
        { id: "thunderbird", name: "Thunderbird" },
        { id: "seamonkey", name: "SeaMonkey" }
    ];
    let compatiblityStrs: string[] = [];
    for (const app of applications) {
        const c = v.compatibility[app.id];
        if (c) {
            if (c.max == "*") {
                compatiblityStrs.push(`${app.name} ${c.min} and above`);
            } else {
                compatiblityStrs.push(`${app.name} ${c.min} - ${c.max}`);
            }
        }
    }

    return {
        ...v,
        file: file,
        ext_file: observable,
        strings: {
            install_url: xpi_url,
            download_url: xpi_url.replace(/downloads\/file\/([0-9]+)/, "downloads/file/$1/type:attachment"),
            released_display: new Date(file.created).toLocaleDateString(navigator.language, {
                day: "numeric",
                month: "long",
                year: "numeric"
            }),
            compatibility_display: compatiblityStrs.join(", ")
        }
    };
}

window.onload = async () => {
    const main = document.getElementById("main");

    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    const page = searchParams.get('page') || "1";

    if (id == null) {
        main!.innerHTML = "Use the ?id= parameter to specify an add-on, using a slug, GUID, or numeric ID.";
        return;
    }

    ko.applyBindings(viewModel, main);

    const addon = await fetch(`https://addons.mozilla.org/api/v3/addons/addon/${id}?lang={navigator.language}`)
        .then(r => r.json());
    viewModel.addon(addon);

    const versions: AmoVersion[] = await fetch(`https://addons.mozilla.org/api/v3/addons/addon/${id}/versions?page=${page}&lang={navigator.language}`)
        .then(r => r.json())
        .then(o => o.results);

    const versions_ext = versions.map(v => extendVersionInfo(addon.id, v));

    viewModel.versions(versions_ext);
};
