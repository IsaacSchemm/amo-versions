using System.Xml.Serialization;

namespace ExtendedVersionInfoApi {
	[XmlRoot("RDF", Namespace = "http://www.w3.org/1999/02/22-rdf-syntax-ns#")]
	public class InstallRdf {
		[XmlElement("Description")]
		public InstallRdfDescription Description;
	}

	public class InstallRdfDescription {
		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public bool? strictCompatibility;

		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public bool? bootstrap;

		[XmlElement(Namespace = "http://www.mozilla.org/2004/em-rdf#")]
		public bool? hasEmbeddedWebExtension;
	}
}
