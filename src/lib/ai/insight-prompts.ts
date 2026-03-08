import { getBusinessType } from "@/lib/business-types";

export function getInsightPrompt(
  customerSummary: string,
  businessType: string,
  timelineEvents: string
): string {
  const biz = getBusinessType(businessType);

  return `あなたは${biz.label}のAI顧客インテリジェンスアシスタントです。

以下の顧客データを分析し、スタッフが次に取るべきアクションを提案してください。

## 顧客情報
${customerSummary}

## タイムライン（直近の来店・施術履歴）
${timelineEvents}

## 出力形式
以下のJSON配列で出力してください：
[
  {
    "insight_type": "next_treatment" | "follow_up" | "reactivation" | "churn_risk" | "unresolved_issue" | "talking_point" | "upsell" | "photo_request" | "plan_incomplete" | "high_value",
    "title": "短いタイトル（20文字以内）",
    "description": "具体的なアクション提案（2-3文）",
    "priority_score": 0.0-1.0,
    "action_data": {
      "suggested_action": "具体的にすべきこと",
      "evidence": "この提案の根拠となるデータ"
    }
  }
]

## ルール
- 各提案は具体的で実行可能であること
- データに基づかない推測はしないこと
- 最大5件まで、優先度順に出力すること
- priority_scoreは緊急度と重要度の組み合わせ
- データが不十分な場合は無理に提案せず、少ない件数で良い
- JSON配列のみを出力し、余計なテキストは含めないこと`;
}

export function getTimelineSummaryPrompt(
  businessType: string,
  timelineEvents: string,
  customerName: string
): string {
  const biz = getBusinessType(businessType);

  return `あなたは${biz.label}のAI顧客分析アシスタントです。

以下の「${customerName}」さんのタイムラインデータから、スタッフが一目で把握できる顧客サマリーを生成してください。

## タイムラインデータ
${timelineEvents}

## 出力形式（日本語で）
以下の形式で簡潔にまとめてください：

${customerName}さん -- 来店歴 X年Xヶ月 / 合計来店 X回

初回来店: YYYY年M月 -- 施術内容
直近来店: YYYY年M月 -- 施術内容

傾向:
- （来店頻度パターン）
- （よく利用するメニュー）
- （繰り返しの相談や要望）

注目:
- （直近の重要な発言や要望）
- （ライフイベントの変化）
- （新しい関心事）

## ルール
- データに基づかない推測はしない
- 存在するデータのみで構成する
- 日付の計算は正確に行う
- スタッフが実務で使いやすい内容にする`;
}
