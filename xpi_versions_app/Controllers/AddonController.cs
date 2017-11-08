using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using xpi_versions_app.Models;

namespace xpi_versions_app.Controllers
{
    public class AddonController : Controller
    {
        public async Task<IActionResult> Index(string id = null, string lang = null)
        {
			if (id == null) {
				return View("NoId");
			} else {
				return View(await AddonModel.CreateAsync(id, lang));
			}
        }

        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
