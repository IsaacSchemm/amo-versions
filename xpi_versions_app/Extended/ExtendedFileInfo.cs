using System.Collections.Generic;

namespace xpi_versions_app.Extended {
	public class ExtendedFileInfo {
		public int id;
		public bool bootstrapped;
		public bool jetpack;
		public bool has_webextension;
		public bool is_strict_compatibility_enabled;
		public Dictionary<string, ExtendedFileInfoTarget> targets;
	}

	public class ExtendedFileInfoTarget {
		public string min;
		public string max;
	}
}
