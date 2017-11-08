using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace xpi_versions_app.AMO {
    public class Version {
		public class MinMax {
			public string min;
			public string max;
		}

		public int id;
		public Dictionary<string, MinMax> compatibility;
		public IEnumerable<File> files;
		public bool is_strict_compatibility_enabled;
		public License license;
		public string release_notes;
		public string url;
		public string version;
	}
}
