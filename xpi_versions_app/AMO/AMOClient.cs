using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

namespace xpi_versions_app.AMO {
    public class AMOClient {
		public readonly string Language;

		public AMOClient(string language) {
			Language = language ?? "en-US";
		}

		public static HttpWebRequest CreateRequest(string url) {
			var request = WebRequest.CreateHttp(url);
			request.UserAgent = "xpi_versions_app/1.0 (https://github.com/IsaacSchemm/xpi-versions)";
			request.Accept = "application/json";
			return request;
		}

		public async Task<Addon> GetAddon(string addon_id) {
			string url = $"https://addons.mozilla.org/api/v3/addons/addon/{addon_id}?lang={WebUtility.UrlEncode(Language)}";
			using (var response = await CreateRequest(url).GetResponseAsync()) {
				using (var sr = new StreamReader(response.GetResponseStream())) {
					return JsonConvert.DeserializeObject<Addon>(await sr.ReadToEndAsync());
				}
			}
		}

		public async Task<PagedResult<Version>> GetVersions(string addon_id, int page = 1, int page_size = 25) {
			string url = $"https://addons.mozilla.org/api/v3/addons/addon/{addon_id}/versions?page={page}&page_size={page_size}&lang={WebUtility.UrlEncode(Language)}";
			using (var response = await CreateRequest(url).GetResponseAsync()) {
				using (var sr = new StreamReader(response.GetResponseStream())) {
					return JsonConvert.DeserializeObject<PagedResult<Version>>(await sr.ReadToEndAsync());
				}
			}
		}

		public async Task<PagedResult<Addon>> Search(string q, string sort = null, int page = 1, int page_size = 25) {
			string url = $"https://addons.mozilla.org/api/v3/addons/search?page={page}&page_size={page_size}&q={WebUtility.UrlEncode(q)}&lang={WebUtility.UrlEncode(Language)}";
			if (sort != null) url += "&sort=" + WebUtility.UrlEncode(sort);
			using (var response = await CreateRequest(url).GetResponseAsync()) {
				using (var sr = new StreamReader(response.GetResponseStream())) {
					return JsonConvert.DeserializeObject<PagedResult<Addon>>(await sr.ReadToEndAsync());
				}
			}
		}
	}
}
