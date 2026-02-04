import NotesTool from "@/components/tool/NotesTool";
import YoutubeVideoTool from "@/components/tool/YoutubeVideoTool";
import DiagramsTool from "@/components/tool/DiagramsTool";
import ImageFilterTool from "@/components/tool/ImageFilterTool";

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const tool = (await params).tool;

  switch (tool) {
    case "notes-tool":
      return <NotesTool />;
    case "youtube-video-tool":
      return <YoutubeVideoTool />;
    case "diagrams-tool":
      return <DiagramsTool />;
    case "image-filter-tool":
      return <ImageFilterTool />;
    default:
      return (
        <div style={{ padding: "40px", color: "#6b7280" }}>
          <h3>Tool Not Found</h3>
          <p>The requested cognitive workspace tool does not exist.</p>
        </div>
      );
  }
}
