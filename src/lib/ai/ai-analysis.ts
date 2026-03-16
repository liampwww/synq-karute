/**
 * AI Learning Engine — prompt builders for pattern extraction, coaching, and pre-session briefs.
 * All prompts output Japanese. Used with GPT-4o (JSON mode) or Gemini.
 */

import { getBusinessType } from "@/lib/business-types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TranscriptEntry {
  category: string;
  subcategory: string;
  content: string;
  original_quote?: string;
  confidence?: number;
}

export interface Transcript {
  summary: string;
  entries: TranscriptEntry[];
  date?: string;
  sessionId?: string;
}

export type PatternType =
  | "opening_style"
  | "topic_sequence"
  | "close_technique"
  | "listening_ratio"
  | "personal_engagement"
  | "upsell_approach";

export interface ExtractedPatterns {
  opening_style?: { description: string; examples: string[] };
  topic_sequence?: { description: string; typical_order: string[] };
  close_technique?: { description: string; examples: string[] };
  listening_ratio?: { staff_percent: number; customer_percent: number; notes: string };
  personal_engagement?: { depth: string; topics_covered: string[]; notes: string };
  upsell_approach?: { description: string; timing: string; examples: string[] };
}

export interface StaffPatterns {
  topPerformer: ExtractedPatterns;
  underperformer: ExtractedPatterns;
  salesData?: { topRevenue: number; underRevenue: number };
}

export interface PreSessionBriefInput {
  customerHistory: { summary: string; date: string; topics?: string[] }[];
  staffPatterns?: ExtractedPatterns;
  topPerformerPatterns?: ExtractedPatterns;
  industryLabel: string;
}

// -----------------------------------------------------------------------------
// 1. Pattern Extraction Prompt
// -----------------------------------------------------------------------------

/**
 * Extracts conversation patterns from multiple karute transcripts.
 * Returns structured JSON: opening_style, topic_sequence, listening_ratio, etc.
 */
export function buildPatternExtractionPrompt(
  transcripts: Transcript[],
  staffName: string,
  industryLabel: string
): string {
  const transcriptBlock = transcripts
    .map(
      (t, i) =>
        `【セッション${i + 1}】${t.date ? ` ${t.date}` : ""}\n要約: ${t.summary}\n` +
        (t.entries.length > 0
          ? `抽出項目:\n${t.entries.map((e) => `- ${e.subcategory}: ${e.content}`).join("\n")}`
          : "")
    )
    .join("\n\n");

  return `あなたは${industryLabel}の接客・セールス分析の専門AIです。
スタッフ「${staffName}」の複数セッションのカルテデータを分析し、会話パターンを抽出してください。

## 分析対象のセッション
${transcriptBlock}

## 抽出するパターン（以下のJSON形式で出力）
{
  "opening_style": {
    "description": "何から話し始めるか（挨拶、前回の振り返り、雑談など）の傾向",
    "examples": ["具体例1", "具体例2"]
  },
  "topic_sequence": {
    "description": "話題の進め方の傾向",
    "typical_order": ["1番目に触れる話題", "2番目", "3番目", "..."]
  },
  "close_technique": {
    "description": "パッケージ・次回予約の提案の仕方",
    "examples": ["具体例1", "具体例2"]
  },
  "listening_ratio": {
    "staff_percent": 0,
    "customer_percent": 0,
    "notes": "会話の聞く/話す割合の傾向（推定）"
  },
  "personal_engagement": {
    "depth": "個人的な話題への踏み込み度（浅い/普通/深い）",
    "topics_covered": ["触れている個人的な話題"],
    "notes": "補足"
  },
  "upsell_approach": {
    "description": "アップセル・パッケージ提案のアプローチ",
    "timing": "いつ提案しているか（施術中/施術後など）",
    "examples": ["具体例"]
  }
}

## ルール
- データから読み取れる事実のみを記述してください
- 推測が必要な場合は「推定」「傾向として」と明記
- データが不足している項目は null にしてください
- 日本語で出力
- 必ず有効なJSONのみを返してください（説明文は不要）`;
}

// -----------------------------------------------------------------------------
// 2. Coaching Prompt
// -----------------------------------------------------------------------------

/**
 * Generates specific, actionable Japanese coaching advice by comparing
 * top performer patterns vs underperformer patterns.
 */
