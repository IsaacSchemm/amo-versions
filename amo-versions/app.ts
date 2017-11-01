const viewModel = {
    addon: ko.observable<any>(),

    name: ko.observable<string>(),
    summary: ko.observable<string>(),

    versions: ko.observableArray<any>()
}

function getString(map: { [key: string]: string | undefined }, fallback_language: string) {
    return map[navigator.language] || map[fallback_language] || null;
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
