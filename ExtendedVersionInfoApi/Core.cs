using Newtonsoft.Json;
using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Runtime.Caching;
using System.Threading.Tasks;
using System.Xml.Serialization;

namespace ExtendedVersionInfoApi {
	public static class Core {
		private static MemoryCache cache = MemoryCache.Default;

		public static HttpWebRequest CreateRequest(string url) {
			var request = WebRequest.CreateHttp(url);
			request.UserAgent = "ExtendedVersionInfoApi/1.0 (https://github.com/IsaacSchemm/amo-versions)";
			request.Accept = "application/json";
			return request;
		}

		public static async Task<AmoVersion> GetVersion(string addon_id, int version_id) {
			string url = $"https://addons.mozilla.org/api/v3/addons/addon/{addon_id}/versions/{version_id}";
			using (var response = await Core.CreateRequest(url).GetResponseAsync()) {
				using (var sr = new StreamReader(response.GetResponseStream())) {
					return JsonConvert.DeserializeObject<AmoVersion>(await sr.ReadToEndAsync());
				}
			}
		}

		public static async Task<ExtendedFileInfo> GetInformation(AmoFile file) {
			if (cache[$"ExtendedFileInfo:{file.id}"] is ExtendedFileInfo cached) return cached;

			var obj = new ExtendedFileInfo {
				id = file.id
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
							string xml;
							using (var sr = new StreamReader(entry.Open())) {
								xml = await sr.ReadToEndAsync();
							}
							xml = xml.Replace("em:Description>", "Description>");
							if (xml.Contains("<RDF:Description")) {
								xml = xml
									.Replace("<Description", "<RDF:Description")
									.Replace("</Description", "</RDF:Description");
							}
							using (var sr = new StringReader(xml)) {
								var serializer = new XmlSerializer(typeof(InstallRdf));
								var installRdf = (InstallRdf)serializer.Deserialize(sr);
								if (installRdf != null) {
									obj.bootstrapped = installRdf.Description.bootstrap ?? false;
									obj.has_webextension = installRdf.Description.hasEmbeddedWebExtension ?? false;
									obj.is_strict_compatibility_enabled = installRdf.Description.strictCompatibility ?? false;
									obj.targets = installRdf.Description.targetApplication
										.Select(a => a.Description)
										.ToDictionary(d => d.id, d => new ExtendedFileInfoTarget {
											min = d.minVersion,
											max = d.maxVersion
										});
								}
							}
						}
						obj.jetpack = zip.GetEntry("harness-options.json") != null
							|| zip.GetEntry("package.json") != null;
					}
				}
			}

			try {
				cache.Add($"ExtendedFileInfo:{file.id}", obj, new CacheItemPolicy {
					Priority = CacheItemPriority.Default
				});
			} catch (NullReferenceException) { }

			return obj;
		}
	}
}
