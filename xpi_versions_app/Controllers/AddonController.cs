using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using xpi_versions_app.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.WindowsAzure.Storage;

namespace xpi_versions_app.Controllers
{
    public class AddonController : Controller
    {
		[Route("addon/{id}")]
		public async Task<IActionResult> Index(string id = null, int page = 1, int page_size = 10, string lang = null)
        {
			string ua = Request.Headers["User-Agent"].ToString() ?? "";
			if (id == null) {
				return View("NoId");
			} else {
				var model = await AddonModel.CreateAsync(id, page, page_size, ua, lang ?? "en-US");
				ViewBag.FirstUrl = model.Page <= 1 ? null : Url.Action(nameof(Index), new {
					id = id,
					page = 1,
					page_size = page_size,
					lang = lang
				});
				ViewBag.PreviousUrl = model.Page <= 1 ? null : Url.Action(nameof(Index), new {
					id = id,
					page = page - 1,
					page_size = page_size,
					lang = lang
				});
				ViewBag.NextUrl = model.Page >= model.MaxPage ? null : Url.Action(nameof(Index), new {
					id = id,
					page = page + 1,
					page_size = page_size,
					lang = lang
				});
				ViewBag.LastUrl = model.Page >= model.MaxPage ? null : Url.Action(nameof(Index), new {
					id = id,
					page = model.MaxPage,
					page_size = page_size,
					lang = lang
				});
				return View(model);
			}
        }

        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
