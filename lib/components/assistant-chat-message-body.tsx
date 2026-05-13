import { parseAssistantChatContent } from "@/lib/utils/parse-assistant-chat-content";

type Props = {
  content: string;
  className?: string;
};

export function AssistantChatMessageBody({ content, className = "" }: Props) {
  const segments = parseAssistantChatContent(content);
  if (segments.length === 0) return null;

  return (
    <div className={`space-y-3 text-pretty ${className}`.trim()}>
      {segments.map((seg, i) => {
        const prev = segments[i - 1];
        const prevIsList =
          prev?.type === "bulletList" || prev?.type === "orderedList";
        if (seg.type === "paragraph") {
          return (
            <p
              key={i}
              className={
                prevIsList
                  ? "mb-0 mt-2 border-t border-violet-200/45 pt-3 text-[0.97em] font-medium leading-relaxed text-foreground dark:border-violet-400/30"
                  : "mb-0 last:mb-0"
              }
            >
              {seg.text}
            </p>
          );
        }
        if (seg.type === "bulletList") {
          return (
            <ul
              key={i}
              className="my-0 list-disc space-y-1.5 pl-5 marker:text-violet-600 dark:marker:text-violet-300"
            >
              {seg.items.map((item, j) => (
                <li key={j} className="pl-0.5">
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <ol
            key={i}
            className="my-0 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-violet-700 dark:marker:text-violet-300"
          >
            {seg.items.map((item, j) => (
              <li key={j} className="pl-1">
                {item}
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
