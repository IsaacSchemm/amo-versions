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

		public string Target { get; private set; }
		public string AppVersion { get; private set; }

		public string AppName => Target == "seamonkey" ? "SeaMonkey"
			: Target == "palemoon" ? "Pale Moon"
				: Target == "thunderbird" ? "Thunderbird"
					: Target == "firefox" ? "Firefox"
						: "Browser";

		public string InstallUrl => File.url;
		public string DownloadUrl => Regex.Replace(InstallUrl, "downloads/file/([0-9]+)", "downloads/file/$1/type:attachment");

		public System.DateTime Released => System.DateTime.Parse(File.created);
		public string ReleasedStr => Released.ToLongDateString();

		public IEnumerable<string> CompatibilityStrs() {
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
		
		public bool IsAppCompatible() {
			if (Addon.type == "dictionary") return true;
			if (Addon.type == "persona") return true;
			if (Addon.type == "search") return true;
			
			switch (Target) {
				case "palemoon":
					if (File.is_webextension) return false; // No WebExtensions support
					
					if (ExtendedFileInfo.targets.TryGetValue("{8de7fcbb-c55c-4fbe-bfc5-fc555c87dbc4}", out var rdf_compat)) {
						// This add-on supports Pale Moon specifically
						if (!checkMinVersion(rdf_compat.min)) return false; // Only supports newer versions
						if (ExtendedFileInfo.is_strict_compatibility_enabled) {
							if (!checkMaxVersion(rdf_compat.max)) return false; // Only supports older versions
						}
						return true;
					} else {
						// To the best of my knowledge, Pale Moon will only install jetpack
						// (PMKit) add-ons if they're targeted to Pale Moon specifically.
						if (ExtendedFileInfo.jetpack) return false;
						// Some hybrid add-ons might work without the WebExtensions part (NoScript?),
						// but if Pale Moon isn't listed in install.rdf, assume it won't work
						if (ExtendedFileInfo.has_webextension) return false;
					}

					// No support for Pale Moon, check Firefox
					return this.Version.compatibility["firefox"] != null && !this.File.is_webextension;
				case "seamonkey":
				case "thunderbird":
					if (!Version.compatibility.TryGetValue(Target, out var amo_compat1)) return false; // Not compatible
					if (!checkMinVersion(amo_compat1.min)) return false; // Only supports newer versions
					if (Addon.type == "language") {
						if (!checkMaxVersion(amo_compat1.max)) return false; // Only supports older versions
					}
					if (File.is_webextension) return false; // No WebExtensions support
					if (ExtendedFileInfo.is_strict_compatibility_enabled) {
						if (!checkMaxVersion(amo_compat1.max)) return false; // Only supports older versions
					}
					return true;
				case "firefox":
				case "android":
					if (!Version.compatibility.TryGetValue(Target, out var amo_compat2)) return false; // Not compatible
					if (!checkMinVersion(amo_compat2.min)) return false; // Only supports newer versions
					if (Addon.type == "language" || Version.is_strict_compatibility_enabled) {
						if (!checkMaxVersion(amo_compat2.max)) return false; // Only supports older versions (includes legacy add-ons in Fx 57+)
					}
					return true;
				default:
					return true;
			}
		}

		private bool checkMinVersion(string min) {
			string[] addonMinVersion = min.Split('.');

			string[] myVersion = AppVersion.Split('.');

			for (int i = 0; i < addonMinVersion.Length; i++) {
				double theirMin = addonMinVersion[i] == "*"
					? 0
					: int.Parse(addonMinVersion[i]);
				double mine = myVersion.Length > i
					? int.Parse(myVersion[i])
					: 0;
				if (theirMin < mine) {
					return true;
				} else if (theirMin > mine) {
					return false;
				}
			}
			return true;
		}

		private bool checkMaxVersion(string max) {
			string[] addonMaxVersion = max.Split('.');

			string[] myVersion = AppVersion.Split('.');

			for (int i = 0; i < addonMaxVersion.Length; i++) {
				double theirMax = addonMaxVersion[i] == "*"
					? double.PositiveInfinity
					: int.Parse(addonMaxVersion[i]);
				double mine = myVersion.Length > i
					? int.Parse(myVersion[i])
					: 0;
				if (theirMax > mine) {
					return true;
				} else if (theirMax < mine) {
					return false;
				}
			}
			return true;
		}

		private FlatVersion() { }
		
		private static Regex[] VersionExpressions = new[] {
			new Regex(@"SeaMonkey/([0-9\.]+)"),
			new Regex(@"PaleMoon/([0-9\.]+)"),
			// Firefox (desktop and Android) and Thunderbird use the same version number as Gecko
			new Regex(@"rv:([0-9\.]+)")
		};

		public static async Task<FlatVersion> GetAsync(Addon addon, Version version, string ua) {
			string platform = ua.Contains("Windows") ? "windows"
				: ua.Contains("Mac") ? "mac"
				: ua.Contains("Linux") || ua.Contains("BSD") ? "linux"
				: ua.Contains("Android") ? "android"
				: "";
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
				: await Core.GetInformation(file);
			return new FlatVersion {
				Addon = addon,
				ExtendedFileInfo = extendedFileInfo,
				File = file,
				Version = version,
				Target = ua.Contains("SeaMonkey") ? "seamonkey"
					: ua.Contains("PaleMoon") ? "palemoon"
					: ua.Contains("Goanna") ? ""
					: ua.Contains("Thunderbird") ? "thunderbird"
					: ua.Contains("Android") ? "android"
					: ua.Contains("Firefox") ? "firefox"
					: "",
				AppVersion = VersionExpressions.Select(r => {
					var match = r.Match(ua);
					return match.Success ? match.Groups[1].Value : null;
				}).Where(s => s != null).DefaultIfEmpty("0").FirstOrDefault()
			};
		}
	}
}