export function buildCoachingPrompt(
  topPerformerPatterns: ExtractedPatterns,
  underperformerPatterns: ExtractedPatterns,
  options?: {
    salesData?: { topRevenue: number; underRevenue: number };
    industryLabel?: string;
    metric?: "sales" | "retention" | "satisfaction";
  }
): string {
  const industry = options?.industryLabel ?? "サロン";
  const metric = options?.metric ?? "sales";
  const metricLabel =
    metric === "sales"
      ? "売上・パッケージ成約"
      : metric === "retention"
        ? "リピート率"
        : "顧客満足度";

  const topJson = JSON.stringify(topPerformerPatterns, null, 2);
  const underJson = JSON.stringify(underperformerPatterns, null, 2);

  let salesBlock = "";
  if (options?.salesData) {
    salesBlock = `
## 売上データ（参考）
- トップパフォーマー: ${options.salesData.topRevenue}円/月
- 対象スタッフ: ${options.salesData.underRevenue}円/月
`;
  }

  return `あなたは${industry}の接客・セールスコーチです。
トップパフォーマーと対象スタッフの会話パターンを比較し、具体的なコーチングアドバイスを生成してください。

## トップパフォーマーのパターン
${topJson}

## 対象スタッフ（改善対象）のパターン
${underJson}
${salesBlock}

## 比較の観点
${metricLabel}を高めるために、トップパフォーマーがやっていて対象スタッフがやっていないことを特定してください。

## 出力形式（以下のJSON形式で出力）
{
  "what_to_start": [
    "始めるべきこと1（具体的に、日本語で）",
    "始めるべきこと2"
  ],
  "what_to_stop": [
    "やめるべきこと1",
    "やめるべきこと2"
  ],
  "specific_advice": "2-3文の具体的なアドバイス（日本語）",
  "conversation_example": "トップパフォーマーのような言い回しの具体例（日本語、1-2文）"
}

## ルール
- アドバイスは具体的で実践可能に
- 批判的ではなく、改善志向のトーンで
- 日本語で出力
- 必ず有効なJSONのみを返してください`;
}

// -----------------------------------------------------------------------------
// 3. Pre-Session Brief Prompt
// -----------------------------------------------------------------------------

/**
 * Generates a pre-session brief for an upcoming appointment.
 * Includes talking points, customer context, recommended approach, upsell opportunities.
 */
export function buildPreSessionBriefPrompt(input: PreSessionBriefInput): string {
  const { customerHistory, staffPatterns, topPerformerPatterns, industryLabel } =
    input;

  const historyBlock =
    customerHistory.length > 0
      ? customerHistory
          .map(
            (h) =>
              `- ${h.date}: ${h.summary}` +
              (h.topics?.length ? ` [話題: ${h.topics.join(", ")}]` : "")
          )
          .join("\n")
      : "（過去のカルテなし）";

  let staffBlock = "";
  if (staffPatterns) {
    staffBlock = `
## 担当スタッフの傾向（参考）
${JSON.stringify(staffPatterns, null, 2)}
`;
  }

  let topBlock = "";
  if (topPerformerPatterns) {
    topBlock = `
## トップパフォーマーの成功パターン（参考）
${JSON.stringify(topPerformerPatterns, null, 2)}
`;
  }

  return `あなたは${industryLabel}の施術前ブリーフを生成するAIです。
担当スタッフが次回施術前に確認すべきポイントをまとめてください。

## 顧客の過去カルテ履歴
${historyBlock}
${staffBlock}
${topBlock}

## 出力形式（以下のJSON形式で出力）
{
  "talking_points": [
    "話すべきポイント1（顧客履歴に基づく）",
    "話すべきポイント2",
    "話すべきポイント3"
  ],
  "customer_history_summary": "顧客の傾向・継続的な課題を2-3文で要約",
  "recommended_approach": "今回の施術で推奨する接客アプローチ（2-3文）",
  "upsell_opportunities": [
    "アップセル・パッケージ提案の機会1",
    "機会2"
  ],
  "things_to_avoid": [
    "避けるべきこと1（過去の会話から）",
    "避けるべきこと2"
  ]
}

## ルール
- 顧客履歴から読み取れる事実に基づいて
- 具体的で実践可能な内容に
- 3-5個のtalking_points
- 日本語で出力
- 必ず有効なJSONのみを返してください`;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Resolves industry label from business type key for prompts.
 */
export function getIndustryLabelForPrompt(businessType: string): string {
  try {
    return getBusinessType(businessType).label;
  } catch {
    return "サロン";
  }
}
