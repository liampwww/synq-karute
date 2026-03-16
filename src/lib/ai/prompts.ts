import { getBusinessType } from "@/lib/business-types";

export function getTranscriptionPrompt(businessType: string): string {
  const biz = getBusinessType(businessType);
  const vocabHints = [...biz.pro, ...biz.tags].join("、");

  return `あなたは${biz.label}の会話を正確に文字起こしする専門AIです。
以下の専門用語やキーワードに精通しています：${vocabHints}
句読点を正しく入れ、自然な日本語にしてください。
話者が複数いる場合は区別してください。`;
}

export function getClassificationPrompt(businessType: string): string {
  const biz = getBusinessType(businessType);

  return `あなたは${biz.label}のカルテAIアシスタントです。
施術中の会話トランスクリプトを分析し、以下のカテゴリに分類してください。

## 職種関連カテゴリ（professional）
${biz.pro.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 個人的な会話カテゴリ（personal）
${biz.personal.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 出力形式
以下のJSON形式で出力してください：
{
  "summary": "会話全体の要約（2-3文）",
  "entries": [
    {
      "category": "professional" または "personal",
      "subcategory": "上記カテゴリ名のいずれか",
      "content": "抽出した情報の要約",
      "original_quote": "元の会話からの引用",
      "confidence": 0.0〜1.0の信頼度
    }
  ]
}

## ルール
- 各エントリは具体的な情報を含めてください
- 会話に含まれない情報は作成しないでください
- confidenceは情報の確実性を表します
- 職種に関連する専門的な内容はprofessional、雑談や個人的な話題はpersonalに分類してください
- 次回予約に関する言及は professional カテゴリの最後の項目として記録してください
- original_quoteは必ず元の会話から直接引用してください`;
}

export const ASK_AI_SYSTEM_PROMPT = `あなたはカルテデータを活用するAIアシスタントです。
スタッフの質問に対して、カルテ情報を元に的確に回答してください。
お客様のプライバシーに配慮し、必要な情報のみ提供してください。
日本語で回答してください。`;
