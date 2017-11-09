using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using xpi_versions_app.Extended;
using xpi_versions_app.AMO;

namespace xpi_versions_app.Controllers {
    public class SearchController : Controller {
        [Route("search")]
        public async Task<IActionResult> Index(string q = null, int page = 1, int page_size = 10, string lang = null) {
			var c = new AMOClient(lang);
			string ua = Request.Headers["User-Agent"].ToString() ?? "";

			var search = await c.Search(q, page: page, page_size: page_size);
			FlatVersion[] flat = await Task.WhenAll(search.results.Select(a => FlatVersion.GetAsync(a, a.current_version, ua)));
            return View(flat);
        }
    }
}
