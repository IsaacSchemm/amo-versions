using Microsoft.WindowsAzure.Storage.Blob;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using xpi_versions_app.AMO;
using xpi_versions_app.Extended;

namespace xpi_versions_app.Models {
	public class AddonModel {
		public Addon Addon { get; private set; }

		public IEnumerable<FlatVersion> Versions { get; private set; }

		public int Page { get; set; }

		public int MaxPage { get; set; }

		private AddonModel() { }

		public static async Task<AddonModel> CreateAsync(string id, int page, int page_size, string ua, string lang) {
			var c = new AMOClient(lang);
			var t1 = c.GetAddon(id);
			var versions = await c.GetVersions(id, page, page_size);
			var addon = await t1;

			var flat = await Task.WhenAll(versions.results.Select(v => FlatVersion.GetAsync(addon, v, ua)));

			return new AddonModel {
				Addon = addon,
				Versions = flat,
				Page = page,
				MaxPage = (versions.count - 1) / page_size
			};
		}
	}
}
