using System.Xml.Serialization;

namespace xpi_versions_app.Extended {
	public class DescriptionTag<T> where T : class {
		[XmlElement("Description", Namespace = "http://www.w3.org/1999/02/22-rdf-syntax-ns#")]
		public T Description;
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
