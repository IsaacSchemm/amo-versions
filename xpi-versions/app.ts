const viewModel = {
    addon: ko.observable<Addon>(),
    versions: ko.observableArray<FlatVersion>(),
    page: ko.observable<number>(),
    last_page: ko.observable<number>(),
    release_notes_shown: ko.observable(false),
    
    prev_page_url: ko.pureComputed(() => ""),
    next_page_url: ko.pureComputed(() => ""),

    prev: () => location.href = viewModel.prev_page_url(),
    next: () => location.href = viewModel.next_page_url(),
    toggle_release_notes: () => viewModel.release_notes_shown(!viewModel.release_notes_shown())
};

viewModel.prev_page_url = ko.pureComputed(() => viewModel.page() > 1
    ? replacePageParam(viewModel.page() - 1)
    : "");
viewModel.next_page_url = ko.pureComputed(() => viewModel.page() < viewModel.last_page()
    ? replacePageParam(viewModel.page() + 1)
    : "");

window.onload = async () => {
    const searchParams = new URLSearchParams(location.search.substr(1));
    const host = searchParams.get('host') || "addons.mozilla.org";
    let id = searchParams.get('id');
    const page = +(searchParams.get('page') || "1");
    const page_size = +(searchParams.get('page_size') || "10");

    if (id == null) {
        document.getElementById("main")!.innerHTML = "Use the ?id= parameter to specify an add-on, using a slug, GUID, or numeric ID.";
        return;
    }

    ko.applyBindings(viewModel, document.body);

    if (id == "random") {
        const search_results = await get_json(`https://${host}/api/v3/addons/search?lang=${navigator.language}&page_size=1&sort=random&type=extension&featured=true`);
        id = search_results.results[0].id;
    }

    const addon = await get_json(`https://${host}/api/v3/addons/addon/${id}?lang=${navigator.language}`);
    viewModel.addon(addon);

    document.title = addon.name + " - xpi-versions";

    const versions_response = await get_json(`https://${host}/api/v3/addons/addon/${id}/versions?page=${page}&page_size=${page_size}&lang=${navigator.language}`);
    viewModel.page(page);
    viewModel.last_page(Math.ceil(versions_response.count / page_size));

    const versions_ext = versions_response.results.map((v: AmoVersion) => new FlatVersion(addon, v));
    viewModel.versions(versions_ext);

    const suite_navbar_links: any = {
        first: viewModel.page() > 1
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
        if (fv.addon.type == "extension" || fv.addon.type == "theme" || fv.addon.type == "language") {
            if (fv.ext_file() == null) {
                fv.loading(true);
                try {
                    const p1 = get_json(`https://xpi-versions.azurewebsites.net/api/addon/${addon.id}/versions/${fv.version.id}/files/${fv.file.id}`);
                    const p2 = new Promise<void>(r => setTimeout(r, 10000));
                    await Promise.race([p1, p2]);
                    fv.ext_file(await p1);
                } catch (e) {
                    console.error(e);
                }
                fv.loading(false);
            }
        }
    });
};
