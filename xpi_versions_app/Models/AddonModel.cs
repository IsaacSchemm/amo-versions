using Newtonsoft.Json;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using xpi_versions_app.AMO;

namespace xpi_versions_app.Models {
	public class AddonModel {
		private static WebClient GetWebClient() {
			var client = new WebClient();
			client.Headers.Add("User-Agent", "xpi-versions/1.0 (https://github.com/IsaacSchemm/xpi-versions)");
			return client;
		}

		public Addon Addon { get; private set; }

		public IEnumerable<Version> Versions { get; private set; }

		//public int Page { get; set; }

		//public int PageSize { get; set; }

		private AddonModel() { }

		public static async Task<AddonModel> CreateAsync(string id, int page, int page_size, string lang) {
			var t1 = GetAddon(id, lang);
			var t2 = GetVersions(id, page, page_size, lang);
			return new AddonModel {
				Addon = await t1,
				Versions = await t2
			};
		}

		private static async Task<Addon> GetAddon(string id, string lang) {
			string json = await GetWebClient().DownloadStringTaskAsync($"https://addons.mozilla.org/api/v3/addons/addon/{id}?lang={lang}");
			return JsonConvert.DeserializeObject<Addon>(json);
		}

		private static async Task<IEnumerable<Version>> GetVersions(string id, int page, int page_size, string lang) {
			string json = await GetWebClient().DownloadStringTaskAsync($"https://addons.mozilla.org/api/v3/addons/addon/{id}/versions?page={page}&page_size={page_size}&lang={lang}");
			return JsonConvert.DeserializeObject<PagedResult<Version>>(json).results;
		}
	}
}
