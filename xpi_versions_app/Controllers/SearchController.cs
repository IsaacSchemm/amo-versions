using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace xpi_versions_app.Controllers {
    public class SearchController : Controller {
        [Route("search")]
        public async Task<IActionResult> Index(string q = null, int page = 1, int page_size = 10, string lang = null) {
			var c = new AMO.AMOClient(lang);
			var results = await c.Search(q, page: page, page_size: page_size);
            return View(results);
        }
    }
}
