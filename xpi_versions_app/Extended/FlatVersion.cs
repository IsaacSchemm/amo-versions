using Microsoft.WindowsAzure.Storage.Blob;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using xpi_versions_app.AMO;

namespace xpi_versions_app.Extended {
	public class FlatVersion {
		public Addon Addon { get; private set; }
		public Version Version { get; private set; }
		public File File { get; private set; }
		public ExtendedFileInfo ExtendedFileInfo { get; private set; }

		public string InstallUrl => File.url;
		public string DownloadUrl => Regex.Replace(InstallUrl, "downloads/file/([0-9]+)", "downloads/file/$1/type:attachment");

		public IEnumerable<string> CompatibilityDisplay() {
			// Get compatibility information for Mozilla-related applications from AMO.
			// An add-on won't be listed unless it has at least one of these.
			var applications_by_name = new Dictionary<string, string> {
                ["firefox"] = "Firefox",
                ["android"] = "Firefox for Android",
                ["thunderbird"] = "Thunderbird",
                ["seamonkey"] = "SeaMonkey"
            };

			foreach (var pair in applications_by_name) {
				if (Version.compatibility.TryGetValue(pair.Key, out VersionTarget minmax)) {
					yield return $"{pair.Value} {minmax.min} - {minmax.max}";
				}
			}

			// Other applications might be listed in the install.rdf.
            var applications_by_guid = new Dictionary<string, string> {
				["{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}"] = "Pale Moon",
				["toolkit@mozilla.org"] = "Toolkit"
            };

			foreach (var pair in applications_by_guid) {
				if (ExtendedFileInfo.targets.TryGetValue(pair.Key, out ExtendedFileInfoTarget minmax)) {
					yield return $"{pair.Value} {minmax.min} - {minmax.max}";
				}
			}
		}

		private FlatVersion() { }

		public static async Task<FlatVersion> GetAsync(Addon addon, Version version, string platform, CloudBlobClient blobClient = null) {
			var file = version.files.Where(f => f.platform == platform).FirstOrDefault()
				?? version.files.Where(f => f.platform == "all").FirstOrDefault()
				?? version.files.First();
			var extendedFileInfo = file.is_webextension
				? new ExtendedFileInfo {
					// We already know what these fields will be
					bootstrapped = false,
					has_webextension = true,
					id = file.id,
					is_strict_compatibility_enabled = false,
					jetpack = false,
					targets = new Dictionary<string, ExtendedFileInfoTarget>()
				}
				: await Core.GetInformation(file, blobClient);
			return new FlatVersion {
				Addon = addon,
				ExtendedFileInfo = extendedFileInfo,
				File = file,
				Version = version
			};
		}
	}
}
