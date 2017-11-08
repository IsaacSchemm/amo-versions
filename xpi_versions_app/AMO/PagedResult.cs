using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace xpi_versions_app.AMO {
    public class PagedResult<T> where T : class {
		public int count;
		public IEnumerable<T> results;
    }
}
