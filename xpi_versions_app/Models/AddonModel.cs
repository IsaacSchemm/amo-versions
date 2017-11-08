using Newtonsoft.Json;
using System.Net;
using System.Threading.Tasks;
using xpi_versions_app.AMO;

namespace xpi_versions_app.Models {
	public class AddonModel {
		private static WebClient _client;

		static AddonModel() {
			_client = new WebClient();
			_client.Headers.Add("User-Agent", "xpi-versions/1.0 (https://github.com/IsaacSchemm/xpi-versions)");
		}

		public Addon Addon { get; set; }

		private AddonModel() { }

		public static async Task<AddonModel> CreateAsync(string id, string lang = null) {
			string json = await _client.DownloadStringTaskAsync($"https://addons.mozilla.org/api/v3/addons/addon/{id}?lang={lang ?? "en-US"}");
			return new AddonModel {
				Addon = JsonConvert.DeserializeObject<Addon>(json)
			};
		}
	}
}
