import { ptBR, enUS, es, fr, de, it, pt } from "date-fns/locale";
import { Locale } from "date-fns";

export interface CountryOption {
  code: string;
  name: string;
  locale: Locale;
}

export const countries: CountryOption[] = [
  { code: "BR", name: "Brasil", locale: ptBR },
  { code: "US", name: "Estados Unidos", locale: enUS },
  { code: "PT", name: "Portugal", locale: pt },
  { code: "ES", name: "Espanha", locale: es },
  { code: "MX", name: "México", locale: es },
  { code: "AR", name: "Argentina", locale: es },
  { code: "CO", name: "Colômbia", locale: es },
  { code: "FR", name: "França", locale: fr },
  { code: "DE", name: "Alemanha", locale: de },
  { code: "IT", name: "Itália", locale: it },
];

export const getLocaleByCountry = (countryCode: string | null | undefined): Locale => {
  const country = countries.find((c) => c.code === countryCode);
  return country?.locale || ptBR;
};

export const getCountryName = (countryCode: string | null | undefined): string => {
  const country = countries.find((c) => c.code === countryCode);
  return country?.name || "Brasil";
};
