const viewModel = {
    addon: ko.observable<any>(),

    name: ko.observable<string>(),
    summary: ko.observable<string>(),

    versions: ko.observableArray<any>()
}

function getString(map: { [key: string]: string | undefined } | null, fallback_language?: string) {
    if (map == null) return null;
    return map[navigator.language] || (fallback_language && map[fallback_language]) || null;
}

function getReleasedStr(version: any) {
    return new Date(version.files[0].created).toLocaleDateString(navigator.language, {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function getCompatiblityStr(version: any) {
    const applications = [
        { id: "firefox", name: "Firefox" },
        { id: "android", name: "Firefox for Android" },
        { id: "thunderbird", name: "Thunderbird" },
        { id: "seamonkey", name: "SeaMonkey" }
    ];
    let strs: string[] = [];
    for (const app of applications) {
        const c = version.compatibility[app.id];
        if (c) {
            if (c.max == "*") {
                strs.push(`${app.name} ${c.min} and above`);
            } else {
                strs.push(`${app.name} ${c.min} - ${c.max}`);
            }
        }
    }
    return strs.join(", ");
}

function getReleaseNotes(version: any) {
    return getString(version.release_notes);
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

    const addon = await fetch(`https://addons.mozilla.org/api/v3/addons/addon/${id}`)
        .then(r => r.json());
    viewModel.addon(addon);
    
    viewModel.name(getString(addon.name, addon.default_locale));
    viewModel.summary(getString(addon.summary, addon.default_locale));

    const versions = await fetch(`https://addons.mozilla.org/api/v3/addons/addon/${id}/versions?page=${page}`)
        .then(r => r.json())
        .then(o => o.results);
    viewModel.versions(versions);
};
