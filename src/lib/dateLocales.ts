import {
  ptBR, enUS, es, fr, de, it, pt, nl, pl, ru, uk, tr, ar, ja, ko, zhCN, zhTW,
  vi, th, id, ms, hi, bn, ta, te, gu, kn, el, cs, sk, hu, ro, bg,
  sr, hr, sl, et, lv, lt, fi, sv, nb, da, is, he, enGB, enAU, enCA, enIN,
  enNZ, enZA, frCA, frCH, deAT, nlBE, zhHK
} from "date-fns/locale";
import { Locale } from "date-fns";

export interface CountryOption {
  code: string;
  name: string;
  locale: Locale;
}

export const countries: CountryOption[] = [
  // Americas
  { code: "BR", name: "Brasil", locale: ptBR },
  { code: "US", name: "Estados Unidos", locale: enUS },
  { code: "CA", name: "Canadá", locale: enCA },
  { code: "MX", name: "México", locale: es },
  { code: "AR", name: "Argentina", locale: es },
  { code: "CL", name: "Chile", locale: es },
  { code: "CO", name: "Colômbia", locale: es },
  { code: "PE", name: "Peru", locale: es },
  { code: "VE", name: "Venezuela", locale: es },
  { code: "EC", name: "Equador", locale: es },
  { code: "UY", name: "Uruguai", locale: es },
  { code: "PY", name: "Paraguai", locale: es },
  { code: "BO", name: "Bolívia", locale: es },
  { code: "CR", name: "Costa Rica", locale: es },
  { code: "PA", name: "Panamá", locale: es },
  { code: "DO", name: "República Dominicana", locale: es },
  { code: "GT", name: "Guatemala", locale: es },
  { code: "HN", name: "Honduras", locale: es },
  { code: "SV", name: "El Salvador", locale: es },
  { code: "NI", name: "Nicarágua", locale: es },
  { code: "CU", name: "Cuba", locale: es },
  { code: "PR", name: "Porto Rico", locale: es },
  { code: "JM", name: "Jamaica", locale: enUS },
  { code: "TT", name: "Trinidad e Tobago", locale: enUS },
  
  // Europe
  { code: "PT", name: "Portugal", locale: pt },
  { code: "ES", name: "Espanha", locale: es },
  { code: "FR", name: "França", locale: fr },
  { code: "DE", name: "Alemanha", locale: de },
  { code: "IT", name: "Itália", locale: it },
  { code: "GB", name: "Reino Unido", locale: enGB },
  { code: "IE", name: "Irlanda", locale: enGB },
  { code: "NL", name: "Países Baixos", locale: nl },
  { code: "BE", name: "Bélgica", locale: nlBE },
  { code: "CH", name: "Suíça", locale: frCH },
  { code: "AT", name: "Áustria", locale: deAT },
  { code: "PL", name: "Polônia", locale: pl },
  { code: "CZ", name: "República Tcheca", locale: cs },
  { code: "SK", name: "Eslováquia", locale: sk },
  { code: "HU", name: "Hungria", locale: hu },
  { code: "RO", name: "Romênia", locale: ro },
  { code: "BG", name: "Bulgária", locale: bg },
  { code: "GR", name: "Grécia", locale: el },
  { code: "TR", name: "Turquia", locale: tr },
  { code: "RU", name: "Rússia", locale: ru },
  { code: "UA", name: "Ucrânia", locale: uk },
  { code: "BY", name: "Bielorrússia", locale: ru },
  { code: "RS", name: "Sérvia", locale: sr },
  { code: "HR", name: "Croácia", locale: hr },
  { code: "SI", name: "Eslovênia", locale: sl },
  { code: "BA", name: "Bósnia e Herzegovina", locale: hr },
  { code: "MK", name: "Macedônia do Norte", locale: sr },
  { code: "AL", name: "Albânia", locale: sr },
  { code: "ME", name: "Montenegro", locale: sr },
  { code: "XK", name: "Kosovo", locale: sr },
  { code: "EE", name: "Estônia", locale: et },
  { code: "LV", name: "Letônia", locale: lv },
  { code: "LT", name: "Lituânia", locale: lt },
  { code: "FI", name: "Finlândia", locale: fi },
  { code: "SE", name: "Suécia", locale: sv },
  { code: "NO", name: "Noruega", locale: nb },
  { code: "DK", name: "Dinamarca", locale: da },
  { code: "IS", name: "Islândia", locale: is },
  { code: "LU", name: "Luxemburgo", locale: fr },
  { code: "MT", name: "Malta", locale: enGB },
  { code: "CY", name: "Chipre", locale: el },
  { code: "MD", name: "Moldávia", locale: ro },
  
  // Asia
  { code: "JP", name: "Japão", locale: ja },
  { code: "KR", name: "Coreia do Sul", locale: ko },
  { code: "CN", name: "China", locale: zhCN },
  { code: "TW", name: "Taiwan", locale: zhTW },
  { code: "HK", name: "Hong Kong", locale: zhHK },
  { code: "IN", name: "Índia", locale: enIN },
  { code: "PK", name: "Paquistão", locale: enIN },
  { code: "BD", name: "Bangladesh", locale: bn },
  { code: "LK", name: "Sri Lanka", locale: enIN },
  { code: "NP", name: "Nepal", locale: hi },
  { code: "TH", name: "Tailândia", locale: th },
  { code: "VN", name: "Vietnã", locale: vi },
  { code: "ID", name: "Indonésia", locale: id },
  { code: "MY", name: "Malásia", locale: ms },
  { code: "SG", name: "Singapura", locale: enGB },
  { code: "PH", name: "Filipinas", locale: enUS },
  { code: "MM", name: "Mianmar", locale: enUS },
  { code: "KH", name: "Camboja", locale: enUS },
  { code: "LA", name: "Laos", locale: enUS },
  
  // Middle East
  { code: "SA", name: "Arábia Saudita", locale: ar },
  { code: "AE", name: "Emirados Árabes Unidos", locale: ar },
  { code: "QA", name: "Catar", locale: ar },
  { code: "KW", name: "Kuwait", locale: ar },
  { code: "BH", name: "Bahrein", locale: ar },
  { code: "OM", name: "Omã", locale: ar },
  { code: "IL", name: "Israel", locale: he },
  { code: "JO", name: "Jordânia", locale: ar },
  { code: "LB", name: "Líbano", locale: ar },
  { code: "IQ", name: "Iraque", locale: ar },
  { code: "IR", name: "Irã", locale: ar },
  { code: "SY", name: "Síria", locale: ar },
  { code: "YE", name: "Iêmen", locale: ar },
  
  // Africa
  { code: "ZA", name: "África do Sul", locale: enZA },
  { code: "EG", name: "Egito", locale: ar },
  { code: "MA", name: "Marrocos", locale: ar },
  { code: "DZ", name: "Argélia", locale: ar },
  { code: "TN", name: "Tunísia", locale: ar },
  { code: "LY", name: "Líbia", locale: ar },
  { code: "NG", name: "Nigéria", locale: enGB },
  { code: "KE", name: "Quênia", locale: enGB },
  { code: "GH", name: "Gana", locale: enGB },
  { code: "ET", name: "Etiópia", locale: enGB },
  { code: "TZ", name: "Tanzânia", locale: enGB },
  { code: "UG", name: "Uganda", locale: enGB },
  { code: "CI", name: "Costa do Marfim", locale: fr },
  { code: "SN", name: "Senegal", locale: fr },
  { code: "CM", name: "Camarões", locale: fr },
  { code: "AO", name: "Angola", locale: pt },
  { code: "MZ", name: "Moçambique", locale: pt },
  { code: "CV", name: "Cabo Verde", locale: pt },
  { code: "GW", name: "Guiné-Bissau", locale: pt },
  { code: "ST", name: "São Tomé e Príncipe", locale: pt },
  
  // Oceania
  { code: "AU", name: "Austrália", locale: enAU },
  { code: "NZ", name: "Nova Zelândia", locale: enNZ },
  { code: "FJ", name: "Fiji", locale: enAU },
  { code: "PG", name: "Papua Nova Guiné", locale: enAU },
].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

export const getLocaleByCountry = (countryCode: string | null | undefined): Locale => {
  const country = countries.find((c) => c.code === countryCode);
  return country?.locale || ptBR;
};

export const getCountryName = (countryCode: string | null | undefined): string => {
  const country = countries.find((c) => c.code === countryCode);
  return country?.name || "Brasil";
};
