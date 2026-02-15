import NotesTool from "@/components/tool/NotesTool";
import YoutubeVideoTool from "@/components/tool/YoutubeVideoTool";
import DiagramsTool from "@/components/tool/DiagramsTool";
import ImageFilterTool from "@/components/tool/ImageFilterTool";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const tool = (await params).tool;
  let title = "Cognitive Tool | CognitoX";
  
  if (tool === "notes-tool") title = "Notes OCR Workspace | CognitoX";
  else if (tool === "youtube-video-tool") title = "YouTube Media Analyzer | CognitoX";
  else if (tool === "diagrams-tool") title = "Diagrams Design Studio | CognitoX";
  else if (tool === "image-filter-tool") title = "Image Filter Studio | CognitoX";

  return { title };
}

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
