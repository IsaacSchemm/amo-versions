using System.Collections.Generic;
using System.Xml.Serialization;

namespace ExtendedVersionInfoApi {
	public class DescriptionTag<T> where T : class {
		[XmlElement("Description", Namespace = "http://www.w3.org/1999/02/22-rdf-syntax-ns#")]
		public T Description1;

		[XmlElement("Description", Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public T Description2;

		public T Description => Description1 ?? Description2;
	}

	[XmlRoot("RDF", Namespace = "http://www.w3.org/1999/02/22-rdf-syntax-ns#")]
	public class InstallRdf : DescriptionTag<InstallRdfDescription> { }

	public class InstallRdfDescription {
		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public bool? strictCompatibility;

		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public bool? bootstrap;

		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public bool? hasEmbeddedWebExtension;

		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public InstallRdfTargetApplication[] targetApplication;
	}

	public class InstallRdfTargetApplication : DescriptionTag<InstallRdfTargetApplicationDescription> { }

	public class InstallRdfTargetApplicationDescription {
		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public string id;

		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public string minVersion;

		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public string maxVersion;
	}
}
