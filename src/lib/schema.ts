import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdMessage = "Invalid ID format (must be a 24-character hex string)";

export const sendMessageSchema = z.object({
  conversationId: z.string().regex(objectIdRegex, objectIdMessage),
  content: z.string().min(1, "Message content cannot be empty"),
});

export const getMessagesSchema = z.object({
  conversationId: z.string().regex(objectIdRegex, objectIdMessage),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().regex(objectIdRegex, objectIdMessage),
});

export const sendToolMessageSchema = z.object({
  conversationId: z.string().regex(objectIdRegex, objectIdMessage),
  content: z.string().min(1, "Prompt cannot be empty"),
  history: z.array(z.any()).optional().default([]),
});

export const createConversationSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(100).optional(),
  variant: z.enum(["chat", "notes_tool", "youtube_tool", "diagram_tool", "image_filter_tool"]),
});
