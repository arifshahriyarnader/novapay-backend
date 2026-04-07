import { ApiError } from "../../utils";

const MOCK_RATES: Record<string, Record<string, number>> = {
  USD: { EUR: 0.92, BDT: 110.45, USD: 1 },
  EUR: { USD: 1.09, BDT: 120.15, EUR: 1 },
  BDT: { USD: 0.0091, EUR: 0.0083, BDT: 1 },
};

const isFxProviderAvailable = (): boolean => {
  return process.env.FX_PROVIDER_DOWN !== "true";
};

export const fetchLiveRate = async (
  fromCurrency: string,
  toCurrency: string,
): Promise<number> => {
  if (!isFxProviderAvailable()) {
    throw new ApiError(
      503,
      "FX provider is currently unavailable. Please try again later. " +
        "We never apply cached rates — your transfer has not been initiated.",
    );
  }

  const rate = MOCK_RATES[fromCurrency]?.[toCurrency];

  if (!rate) {
    throw new ApiError(
      400,
      `Exchange rate not available for ${fromCurrency} → ${toCurrency}`,
    );
  }

  const fluctuation = 1 + (Math.random() - 0.5) * 0.002;
  return parseFloat((rate * fluctuation).toFixed(8));
};
