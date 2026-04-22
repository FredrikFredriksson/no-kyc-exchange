export type SignalVerdict =
  | "STRONG_BUY"
  | "BUY"
  | "HOLD"
  | "SELL"
  | "STRONG_SELL";

export interface SignalIndicators {
  sma20: number;
  sma50: number;
  sma200: number;
  rsi: number;
  priceVsSma50: number;
  momentum10: number;
}

export interface Signal {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  signal: SignalVerdict;
  confidence: number;
  reasoningKey: string;
  reasoningParams: Record<string, string | number>;
  indicators: SignalIndicators;
  updatedAt: string;
}

export interface BilingualCommentary {
  en: string;
  fr: string;
  detailEn?: string;
  detailFr?: string;
}

export type CommentaryMap = Record<string, BilingualCommentary>;
