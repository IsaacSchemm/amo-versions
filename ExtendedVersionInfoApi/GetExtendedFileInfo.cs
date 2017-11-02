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
	public static class GetExtendedFileInfo {
		private static HttpResponseMessage Serialize(object o) {
			return new HttpResponseMessage {
				Content = new StringContent(JsonConvert.SerializeObject(o), Encoding.UTF8, "application/json"),
				StatusCode = HttpStatusCode.OK
			};
		}

		private static async Task<HttpResponseMessage> PassThrough(HttpWebResponse r) {
			using (var sr = new StreamReader(r.GetResponseStream())) {
				return new HttpResponseMessage {
					Content = new StringContent(await sr.ReadToEndAsync(), Encoding.UTF8, r.ContentType),
					StatusCode = r.StatusCode
				};
			}
		}

		[FunctionName(nameof(ByVersion))]
		public static async Task<HttpResponseMessage> ByVersion([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "addon/{addon_id}/versions/{version_id}")]HttpRequestMessage req, string addon_id, int version_id) {
			try {
				var version = await Core.GetVersion(addon_id, version_id);
				var extendedFiles = await Task.WhenAll(version.files.Select(f => Core.GetInformation(f)));
				return Serialize(new {
					files = extendedFiles
				});
			} catch (WebException e) when (e.Response is HttpWebResponse r) {
				return await PassThrough(r);
			}
		}

		[FunctionName(nameof(ByFile))]
		public static async Task<HttpResponseMessage> ByFile([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "addon/{addon_id}/versions/{version_id}/files/{file_id}")]HttpRequestMessage req, string addon_id, int version_id, int file_id) {
			try {
				var version = await Core.GetVersion(addon_id, version_id);
				var file = version.files.FirstOrDefault(f => f.id == file_id);
				if (file == null) return new HttpResponseMessage(HttpStatusCode.NotFound);

				var extendedFile = await Core.GetInformation(file);
				return Serialize(extendedFile);
			} catch (WebException e) when (e.Response is HttpWebResponse r) {
				return await PassThrough(r);
			}
		}
	}
}
