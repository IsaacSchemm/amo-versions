using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Newtonsoft.Json;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace ExtendedVersionInfoApi {
	public static class GetExtendedVersionInfo {

		[FunctionName("GetExtendedVersionInfo")]
		public static async Task<HttpResponseMessage> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "addon/{addon_id}/versions/{version_id}")]HttpRequestMessage req, string addon_id, string version_id) {
			try {
				var version = await Core.GetVersion(addon_id, version_id);

				var extendedFiles = await Task.WhenAll(version.files.Select(f => Core.GetInformation(version.id, f)));

				return new HttpResponseMessage {
					Content = new StringContent(JsonConvert.SerializeObject(extendedFiles), Encoding.UTF8, "application/json"),
					StatusCode = HttpStatusCode.OK
				};
			} catch (WebException e) when (e.Response is HttpWebResponse r) {
				// Error message pass-through
				using (var sr = new StreamReader(r.GetResponseStream())) {
					return new HttpResponseMessage {
						Content = new StringContent(await sr.ReadToEndAsync(), Encoding.UTF8, r.ContentType),
						StatusCode = r.StatusCode
					};
				}
			}
		}
	}
}
