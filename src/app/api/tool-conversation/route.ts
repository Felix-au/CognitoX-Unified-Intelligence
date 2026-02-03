import { POST as createConversation } from "../conversation/route";

export async function POST(request: Request) {
  return createConversation(request);
}
