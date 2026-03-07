"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CornerDownLeft, Sparkles, User, X } from "lucide-react";
import { toast } from "sonner";

import type { Tables } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";
import { getCustomers } from "@/features/customers/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const messageVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export function AskAiChat() {
  const { t } = useI18n();
  const { organization, staff } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [customers, setCustomers] = useState<Tables<"customers">[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!organization) return;

    getCustomers(organization.id).then(setCustomers).catch(() => {});
  }, [organization]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (questionText: string) => {
      if (!questionText.trim() || !organization || isStreaming) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: questionText.trim(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/ask-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: questionText.trim(),
            customerId: selectedCustomerId || undefined,
            orgId: organization.id,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ?? "Request failed"
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const data = line.replace(/^data: /, "").trim();
            if (!data || data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as {
                content?: string;
                error?: string;
              };
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  )
                );
              }
            } catch (parseError) {
              if (
                parseError instanceof Error &&
                parseError.message !== "Stream error"
              ) {
                throw parseError;
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error ? error.message : t("common.error");
        toast.error(message);
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantId)
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [organization, selectedCustomerId, isStreaming, t]
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  const handleExampleClick = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage]
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const exampleQuestions = [
    t("askAi.examples.q1"),
    t("askAi.examples.q2"),
    t("askAi.examples.q3"),
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              {t("askAi.title")}
            </h1>
            {staff && (
              <p className="text-xs text-muted-foreground">{staff.name}</p>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {selectedCustomer && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedCustomerId("")}
            >
              <X className="size-3" />
            </Button>
          )}
          <Select
            value={selectedCustomerId}
            onValueChange={(val) => setSelectedCustomerId(val ?? "")}
          >
            <SelectTrigger size="sm">
              <SelectValue
                placeholder={
                  selectedCustomer
                    ? selectedCustomer.name
                    : t("common.filter")
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                {t("common.filter")}
              </SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.name_kana && (
                    <span className="ml-1 text-muted-foreground">
                      ({customer.name_kana})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12"
            >
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Bot className="size-8 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-lg font-medium">
                  {t("askAi.examples.title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("askAi.placeholder")}
                </p>
              </div>
              <div className="grid w-full max-w-lg gap-2">
                {exampleQuestions.map((question) => (
                  <motion.button
                    key={question}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleExampleClick(question)}
                    className="rounded-xl border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    {question}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4 px-1">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className={
                      message.role === "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        message.role === "user"
                          ? "flex max-w-[80%] gap-2.5"
                          : "flex max-w-[85%] gap-2.5"
                      }
                    >
                      {message.role === "assistant" && (
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Bot className="size-4 text-primary" />
                        </div>
                      )}

                      <div
                        className={
                          message.role === "user"
                            ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                            : "rounded-2xl rounded-bl-md bg-muted/60 px-4 py-2.5 text-sm"
                        }
                      >
                        {message.role === "assistant" &&
                        message.content === "" ? (
                          <ThinkingDots />
                        ) : (
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        )}
                      </div>

                      {message.role === "user" && (
                        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/10">
                          <User className="size-4 text-foreground/70" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t pt-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("askAi.placeholder")}
              disabled={isStreaming}
              className="min-h-10 max-h-32 resize-none pr-2"
              rows={1}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
          >
            <CornerDownLeft className="size-4" />
          </Button>
        </form>

        {selectedCustomer && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-center text-xs text-muted-foreground"
          >
            {selectedCustomer.name}
          </motion.p>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-foreground/40"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
