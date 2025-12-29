"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { useUser } from "@/lib/user";
import { getBackendBaseUrl } from "@/lib/backend";

type Message = {
  id: string;
  role: "bot" | "user";
  text: string;
};

const quickReplies = [
  "次は何をすればいい？",
  "りんごの確率について教えて",
  "スクショはどう撮ればいい？",
];

const initialPromptByStatus: Record<string, string> = {
  guest:
    "こんにちは♪ りんご会♪のりんごちゃんです。ログインすると、今のステップに合わせたご案内ができます。まずは新規登録からどうぞ！",
  registered: "利用規約ページに進んで、規約への同意をお願いしますね。",
  terms_agreed: "次は使い方ページで全体の流れをチェックしましょう。",
  tutorial_completed: "誰かの欲しいものリストが割り当てられるまで少し待ってね。購入したらスクショをアップロードして！",
  ready_to_purchase: "割り当てられたリストの商品の注文をお願いね。忘れずにスクショも撮ってね。",
  verifying: "スクリーンショットを確認しています。承認されたら欲しいものリストを登録できますよ。",
  first_purchase_completed: "あなたのAmazon欲しいものリストを登録して、抽選の準備をしちゃいましょう。",
  ready_to_draw: "りんご抽選ページへ進んで、ワクワクの10分を楽しんでね！",
  active: "今はマイページでチケットの状況を確認したり、友達紹介に挑戦してみてね。",
};

const fallbackAnswer = (status: string) =>
  status in initialPromptByStatus
    ? initialPromptByStatus[status]
    : "順番どおりに進むことが大事だよ。困ったらサポートまで連絡してね。";

export function Chatbot() {
  const { user } = useUser();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStatus = user?.status ?? "guest";
  const backendBase = getBackendBaseUrl();
  const chatbotEndpoint = backendBase ? `${backendBase}/api/chatbot` : "/api/chatbot";

  const greeting = useMemo(() => initialPromptByStatus[currentStatus] ?? initialPromptByStatus.guest, [currentStatus]);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "bot",
        text: greeting,
      },
    ]);
  }, [greeting]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    panelRef.current.scrollTop = panelRef.current.scrollHeight;
  }, [isOpen, messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);

    try {
      setSending(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (user?.id) {
        headers["X-User-Id"] = user.id;
      }

      const res = await fetch(chatbotEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text,
          status: currentStatus,
          userEmail: user?.email,
        }),
      });

      if (!res.ok) {
        throw new Error("チャットAPIが応答しませんでした。");
      }

      const data = (await res.json()) as { reply?: string };
      const reply = data.reply?.trim() || fallbackAnswer(currentStatus);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: reply,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          text: `${fallbackAnswer(currentStatus)} (API未接続のため定型文で回答しています)`,
        },
      ]);
      setError("現在チャットサーバーに接続できないため、定型メッセージでご案内しています。");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  const handleQuickReply = (reply: string) => {
    setInput(reply);
    sendMessage(reply);
    setOpen(true);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="pointer-events-auto w-80 rounded-3xl border border-ringo-purple/30 bg-white/95 p-4 shadow-2xl shadow-ringo-purple/30">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/images/icons/ringo_chan_chatbot_icon_128.png" alt="りんごちゃん" width={48} height={48} />
              <div>
                <p className="font-logo text-lg font-bold">りんごちゃん</p>
                <p className="text-xs text-ringo-ink/60">いつでも質問してね</p>
              </div>
            </div>
            <button
              className="rounded-full bg-ringo-bg px-2 py-1 text-sm text-ringo-ink/70 hover:text-ringo-red"
              onClick={() => setOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <div ref={panelRef} className="mb-3 max-h-72 space-y-3 overflow-y-auto text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-2xl px-3 py-2 ${
                  msg.role === "bot"
                    ? "bg-ringo-purple/20 text-ringo-ink"
                    : "ml-auto bg-ringo-rose/70 text-ringo-ink border border-ringo-rose/40"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {error && <p className="mb-2 text-xs text-ringo-red">{error}</p>}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="flex-1 rounded-2xl border border-ringo-purple/30 bg-ringo-bg/60 px-3 py-2 text-sm outline-none focus:border-ringo-pink"
              placeholder="質問を入力"
              disabled={isSending}
            />
            <button
              type="submit"
              className="rounded-2xl bg-ringo-rose px-4 py-2 text-sm font-semibold text-ringo-ink disabled:opacity-60"
              disabled={isSending}
            >
              送信
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                className="rounded-full border border-ringo-purple/30 px-3 py-1 text-ringo-ink/70 hover:border-ringo-pink hover:text-ringo-pink"
                onClick={() => handleQuickReply(reply)}
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="pointer-events-auto flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ringo-ink shadow-lg shadow-ringo-purple/40"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Image src="/images/icons/ringo_chan_chatbot_icon_64.png" alt="りんごちゃん" width={40} height={40} />
        {isOpen ? "閉じる" : "りんごちゃん"}
      </button>
    </div>
  );
}
