import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID format"),
  content: z.string().min(1, "Message content cannot be empty"),
});

export const getMessagesSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID format"),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().uuid("Invalid message ID format"),
});

export const sendToolMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID format"),
  content: z.string().min(1, "Prompt cannot be empty"),
  history: z.array(z.any()).optional().default([]),
});

export const createConversationSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(100).optional(),
  variant: z.enum(["chat", "notes_tool", "youtube_tool", "diagram_tool", "image_filter_tool"]),
});
