// ISO 3166-1 alpha-2 codes with Turkish names. Flag emoji derived from code.
export const COUNTRIES = [
  { name: "Türkiye", code: "TR" }, { name: "Almanya", code: "DE" }, { name: "Fransa", code: "FR" },
  { name: "İngiltere", code: "GB" }, { name: "İspanya", code: "ES" }, { name: "İtalya", code: "IT" },
  { name: "Portekiz", code: "PT" }, { name: "Hollanda", code: "NL" }, { name: "Belçika", code: "BE" },
  { name: "Brezilya", code: "BR" }, { name: "Arjantin", code: "AR" }, { name: "Uruguay", code: "UY" },
  { name: "Şili", code: "CL" }, { name: "Kolombiya", code: "CO" }, { name: "Meksika", code: "MX" },
  { name: "ABD", code: "US" }, { name: "Kanada", code: "CA" }, { name: "Hırvatistan", code: "HR" },
  { name: "Sırbistan", code: "RS" }, { name: "İsviçre", code: "CH" }, { name: "Avusturya", code: "AT" },
  { name: "Polonya", code: "PL" }, { name: "Çekya", code: "CZ" }, { name: "Slovakya", code: "SK" },
  { name: "Macaristan", code: "HU" }, { name: "Romanya", code: "RO" }, { name: "Bulgaristan", code: "BG" },
  { name: "Yunanistan", code: "GR" }, { name: "Danimarka", code: "DK" }, { name: "İsveç", code: "SE" },
  { name: "Norveç", code: "NO" }, { name: "Finlandiya", code: "FI" }, { name: "İzlanda", code: "IS" },
  { name: "İrlanda", code: "IE" }, { name: "İskoçya", code: "GB-SCT" }, { name: "Galler", code: "GB-WLS" },
  { name: "Rusya", code: "RU" }, { name: "Ukrayna", code: "UA" }, { name: "Polonya", code: "PL" },
  { name: "Japonya", code: "JP" }, { name: "Güney Kore", code: "KR" }, { name: "Çin", code: "CN" },
  { name: "Avustralya", code: "AU" }, { name: "Yeni Zelanda", code: "NZ" }, { name: "Fas", code: "MA" },
  { name: "Cezayir", code: "DZ" }, { name: "Tunus", code: "TN" }, { name: "Mısır", code: "EG" },
  { name: "Senegal", code: "SN" }, { name: "Nijerya", code: "NG" }, { name: "Gana", code: "GH" },
  { name: "Kamerun", code: "CM" }, { name: "Fildişi Sahili", code: "CI" }, { name: "Güney Afrika", code: "ZA" },
  { name: "Suudi Arabistan", code: "SA" }, { name: "Katar", code: "QA" }, { name: "BAE", code: "AE" },
  { name: "İran", code: "IR" }, { name: "Irak", code: "IQ" }, { name: "Ürdün", code: "JO" },
  { name: "Lübnan", code: "LB" }, { name: "İsrail", code: "IL" }, { name: "Azerbaycan", code: "AZ" },
  { name: "Gürcistan", code: "GE" }, { name: "Ermenistan", code: "AM" }, { name: "Kazakistan", code: "KZ" },
  { name: "Özbekistan", code: "UZ" }, { name: "Hindistan", code: "IN" }, { name: "Pakistan", code: "PK" },
  { name: "Endonezya", code: "ID" }, { name: "Malezya", code: "MY" }, { name: "Tayland", code: "TH" },
  { name: "Vietnam", code: "VN" }, { name: "Filipinler", code: "PH" }, { name: "Singapur", code: "SG" },
  { name: "Peru", code: "PE" }, { name: "Ekvador", code: "EC" }, { name: "Paraguay", code: "PY" },
  { name: "Bolivya", code: "BO" }, { name: "Venezuela", code: "VE" }, { name: "Kosta Rika", code: "CR" },
  { name: "Panama", code: "PA" }, { name: "Honduras", code: "HN" }, { name: "Jamaika", code: "JM" },
  { name: "Slovenya", code: "SI" }, { name: "Bosna Hersek", code: "BA" }, { name: "Karadağ", code: "ME" },
  { name: "Kuzey Makedonya", code: "MK" }, { name: "Arnavutluk", code: "AL" }, { name: "Kosova", code: "XK" },
  { name: "Litvanya", code: "LT" }, { name: "Letonya", code: "LV" }, { name: "Estonya", code: "EE" },
  { name: "Belarus", code: "BY" }, { name: "Moldova", code: "MD" }, { name: "Lüksemburg", code: "LU" },
  { name: "Malta", code: "MT" }, { name: "Kıbrıs", code: "CY" }, { name: "KKTC", code: "TR" },
  { name: "Angola", code: "AO" }, { name: "Kongo DC", code: "CD" }, { name: "Mali", code: "ML" },
  { name: "Burkina Faso", code: "BF" }, { name: "Gabon", code: "GA" }, { name: "Zambiya", code: "ZM" },
  { name: "Zimbabve", code: "ZW" }, { name: "Kenya", code: "KE" }, { name: "Uganda", code: "UG" },
  { name: "Etiyopya", code: "ET" }, { name: "Sudan", code: "SD" }, { name: "Libya", code: "LY" },
  { name: "Suriye", code: "SY" }, { name: "Kuveyt", code: "KW" }, { name: "Bahreyn", code: "BH" },
  { name: "Umman", code: "OM" }, { name: "Yemen", code: "YE" }, { name: "Afganistan", code: "AF" },
  { name: "Bangladeş", code: "BD" }, { name: "Sri Lanka", code: "LK" }, { name: "Nepal", code: "NP" },
];

export function flagEmoji(code) {
  if (!code) return "🏳️";
  const base = code.split("-")[0].toUpperCase();
  if (base.length !== 2) return "🏳️";
  try {
    return base.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  } catch {
    return "🏳️";
  }
}
