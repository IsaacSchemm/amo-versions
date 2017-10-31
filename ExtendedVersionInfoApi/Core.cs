using Newtonsoft.Json;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Threading.Tasks;
using System.Xml.Serialization;

namespace ExtendedVersionInfoApi {
	public static class Core {
		private static Dictionary<int, ExtendedVersionInfo> cache = new Dictionary<int, ExtendedVersionInfo>();

		public static HttpWebRequest CreateRequest(string url) {
			var request = WebRequest.CreateHttp(url);
			request.UserAgent = "ExtendedVersionInfoApi/1.0 (https://github.com/IsaacSchemm/amo-versions)";
			request.Accept = "application/json";
			return request;
		}

		public static async Task<AmoVersion> GetVersion(string addon_id, string version_id) {
			string url = $"https://addons.mozilla.org/api/v3/addons/addon/{addon_id}/versions/{version_id}";
			using (var response = await Core.CreateRequest(url).GetResponseAsync()) {
				using (var sr = new StreamReader(response.GetResponseStream())) {
					return JsonConvert.DeserializeObject<AmoVersion>(await sr.ReadToEndAsync());
				}
			}
		}

		public static async Task<ExtendedVersionInfo> GetInformation(int version_id, AmoFile file) {
			if (cache.TryGetValue(file.id, out ExtendedVersionInfo cached)) {
				return cached;
			}

			var obj = new ExtendedVersionInfo {
				version_id = version_id,
				file_id = file.id
			};

			if (file.is_webextension) {
				obj.has_webextension = true;
			} else {
				using (var ms = new MemoryStream()) {
					using (var response = await CreateRequest(file.url).GetResponseAsync()) {
						using (var s = response.GetResponseStream()) {
							await s.CopyToAsync(ms);
						}
					}

					ms.Position = 0;

					using (var zip = new ZipArchive(ms, ZipArchiveMode.Read)) {
						var entry = zip.GetEntry("install.rdf");
						if (entry != null) {
							using (var stream = entry.Open()) {
								var serializer = new XmlSerializer(typeof(InstallRdf));
								var installRdf = serializer.Deserialize(stream) as InstallRdf;
								obj.bootstrapped = installRdf?.Description?.bootstrap ?? false;
								obj.has_webextension = installRdf?.Description?.hasEmbeddedWebExtension ?? false;
								obj.is_strict_compatibility_enabled = installRdf?.Description?.strictCompatibility ?? false;
							}
						}
						obj.jetpack = zip.GetEntry("harness-options.json") != null
							|| zip.GetEntry("package.json") != null;
					}
				}
			}

			cache[file.id] = obj;

			return obj;
		}
	}
}
