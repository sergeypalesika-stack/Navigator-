"use client"


import { useState, useMemo, useEffect, useRef } from "react"
import * as XLSX from "xlsx"

interface Voucher {
  vId: string; hotel: string; guide: string; pickup: string
  flightDate: string; flightTime: string; flightNo: string
  tourists: string[]; phones: string[]; departureDate: string
  touroperator: string; transferType: string
}

interface Excursion {
  key: string; vId: string; date: string; excursionName: string
  excursionType: ExcursionType; hotel: string; room: string
  tourists: { name: string; phone: string }[]
  pickup: string; adl: number; chd: number; inf: number; guide: string; cooperateStaff: string; touroperator: string
}

interface LogEntry {
  id: string
  time: string
  date: string
  type: "transfer" | "excursion"
  name: string
  phone: string
  hotel: string
  voucherId: string
}

type ExcursionType = "sea"|"evening"|"jetski"|"flight"|"bangkok"|"twoday"|"cheolan"|"land"|"city"|"mantra"|"dolcevita"|"waterpark"|"spa"|"vip"|"hanuman"|"fishing"|"cabaret"|"elephant"|"shopping"

function classifyExcursion(name: string): ExcursionType {
  const n = name.toLowerCase()
  if (n.includes("andamanda")||n.includes("аквапарк")||n.includes("aqua")||n.includes("water park")) return "waterpark"
  if (n.includes("simon")||n.includes("cabaret")||n.includes("кабаре")) return "cabaret"
  if (n.includes("oasis")||n.includes("оазис")) return "spa"
  if (n.includes("hanuman")||n.includes("хануман")) return "hanuman"
  if (n.includes("fishing")||n.includes("рыбалк")) return "fishing"
  if (n.includes("mantra")||n.includes("мантра")) return "mantra"
  if (n.includes("dolce vita")||n.includes("дольче вита")) return "dolcevita"
  if (n.includes("carnival")||n.includes("siam niramit")||n.includes("moonlight")||n.includes("fantasea")||n.includes("фантасеа")) return "evening"
  if (n.includes("jet ski")||n.includes("wave rider")||n.includes("гидроцикл")) return "jetski"
  if (n.includes("bangkok")||n.includes("бангкок")) return "bangkok"
  if (n.includes("singapore")||n.includes("malaysia")||n.includes("cambodia")||n.includes("сингапур")||n.includes("малайзия")||n.includes("камбоджа")) return "flight"
  if (n.includes("cheo lan")||n.includes("cheow lan")||n.includes("чео лан")||n.includes("jungle escape")||n.includes("побег из джунглей")) return "cheolan"
  if (n.includes("2/1")||n.includes("2.1")||n.includes("star island")||n.includes("звёздн")) return "twoday"
  if (n.includes("vip")||n.includes("вип")) return "vip"
  if (n.includes("city")||n.includes("сити")||n.includes("wonders")) return "city"
  if (n.includes("elephant")||n.includes("слон")) return "elephant"
  if (n.includes("shopping")||n.includes("шоппинг")||n.includes("shop tour")) return "shopping"
  if (n.includes("safari")||n.includes("сафари")||n.includes("phang")||n.includes("пхангнга")||n.includes("пхангн")||n.includes("avatar")||n.includes("аватар")||n.includes("discovery")||n.includes("asia safari")||n.includes("удивительн")||n.includes("amazing")||n.includes("trekking")||n.includes("rafting")||n.includes("трекинг")||n.includes("рафтинг")) return "land"
  return "sea"
}

const TYPE_META: Record<ExcursionType,{label:string;icon:string;color:string;border:string;bg:string;noTransfer?:boolean}> = {
  sea:       {label:"Морские",         icon:"🚢",color:"#38bdf8",border:"#1e3f6a",bg:"#0c2340"},
  evening:   {label:"Вечерние шоу",    icon:"🌙",color:"#c084fc",border:"#6b21a8",bg:"#2d1b4e"},
  jetski:    {label:"Гидроциклы",      icon:"🏄",color:"#4ade80",border:"#16a34a",bg:"#1a2e1a"},
  flight:    {label:"Перелётные",      icon:"✈️",color:"#fbbf24",border:"#d97706",bg:"#2d2200"},
  bangkok:   {label:"Бангкок",         icon:"🏙️",color:"#f97316",border:"#c2410c",bg:"#2d1500"},
  twoday:    {label:"Двухдневные",     icon:"🏕️",color:"#fb923c",border:"#ea580c",bg:"#2d1b0e"},
  cheolan:   {label:"Чео Лан / Jungle",icon:"🌿",color:"#86efac",border:"#16a34a",bg:"#0d2010"},
  land:      {label:"Наземные",        icon:"🚌",color:"#2dd4bf",border:"#0d9488",bg:"#0d2422"},
  city:      {label:"Сити-тур",        icon:"🏛️",color:"#a78bfa",border:"#7c3aed",bg:"#1e1040"},
  mantra:    {label:"Мантра Спа",      icon:"💆",color:"#f9a8d4",border:"#db2777",bg:"#2d0f1f"},
  dolcevita: {label:"Dolce Vita",      icon:"🌺",color:"#fb7185",border:"#e11d48",bg:"#2d0a14"},
  waterpark: {label:"Аквапарк",        icon:"🌊",color:"#67e8f9",border:"#0891b2",bg:"#0a2030",noTransfer:true},
  spa:       {label:"Spa Oasis",       icon:"🧖",color:"#d8b4fe",border:"#9333ea",bg:"#200d35"},
  vip:       {label:"VIP тур",         icon:"👑",color:"#fde68a",border:"#d97706",bg:"#2d1f00"},
  hanuman:   {label:"Мир Ханумана",    icon:"🐒",color:"#bbf7d0",border:"#15803d",bg:"#0a1f10"},
  fishing:   {label:"Рыбалка",         icon:"🎣",color:"#7dd3fc",border:"#0369a1",bg:"#0a1f2d"},
  cabaret:   {label:"Simon Cabaret",   icon:"💃",color:"#fca5a5",border:"#dc2626",bg:"#2d0a0a",noTransfer:true},
  elephant:  {label:"Слоновий заповедник", icon:"🐘",color:"#86efac",border:"#15803d",bg:"#0a1f10"},
  shopping:  {label:"Шоппинг-тур",     icon:"🛍️",color:"#fde68a",border:"#ca8a04",bg:"#2d2200"},
}

function generateExcursionMessage(e: Excursion): string {
  const p = e.pickup && e.pickup !== "—" ? e.pickup : "уточните у гида"
  const isBIG = (e.touroperator||"").toLowerCase().includes("bg asia") || (e.touroperator||"").toLowerCase().includes("big")
  const hotlineMain = isBIG
    ? ["📞 Для звонков: +66 92 249 49 49", "💬 WhatsApp / Telegram: +66 92 279 09 90"]
    : ["📞 +66 89 009 50 00 (для звонков с местных телефонов)", "💬 +66 92 279 11 99 (WhatsApp, Telegram)"]
  const msgs: Record<ExcursionType, string[]> = {
    sea: [
      "Уважаемые гости!",
      "Напоминаю, что завтра у вас запланирована морская экскурсия.",
      "",
      "⏰ Пожалуйста, будьте готовы в " + p + " — ожидайте трансфер в лобби отеля.",
      "",
      "📦 Совет: закажите Breakfast box на ресепшене сегодня — лёгкий завтрак в порту будет кстати.",
      "",
      "🎒 Что взять с собой:",
      "• купальник / плавки",
      "• полотенце",
      "• солнцезащитный крем 🧴",
      "• головной убор 🧢",
      "• очки от солнца 🕶️",
      "• немного наличных для личных расходов",
      "• зарядку для телефона — будет что снимать! 📸",
      "• страховка",
      "• фото паспортов",
      "",
      "⚠️ Беременным нельзя на морские экскурсии!",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки и отличного отдыха! 🌴🚤☀️",
    ],
    dolcevita: [
      "Дорогие гости!",
      "",
      "Завтра вас ждёт увлекательная морская экскурсия по островам — живописные пейзажи, бирюзовая вода, белоснежный песок и масса впечатлений! 🏝️🌊",
      "",
      "⏰ Время выезда: " + p,
      "📍 Просим быть у лобби за 10 минут до выезда.",
      "",
      "☀️ Что важно взять с собой:",
      "• купальник / плавки (можно надеть под одежду заранее)",
      "• сменная лёгкая одежда",
      "• полотенце",
      "• солнцезащитный крем и головной убор",
      "• удобная обувь, которую легко снять (сланцы, сандалии)",
      "• страховка",
      "• фото паспортов",
      "• хорошее настроение и заряженный телефон — будет что снимать! 📸",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки! 🌴",
    ],
    evening: [
      "Добрый вечер!",
      "Завтра выезд на вечернее шоу в " + p + ".",
      "",
      "С собой рекомендуем:",
      "• лёгкую кофту или рубашку (в минивэне, ресторане и зале работает кондиционер)",
      "• деньги на личные расходы (сувениры, коктейли, алкоголь)",
      "• фотоаппарат — на территории можно фотографировать (во время шоу съёмка запрещена)",
      "",
      "По прибытии:",
      "Покажите билеты в кассе — получите посадочные места и пропуск в ресторан.",
      "Далее — свободное время для прогулки и ужина.",
      "",
      "После шоу будет возможность сделать фото.",
      "На выходе сотрудники направят вас к минивэнам — трансфер в отель.",
      "",
      "Если трансфер задерживается более 10 минут:",
      ...hotlineMain,
      "",
      "Желаю приятного просмотра и ярких впечатлений!",
    ],
    jetski: [
      "Добрый день!",
      "Напоминаем, что завтра выезд на экскурсию на гидроциклах в " + p + ".",
      "",
      "✔️ Пожалуйста, возьмите с собой:",
      "• купальные вещи",
      "• полотенце",
      "• солнцезащиту (крем, очки)",
      "• воду",
      "• резиновую / водостойкую обувь (по желанию)",
      "• сухую одежду для переодевания",
      "• телефон в водонепроницаемом чехле (по желанию)",
      "• страховка",
      "• фото паспортов",
      "",
      "❗ Важно:",
      "• Будьте готовы на ресепшн за 10 минут до выезда",
      "• Не берите дорогие вещи и украшения",
      "• Документы и деньги оставьте в сейфе / отеле",
      "",
      "Хорошей прогулки и ярких эмоций! 🌊💙",
      "",
      "Если транспорт задерживается:",
      ...hotlineMain,
      "",
      "Желаем вам приятной поездки! 🌴✨",
    ],
    flight: [
      "Добрый вечер!",
      "Выезд на экскурсию состоится в " + p + ".",
      "Прошу вас не опаздывать, время ожидания трансфера — не более 10 минут.",
      "",
      "Рекомендую взять с собой:",
      "• подходящую обувь",
      "• головные уборы",
      "• солнцезащитные средства",
      "• деньги на личные расходы",
      "• тёплую одежду (в автобусе / аэропорту кондиционер)",
      "• загранпаспорт ОРИГИНАЛ ⚠️",
      "• закажите накануне на ресепшене lunch box / breakfast box",
      "• страховка",
      "• фото паспортов",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки.",
    ],
    bangkok: [
      "Добрый вечер!",
      "Выезд на экскурсию в Бангкок состоится в " + p + ".",
      "Прошу вас не опаздывать, время ожидания трансфера — не более 10 минут.",
      "",
      "Рекомендую взять с собой:",
      "• подходящую обувь",
      "• головные уборы",
      "• солнцезащитные средства",
      "• деньги на личные расходы",
      "• тёплую одежду (в автобусе / аэропорту кондиционер)",
      "• загранпаспорт ОРИГИНАЛ ⚠️",
      "• закажите накануне на ресепшене lunch box / breakfast box",
      "• страховка",
      "• фото паспортов",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки.",
    ],
    twoday: [
      "Добрый вечер!",
      "Выезд на двухдневную экскурсию состоится в " + p + ".",
      "Прошу вас не опаздывать, время ожидания — не более 10 минут.",
      "",
      "Рекомендую взять с собой:",
      "• подходящую обувь",
      "• головные уборы",
      "• солнцезащитные средства",
      "• деньги на личные расходы",
      "• купальные принадлежности",
      "• тёплую одежду (в автобусе кондиционер)",
      "• сменную одежду и средства личной гигиены (overnight) 🧳",
      "• загранпаспорт ОРИГИНАЛ ⚠️",
      "• закажите накануне на ресепшене lunch box / breakfast box",
      "• страховка",
      "• фото паспортов",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки.",
    ],
    cheolan: [
      "Добрый день!",
      "Завтра состоится выезд на двухдневную экскурсию на озеро Чео Лан.",
      "",
      "⏰ Время выезда: " + p,
      "⛵ Продолжительность: 2 дня / 1 ночь",
      "",
      "Что важно взять с собой:",
      "• фото паспорта (обязательно, проверяется на входе в заповедник) ⚠️",
      "• купальные принадлежности",
      "• полотенце",
      "• удобную одежду и обувь (шорты, футболка, сандалии / кроссовки)",
      "• лёгкую кофту или накидку (вечером может быть прохладно)",
      "• солнцезащитные средства (крем, очки, головной убор)",
      "• репеллент от насекомых",
      "• личные средства гигиены",
      "• деньги на личные расходы",
      "• заряженный телефон, пауэрбанк, фонарик",
      "• фотоаппарат — пейзажи будут волшебные! 📸",
      "• запасной комплект одежды",
      "• страховка",
      "• фото паспортов",
      "",
      "Рекомендации:",
      "• завтрак лучше заказать заранее на ресепшене (с собой)",
      "• не берите тяжёлые чемоданы — достаточно небольшого рюкзака",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки.",
    ],
    land: [
      "Добрый вечер!",
      "Завтра у вас запланирована экскурсия, выезд состоится в " + p + ".",
      "Просим быть готовы заранее — время ожидания не более 10 минут.",
      "",
      "🔹 Что рекомендуется взять с собой:",
      "• удобную обувь (сланцы, сандалии, кроксы)",
      "• головной убор",
      "• солнцезащитные средства",
      "• купальные принадлежности",
      "• тёплую кофту (в дороге кондиционер)",
      "• наличные на личные расходы",
      "• заранее закажите на ресепшене завтрак / lunch box",
      "• страховка",
      "• фото паспортов",
      "",
      "Если транспорт задерживается:",
      ...hotlineMain,
      "",
      "Хорошей дороги и ярких впечатлений! 🌿😊",
    ],
    city: [
      "Добрый вечер!",
      "Завтра выезд на обзорную экскурсию состоится в " + p + ".",
      "Прошу вас не опаздывать, время ожидания — не более 10 минут.",
      "",
      "Рекомендую взять с собой:",
      "• подходящую обувь",
      "• головные уборы",
      "• питьевую воду",
      "• перекус (питание не включено)",
      "• солнцезащитные средства",
      "• деньги на личные расходы",
      "• тёплую одежду (в автобусе кондиционер)",
      "• во время экскурсии вы будете посещать храм — плечи и колени должны быть прикрыты 🙏",
      "• носки (перед храмом необходимо разуться)",
      "• страховка",
      "• фото паспортов",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки.",
    ],
    mantra: [
      "Добрый вечер!",
      "Завтра выезд на экскурсию состоится в " + p + ".",
      "",
      "📌 Рекомендуем взять с собой:",
      "• удобную обувь (сандалии или сланцы)",
      "• головные уборы",
      "• солнцезащитные средства",
      "• полотенца и купальные принадлежности",
      "• деньги на личные расходы",
      "• страховка",
      "• фото паспортов",
      "",
      "💆 В спа полотенца предоставляются, но при получении берётся депозит 300 бат (возвращается 200 бат).",
      "",
      "Если транспорт задерживается:",
      ...hotlineMain,
      "",
      "Желаем вам приятной поездки и отличного отдыха! 🌴✨",
    ],
    waterpark: (p && p !== "—") ? [
      "Добрый день.",
      "",
      "Завтра выезд у Вас состоится в " + p + " в аквапарк.",
      "",
      "С собой необходимо взять:",
      "• деньги на личные расходы (питание, сувениры, напитки, ячейка для хранения личных вещей)",
      "• солнцезащитные средства, очки, головные уборы",
      "• купальные принадлежности и полотенца",
      "",
      "По прибытию предъявите наш ваучер на кассе аквапарка.",
      "",
      "Обратный трансфер согласно оговоренному времени в 18:00 — за 5-10 минут подходите к кассе, Вас направят к минивэну, который отвезёт в отель.",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      "...hotlineMain",
      "",
      "Хорошего отдыха! 🌊",
    ] : [
      "Уважаемые гости!",
      "",
      "Завтра у вас запланировано посещение аквапарка Andamanda Phuket.",
      "Входные билеты у вас уже есть.",
      "",
      "📍 Адрес: Andamanda Phuket, Kathu",
      "⏰ Время работы: ежедневно с 10:00 до 19:00",
      "🎫 Ваши билеты: предъявите на входе (электронные или бумажные).",
      "",
      "🚖 Внимание! Трансфер не предоставляется — добраться необходимо самостоятельно (рекомендуем такси / Grab / Bolt).",
      "",
      "ℹ️ Полезная информация:",
      "• На территории есть камеры хранения, рестораны и кафе",
      "• Разрешён вход только в специальной купальной одежде",
      "• Полотенца можно взять с собой либо арендовать на месте",
      "",
      "В случае вопросов — горячая линия:",
      "...hotlineMain",
      "",
      "Желаем вам ярких впечатлений и отличного отдыха! 🌊",
    ],
    spa: [
      "Добрый вечер!",
      "Завтра состоится выезд в SPA-центр Oasis.",
      "",
      "⏰ Время отправления: " + p,
      "📍 Место встречи: ресепшн отеля",
      "",
      "Всё необходимое там предоставят.",
      "Возьмите деньги на дополнительные услуги и чаевые.",
      "",
      "Если транспорт задерживается, звоните на горячую линию:",
      ...hotlineMain,
      "",
      "✨ Желаем вам приятного отдыха и полного релакса!",
    ],
    vip: [
      "Добрый вечер!",
      "Выезд на экскурсию завтра состоится в " + p + ".",
      "",
      "Рекомендую взять с собой:",
      "• подходящую обувь",
      "• головные уборы",
      "• питьевую воду",
      "• солнцезащитные средства",
      "• деньги на личные расходы (обед и сувениры)",
      "• тёплую одежду (дорога в авто под кондиционером)",
      "• страховка",
      "• фото паспортов",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки.",
    ],
    hanuman: [
      "Добрый день!",
      "Завтра у вас увлекательное приключение — экскурсия в «Мир Ханумана»!",
      "",
      "⏰ Время выезда из отеля: " + p,
      "",
      "🎒 Что взять с собой:",
      "• удобную обувь (лучше кроссовки или сандалии, минимум — кроксы)",
      "• головной убор — обязательно",
      "• лёгкую и не новую одежду (шорты + футболка, возможно попадание масла с роликовой системы)",
      "• деньги на личные расходы (напитки, сувениры)",
      "• страховка",
      "• фото паспортов",
      "",
      "По прибытии в парк:",
      "1. Подходите на ресепшн, получите браслет по вашему пакету.",
      "2. Вас ждут яркие приключения:",
      "   ✧ Полёт по Zip-line",
      "   ✧ Прогулка по Sky Walk",
      "   ✧ Спуск на Roller",
      "   ✧ Вкусный обед",
      "3. После каждого этапа возвращайтесь на ресепшн — сотрудники подскажут что дальше.",
      "",
      "По окончании программы вас проводят к трансферу.",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "🎉 Желаем незабываемых эмоций и лёгкого полёта!",
    ],
    fishing: [
      "Добрый вечер!",
      "Завтра выезд на рыбалку.",
      "",
      "⏰ Время выезда: " + p,
      "📍 Место сбора: ресепшн отеля (будьте за 10 минут до выезда)",
      "",
      "Что взять с собой:",
      "• удобная обувь (сланцы / сандалии)",
      "• головной убор, солнцезащитные средства",
      "• полотенце, купальные принадлежности",
      "• страховка",
      "• фото паспортов",
      "",
      "Важно: лодка оснащена спасательными жилетами, рыболовные снасти предоставляются.",
      "",
      "Если транспорт задерживается, свяжитесь с горячей линией:",
      ...hotlineMain,
      "",
      "Хорошей рыбалки и отличного дня! 🎣",
    ],
    cabaret: (p && p !== "—") ? [
      "Добрый вечер!",
      "",
      "Завтра выезд на шоу Simon Cabaret состоится в " + p + ".",
      "📍 Просим быть готовыми у лобби за 10 минут до выезда.",
      "",
      "Входные билеты у вас уже есть.",
      "⏰ Начало шоу: 18:00 — прибудьте минимум за 20–30 минут для обмена билетов.",
      "",
      "С собой рекомендуем:",
      "• лёгкую кофту (в зале работает кондиционер)",
      "• деньги на личные расходы (напитки, сувениры)",
      "• фотоаппарат — фотосессия с артистами после шоу (оплачивается дополнительно)",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      "...hotlineMain",
      "",
      "Желаем вам приятного вечера и незабываемых впечатлений! 💃",
    ] : [
      "Уважаемые гости!",
      "",
      "Завтра у вас запланировано посещение кабаре-шоу Simon Cabaret.",
      "Входные билеты у вас уже есть.",
      "",
      "📍 Место проведения: Simon Cabaret, Patong",
      "⏰ Начало шоу: 18:00 (прибудьте минимум за 20–30 минут для обмена билетов)",
      "🎫 Ваши билеты: предоставьте на входе.",
      "",
      "🚖 Внимание! Трансфер не предоставляется — добраться необходимо самостоятельно (рекомендуем такси / Bolt / inDrive).",
      "",
      "Для вашего удобства:",
      "• Длительность шоу около 1 часа",
      "• Фотосессия с артистами после шоу (оплачивается дополнительно)",
      "",
      "В случае вопросов — горячая линия:",
      "...hotlineMain",
      "",
      "Желаем вам приятного вечера и незабываемых впечатлений! 💃",
    ],
    elephant: [
      "Дорогие гости!",
      "",
      "Завтра состоится ваша экскурсия в заповедник слонов — уникальное место, где вы сможете пообщаться с этими удивительными животными в условиях, максимально приближённых к естественным. 🐘",
      "",
      "⏰ Время выезда: " + p,
      "📍 Просьба быть готовыми у лобби за 10 минут до выезда.",
      "",
      "Рекомендуем взять с собой:",
      "• удобную одежду, которую не жалко испачкать (возможно взаимодействие с грязью или водой)",
      "• обувь на твёрдой подошве (сандалии, кроссовки)",
      "• купальник / плавки и полотенце (если программа включает купание со слонами)",
      "• сменную одежду",
      "• репеллент от комаров",
      "• солнцезащитный крем и головной убор",
      "• деньги на личные расходы (напитки, сувениры и чаевые)",
      "• страховка",
      "• фото паспортов",
      "",
      "❗ По возможности не используйте парфюмы — сильные запахи могут раздражать животных.",
      "",
      "Желаем вам незабываемых впечатлений и душевного общения с этими добрыми великанами!",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаю вам приятной поездки.",
    ],
    shopping: [
      "Дорогие гости!",
      "",
      "Завтра у вас запланировано посещение наших партнёров — специализированных центров Пхукета. 🛍️",
      "",
      "⏰ Время выезда: " + p,
      "📍 Просьба быть готовыми у лобби за 10 минут до выезда.",
      "",
      "Вас ждут:",
      "• 💎 Галерея самоцветов и ювелирных украшений",
      "• 🌿 Центр традиционной тайской медицины",
      "• 🧴 Центр натуральной косметики",
      "• 🦈 И другие интересные места",
      "",
      "ℹ️ Посещение бесплатное — покупки по желанию.",
      "В каждом центре вас встретят русскоговорящие сотрудники.",
      "",
      "Возьмите с собой:",
      "• деньги наличными и карту",
      "• тёплую кофту (в центрах работает кондиционер)",
      "• страховка",
      "• фото паспортов",
      "",
      "Если транспорт задерживается, обратитесь на горячую линию:",
      ...hotlineMain,
      "",
      "Желаем приятной поездки и интересных открытий! ✨",
    ],
  }
  const rawMsgs = Array.isArray(msgs[e.excursionType]) ? msgs[e.excursionType] : []
  const msgLines = rawMsgs.reduce((acc:string[],line:string)=>{
    if(line==="...hotlineMain"){return [...acc,...hotlineMain]}
    return [...acc,line]
  },[])
  return encodeURIComponent(msgLines.join("\n"))
}


function formatExcelValue(v: any): string {
  if (v===undefined||v===null||String(v).trim()===""||String(v).trim()==="0") return ""
  if (typeof v==="number") {
    if (v>0&&v<1) { const s=Math.round(v*86400); return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor((s%3600)/60)).padStart(2,"0") }
    if (v>=1&&v<3) { const f=v%1,s=Math.round(f*86400); return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor((s%3600)/60)).padStart(2,"0") }
    if (v>40000) {
      const d=XLSX.SSF.parse_date_code(Math.floor(v))
      return String(d.d).padStart(2,"0")+"."+String(d.m).padStart(2,"0")+"."+d.y
    }
  }
  const s=String(v).trim()
  const parts=s.split(" ")
  if (parts.length>1) {
    const dp=parts[0].split(".")
    if (dp.length===3 && dp[2].length>=4) return dp[0].padStart(2,"0")+"."+dp[1].padStart(2,"0")+"."+dp[2]
  }
  const tp=s.split(":")
  if (tp.length===2 && tp[0].length<=2) return tp[0].padStart(2,"0")+":"+tp[1].substring(0,2)
  return s
}

function generateTransferMessage(v: Voucher): string {
  const isBIG = v.touroperator === "BIG"
  const contacts = isBIG
    ? ["📞 Для звонков: +66 92 249 49 49", "💬 WhatsApp / Telegram: +66 92 279 09 90"]
    : ["📞 Для звонков: +66 89 009 50 00", "💬 WhatsApp / Telegram: +66 92 279 11 99"]
  const lines = [
    "Здравствуйте!",
    "",
    "🛫 ИНФОРМАЦИЯ О ВЫЕЗДЕ В АЭРОПОРТ",
    "",
    "📅 Дата: " + v.departureDate,
    "🕰 Выезд из отеля: " + v.pickup,
    "🛫 Вылет: " + v.flightTime,
    "🎟 Рейс: " + v.flightNo,
    "",
    "✅ УВАЖАЕМЫЕ ГОСТИ!",
    "Пожалуйста, подготовьтесь к выезду заранее.",
    "",
    "🕒 На ресепшн:",
    "• Сдайте номер (стандартный выезд — до 12:00. При позднем вылете уточните возможность продления заранее. Стоимость продления зависит от типа номера — сотрудники ресепшн предоставят информацию).",
    "• Оплатите счета, если вы пользовались дополнительными услугами отеля.",
    "• Пожалуйста, сделайте это до прибытия транспорта, чтобы не задерживать трансфер.",
    "",
    "📑 Перед выходом проверьте наличие:",
    "• паспортов и авиабилетов;",
    "• всех личных вещей и багажа.",
    "",
    "🛎 Пожалуйста, ожидайте на ресепшн.",
    "🚐 У водителя будет список (программа), в котором должна быть указана ваша фамилия.",
    "",
    "☎️ В случае задержки транспорта (более 10 минут):",
    "Свяжитесь с русскоговорящей горячей линией:",
    ...contacts,
    "",
    "✨ Желаем вам приятного полёта и надеемся вновь увидеть вас в Таиланде!",
  ]
  return encodeURIComponent(lines.join("\n"))
}

const APP_PASSWORD = "8888"
const APP_VERSION = "2.1"

// ══════════════════════════════════════════════
// AI UPDATE PANEL — универсальный AI-парсер файлов
// Требует: npm install mammoth
// ══════════════════════════════════════════════

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(",")[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

async function readDocxText(file: File): Promise<string> {
  try {
    const mammoth = await import("mammoth")
    const buf = await file.arrayBuffer()
    const result = await (mammoth as any).extractRawText({ arrayBuffer: buf })
    return result.value
  } catch {
    throw new Error("Не удалось прочитать DOCX. Убедитесь что установлен: npm install mammoth")
  }
}

const AI_PROMPTS: Record<string, string> = {
  boats: `Ты парсишь прайс-лист аренды лодок на Пхукете (Таиланд).
Извлеки данные о всех лодках и их турах.
Верни ТОЛЬКО валидный JSON-массив без markdown-блоков, без пояснений.
Структура каждого объекта:
{"name":"название лодки","size":"размер (например 46ft)","pier":"пирс отправления","type":"speedboat|catamaran|powercat|yacht|sailboat","maxPax":число,"note":"примечания если есть","tours":[{"name":"тур","price":число,"extra":число или null,"paxIncl":"1–2"}]}
Если поле неизвестно — пропусти. Верни только JSON-массив.`,

  summer: `Ты парсишь прайс-лист аренды лодок на Пхукете (Таиланд), версия Summer Update.
Извлеки все лодки и их туры.
Верни ТОЛЬКО валидный JSON-массив без markdown-блоков, без пояснений.
Структура каждого объекта:
{"name":"название","size":"размер","pier":"пирс","type":"speedboat|sailboat|catamaran|powercat|yacht","maxPax":число,"note":"примечания","tours":[{"name":"тур","price":число,"extra":число или null,"incl":"1–2"}]}
Верни только JSON-массив.`,

  methodichka: `Ты парсишь прайс-лист экскурсий и туров туроператора на Пхукете (Таиланд).
Извлеки все туры с ценами.
Верни ТОЛЬКО валидный JSON-массив без markdown-блоков, без пояснений.
Структура каждого объекта:
{"name":"название тура на русском","nameEn":"название на английском если есть","cat":"sea|land|show|flight|fishing|diving|other","duration":"продолжительность","price":"строка с ценами","includes":"что включено","restrictions":"ограничения если есть"}
Верни только JSON-массив.`,
}

function AIUpdatePanel({ dark, mode, onUpdate, onClose }: {
  dark: boolean
  mode: "boats" | "summer" | "methodichka"
  onUpdate: (data: any[]) => void
  onClose: () => void
}) {
  const t = {
    bg: dark?"#0b1120":"#f0f4f8", card: dark?"#131d2e":"#ffffff",
    border: dark?"#1e2f45":"#d1dce8", text: dark?"#e2eaf4":"#1a2636",
    muted: dark?"#5b7a9a":"#6e8aa8", accent: "#38bdf8",
    inputBg: dark?"#101c2d":"#ffffff", inputBdr: dark?"#1e3450":"#c5d5e5",
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File|null>(null)
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error">("idle")
  const [progress, setProgress] = useState("")
  const [parsed, setParsed] = useState<any[]|null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const isPDF = file?.name?.toLowerCase().endsWith(".pdf")

  async function handleParse() {
    if (!file) return
    setStatus("loading"); setParsed(null); setErrorMsg("")
    try {
      let messages: any[]
      const prompt = AI_PROMPTS[mode]
      if (isPDF) {
        setProgress("Читаю PDF...")
        const b64 = await readFileAsBase64(file)
        messages = [{ role:"user", content:[
          { type:"document", source:{ type:"base64", media_type:"application/pdf", data:b64 } },
          { type:"text", text:prompt }
        ]}]
      } else {
        setProgress("Конвертирую Word-документ...")
        const text = await readDocxText(file)
        messages = [{ role:"user", content: prompt + "\n\nТекст документа:\n" + text }]
      }
      setProgress("Отправляю в Claude AI...")
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:4000, messages })
      })
      setProgress("Получаю ответ...")
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error?.message || "Ошибка API")
      const raw = data.content.filter((b:any)=>b.type==="text").map((b:any)=>b.text).join("")
      const clean = raw.replace(/```json|```/g,"").trim()
      let result: any[]
      try { result = JSON.parse(clean) }
      catch {
        const m = clean.match(/\[[\s\S]*\]/)
        if (m) result = JSON.parse(m[0])
        else throw new Error("Не удалось распознать JSON в ответе")
      }
      setParsed(result); setStatus("done"); setProgress("")
    } catch(e: any) {
      setStatus("error"); setErrorMsg(e.message||"Неизвестная ошибка"); setProgress("")
    }
  }

  function handleApply() {
    if (parsed) { onUpdate(parsed); onClose() }
  }

  const modeLabels: Record<string,string> = {
    boats:"🚢 Лодки (основной прайс)", summer:"☀️ Boat Summer Update", methodichka:"📚 Методичка"
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:t.card,border:`1.5px solid ${t.border}`,borderRadius:"20px",width:"100%",maxWidth:"460px",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>

        {/* Header */}
        <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${t.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:"15px",fontWeight:800,color:t.accent}}>🤖 AI Обновление прайса</div>
            <div style={{fontSize:"11px",color:t.muted,marginTop:"2px"}}>{modeLabels[mode]}</div>
          </div>
          <button onClick={onClose} style={{background:t.border,border:"none",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"14px",color:t.text}}>✕</button>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"16px 18px"}}>
          {/* Drop zone */}
          <div onClick={()=>fileRef.current?.click()}
            onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){setFile(f);setStatus("idle");setParsed(null)}}}
            onDragOver={e=>e.preventDefault()}
            style={{border:`2px dashed ${file?t.accent:t.border}`,borderRadius:"12px",padding:"22px 16px",textAlign:"center",cursor:"pointer",marginBottom:"14px",background:file?"rgba(56,189,248,0.04)":"transparent",transition:"all 0.2s"}}>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc" style={{display:"none"}}
              onChange={e=>{const f=e.target.files?.[0];if(f){setFile(f);setStatus("idle");setParsed(null)}}}/>
            {file ? (
              <>
                <div style={{fontSize:"26px",marginBottom:"6px"}}>{isPDF?"📄":"📝"}</div>
                <div style={{fontSize:"13px",fontWeight:700,color:t.accent}}>{file.name}</div>
                <div style={{fontSize:"11px",color:t.muted,marginTop:"3px"}}>{(file.size/1024).toFixed(1)} KB · нажми чтобы сменить</div>
              </>
            ):(
              <>
                <div style={{fontSize:"28px",marginBottom:"8px"}}>📂</div>
                <div style={{fontSize:"13px",color:t.muted}}>Перетащи файл или нажми</div>
                <div style={{fontSize:"11px",color:t.border,marginTop:"4px"}}>PDF · DOCX · DOC</div>
              </>
            )}
          </div>

          {/* Parse button */}
          <button onClick={handleParse} disabled={!file||status==="loading"}
            style={{width:"100%",padding:"12px",border:"none",borderRadius:"10px",fontSize:"13px",fontWeight:700,cursor:file&&status!=="loading"?"pointer":"not-allowed",background:!file?t.border:status==="loading"?t.card:t.accent,color:!file||status==="loading"?t.muted:"#0b1120",marginBottom:"12px",transition:"all 0.2s"}}>
            {status==="loading"?`⏳ ${progress||"Обрабатываю..."}`:"🚀 Запустить AI-парсинг"}
          </button>

          {/* Error */}
          {status==="error"&&(
            <div style={{background:"rgba(248,113,113,0.08)",border:"1px solid #f87171",borderRadius:"10px",padding:"10px 12px",marginBottom:"12px"}}>
              <div style={{fontSize:"12px",fontWeight:700,color:"#f87171",marginBottom:"3px"}}>❌ Ошибка</div>
              <div style={{fontSize:"11px",color:t.text}}>{errorMsg}</div>
            </div>
          )}

          {/* Result preview */}
          {status==="done"&&parsed&&(
            <div>
              <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
                <div style={{flex:1,background:"rgba(74,222,128,0.08)",border:"1px solid #4ade80",borderRadius:"10px",padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:"20px",fontWeight:900,color:"#4ade80"}}>{parsed.length}</div>
                  <div style={{fontSize:"10px",color:t.muted}}>{mode==="methodichka"?"туров":"лодок"} найдено</div>
                </div>
                {mode!=="methodichka"&&(
                  <div style={{flex:1,background:"rgba(56,189,248,0.08)",border:`1px solid ${t.accent}`,borderRadius:"10px",padding:"10px",textAlign:"center"}}>
                    <div style={{fontSize:"20px",fontWeight:900,color:t.accent}}>{parsed.reduce((a:number,b:any)=>a+(b.tours?.length||0),0)}</div>
                    <div style={{fontSize:"10px",color:t.muted}}>туров</div>
                  </div>
                )}
              </div>
              <div style={{background:t.card,border:`1px solid ${t.border}`,borderRadius:"10px",overflow:"hidden",marginBottom:"12px"}}>
                <div style={{padding:"8px 12px",borderBottom:`1px solid ${t.border}`,fontSize:"10px",color:t.muted,textTransform:"uppercase",letterSpacing:"0.6px"}}>Предпросмотр (первые 3)</div>
                <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:"6px"}}>
                  {parsed.slice(0,3).map((item:any,i:number)=>(
                    <div key={i} style={{fontSize:"11px",color:t.text}}>
                      <span style={{color:t.accent,fontWeight:700}}>{item.name}</span>
                      {item.tours&&<span style={{color:t.muted}}> · {item.tours.length} тур(а)</span>}
                      {item.price&&<span style={{color:"#fbbf24"}}> · {item.price}</span>}
                    </div>
                  ))}
                  {parsed.length>3&&<div style={{fontSize:"10px",color:t.muted}}>...и ещё {parsed.length-3}</div>}
                </div>
              </div>
              <div style={{background:"rgba(74,222,128,0.06)",border:"1px solid #4ade80",borderRadius:"8px",padding:"8px 12px",fontSize:"11px",color:"#4ade80",marginBottom:"4px"}}>
                ✅ Цены будут обновлены по совпадению названий. Новые записи будут добавлены.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {status==="done"&&parsed&&(
          <div style={{padding:"12px 18px 16px",borderTop:`1px solid ${t.border}`,flexShrink:0,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <button onClick={onClose} style={{padding:"11px",borderRadius:"10px",border:`1px solid ${t.border}`,background:"transparent",color:t.muted,fontSize:"13px",fontWeight:700,cursor:"pointer"}}>
              Отмена
            </button>
            <button onClick={handleApply} style={{padding:"11px",borderRadius:"10px",border:"none",background:"#4ade80",color:"#0a1f10",fontSize:"13px",fontWeight:800,cursor:"pointer"}}>
              ✅ Применить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════ МЕТОДИЧКА ═══════════

// ══════════════════════════════════════════════
// ТИПЫ
// ══════════════════════════════════════════════
interface MDay { day?: number; label?: string; items: string[] }
interface MTour {
  id: number; slug: string; cat: string
  name: string; nameEn: string; operator?: string
  duration: string; hotel?: string; single?: number
  price?: string; tags: string[]
  restrictions?: string; includes?: string
  route: MDay[]
}

// ══════════════════════════════════════════════
// ДАННЫЕ ТУРОВ
// ══════════════════════════════════════════════
const MTOURS: MTour[] = [
  // ── МОРСКИЕ ──────────────────────────────────
  { id:1, slug:"andaman-treasure", cat:"sea", name:"Сокровища Андамана 2д/1н", nameEn:"Andaman Treasure 2/1",
    operator:"SAWANU", duration:"2 дня / 1 ночь", hotel:"PP Mountain Beach Resort", single:1500,
    tags:["снорклинг","ночёвка","Пхи-Пхи","Краби"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ",
    includes:"Транспорт (автобус + лодка), вход в нац. парки, прохладительные напитки, чай/кофе, страховка, рус. гид, спас. жилеты, маски/трубки, питание, размещение в отеле",
    route:[
      {day:1,items:["06:30 Выезд из отелей","07:30 Савану Лаундж — регистрация","08:10 Пирс — отправление","08:50 Остров Панак","09:20 Остров Джеймса Бонда","10:10 Остров Талу — каноэ","11:10 Обед на острове Паньи","13:35 Пляж Пра Нанг (Райлэй) — пляж и пещера плодородия","14:30 Куриный остров (с катера)","15:10 Пхи-Пхи Дон — снорклинг","16:00 Заселение в отель","18:00 Ужин со смотровой площадкой","20:00 Файер-шоу и бар на пляже"]},
      {day:2,items:["07:30 Завтрак","09:00 Майя Бэй — пляж","10:00 Лагуна Пиле — купание с лодки","11:00 Пещера Викингов","11:15 Бухта Обезьян (с катера)","11:30 Пхи-Пхи Дон — снорклинг","12:20 Обед на Пхи-Пхи Дон","13:40 Остров Бамбу — пляж + снорклинг","15:00 Возвращение на Пхукет","16:00 Пристань"]},
    ],
  },
  { id:2, slug:"kohrok-phiphi-sawanu", cat:"sea", name:"Ко Рок + Пхи-Пхи 2д/1н", nameEn:"Koh Rok + Phi Phi 2/1",
    operator:"SAWANU", duration:"2 дня / 1 ночь", hotel:"PP Mountain Beach Resort", single:1500,
    tags:["снорклинг","ночёвка","Пхи-Пхи","Ко Рок","Ко Ха"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ",
    includes:"Транспорт, нац. парки, напитки, чай/кофе, страховка, рус. гид, маски/трубки, питание, отель",
    route:[
      {day:1,items:["06:30 Выезд","08:00 Пирс — отправление","10:15 Ко Рок Ной — снорклинг","11:15 Ко Рок Яй — пляж","12:15 Обед","14:00 Ко Хаа — снорклинг","15:30 Пхи-Пхи Дон — заселение","18:00 Ужин","20:00 Файер-шоу"]},
      {day:2,items:["07:30 Завтрак","09:00 Майя Бэй","10:00 Лагуна Пиле","11:00 Пещера Викингов","12:20 Обед","13:40 Остров Бамбу","16:00 Пристань"]},
    ],
  },
  { id:3, slug:"love-adventure", cat:"sea", name:"Love Adventure (Залив Пхангнга)", nameEn:"Love Adventure 1 Day",
    operator:"Love Andaman", duration:"1 день",
    tags:["каяки","Джеймс Бонд","Паньи","Пхангнга","морские цыгане"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ",
    includes:"Транспорт, нац. парки, питание, напитки и свежие фрукты, маски/трубки, страховка, рус. гид",
    route:[{items:["04:50–06:00 Трансфер из отеля","06:00 Завтрак на пирсе Love Andaman (сэндвичи, соки, чай/кофе)","06:30–07:30 Старт с пирса","07:30–09:00 Остров Хонг — смотровая площадка, пляжный отдых","09:50–10:20 Остров Джеймса Бонда — Као Пин Ган, скала Ко Тапу","10:30–11:00 Каяки — пещеры и мангровые заросли","11:10–12:00 Деревня Паньи — морские цыгане, обед шведский стол","12:25 Ко Панак — осмотр пещер с катера","13:00–14:30 Пляж Нака Яй","15:00 Пирс, трансфер"]}],
  },
  { id:4, slug:"tropical-islands", cat:"sea", name:"Тропические острова (Пхи-Пхи 1д)", nameEn:"Tropical Islands 1 Day",
    operator:"SAWANU", duration:"1 день",
    tags:["Пхи-Пхи","Майя Бэй","Лагуна Пиле","снорклинг","Остров Пода"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ",
    includes:"1 обед, транспорт, нац. парк, напитки, фрукты, чай/кофе, страховка, рус/англ. гид, маски/трубки",
    route:[{items:["07:00 Сбор по отелям","07:30 Пирс","09:00 Майя Бэй — пляж из фильма «Пляж»","10:00 Лагуна Пиле — самая глубокая лагуна Таиланда","11:00 Пещера Викингов — наскальные рисунки","11:10 Пляж Обезьян","11:20 Снорклинг у Пхи-Пхи Дон","12:00 Обед на Пхи-Пхи Дон","13:00 Остров Бамбу — кристально чистая вода","14:20 Остров Курицы — фото без высадки","14:30 Остров Пода — снорклинг","15:15 Остров Пода — пляж","17:00 Пирс"]}],
  },
  { id:5, slug:"dolce-vita-sunset", cat:"sea", name:"Дольче Вита Сансет (всё включено)", nameEn:"Dolce Vita Sunset Cruise",
    operator:"Dolce Vita", duration:"1 день",
    tags:["катамаран","закат","Коралловый остров","всё включено","безлимитный бар"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ. На борту фото/видео команда (за доп. плату)",
    includes:"Транспорт, катамаран, ужин, БЕЗЛИМИТНЫЙ алкогольный бар, напитки, фрукты, водные горки, пляж, страховка, рус/англ. гид, шоуман, диджей. Шезлонги на Коралловом острове включены",
    route:[{items:["08:30 Выезд из отеля","10:00 Пирс — лёгкий перекус, инструктаж","11:30 Отправление","12:00 Шоу-анимация на русском","14:00 Коралловый остров — пляж 2 часа, снорклинг, волейбол","15:30 Ужин на катамаране","16:30 Купание, водные горки","18:15 Мыс Промтхеп — встреча заката с коктейлем в ананасе","18:40 Пенная вечеринка с диджеем","19:50 Пирс, трансфер в отель"]}],
  },
  { id:6, slug:"dolce-vita-coral", cat:"sea", name:"Дольче Вита + Рача + Корал (всё включено)", nameEn:"Dolce Vita + Coral",
    operator:"Dolce Vita", duration:"1 день",
    tags:["катамаран","Ко Рача","Корал","всё включено","рыбалка","безлимитный бар"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ",
    includes:"Транспорт, катамаран, обед, БЕЗЛИМИТНЫЙ бар, водные горки, пляж, страховка, рус/англ. гид, шоуман, диджей",
    route:[{items:["07:30 Выезд","09:00 Отправление","09:30 Шоу-анимация на русском","11:00 Ко Рача — пляж, снорклинг (шезлонги включены)","11:20 Рыбалка с борта для желающих","14:00 Обед","14:15 Живое исполнение песен","15:40 Коралловый остров — высадка по желанию","16:40 Свежие фрукты","17:00 Остров Яо — купание, водные горки","18:00 Пенная вечеринка","19:00 Пирс, трансфер"]}],
  },
  { id:7, slug:"exotic-island", cat:"sea", name:"Экзотические острова (Пхи-Пхи + Бонд)", nameEn:"Exotic Island",
    operator:"SAWANU", duration:"1 день",
    tags:["Джеймс Бонд","Пхи-Пхи","Майя Бэй","каноэ","Лагуна Пиле"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ",
    includes:"1 обед, транспорт, напитки и фрукты на борту, нац. парки, маски/трубки, страховка, рус/англ. гид",
    route:[{items:["06:30 Выезд","08:00 Пирс — отправление","08:40 Остров Панак (с катера)","09:00 Остров Хонг — каноэ","10:00 Остров Джеймса Бонда — прогулка по Као Пин Ган","10:50 Остров Паньи (с катера)","11:00 Обед на острове Паньи","13:20 Остров Бамбу — пляж + снорклинг","14:30 Бухта Обезьян (с катера)","14:50 Пещера Викингов (с катера)","15:10 Лагуна Пиле — купание с катера","16:00 Майя Бэй — пляж","18:00–18:30 Пристань Пхукета"]}],
  },
  { id:8, slug:"kohrok-phiphi-dolce", cat:"sea", name:"Ко Рок + Пхи-Пхи 2д/1н (Dolce)", nameEn:"Koh Rok + Phi Phi Dolce",
    operator:"Dolce", duration:"2 дня / 1 ночь", hotel:"Phi Phi Andaman Resort", single:1500,
    tags:["Ко Рок","Пхи-Пхи","Ко Ха","снорклинг","ночёвка","огненное шоу"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ",
    includes:"Транспорт, нац. парки, напитки, страховка, рус/англ. гид, маски/трубки, отель (deluxe)",
    route:[
      {day:1,items:["09:00 Отплытие на Ко Ха","10:30 Снорклинг — богатый подводный мир","11:30 Ко Рок — пляж и снорклинг","14:00 Обед на пляже «пикник»","15:00 Отправление на Пхи-Пхи Дон","16:00 Заселение в отель (deluxe). Свободное время","17:00 Смотровая площадка острова","19:00 Ужин","20:45 Огненное шоу, бар с тайским боксом"]},
      {day:2,items:["07:00 Завтрак","07:45 Пхи-Пхи Лей","08:00 Майя Бэй","10:00 Лагуна Пиле","10:40 Пещера Викингов","11:00 Пляж обезьян","11:20 Обед","12:40 Остров Бамбу","15:00 Пирс, трансфер"]},
    ],
  },
  { id:9, slug:"kohrok-koha", cat:"sea", name:"Ко Рок + Ко Ха (1 день)", nameEn:"Ko Rok Ko Ha",
    operator:"SAWANU", duration:"1 день",
    tags:["Ко Рок","Ко Ха","снорклинг","коралловые рифы"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ",
    includes:"Транспорт, нац. парки, напитки, страховка, рус/англ. гид, маски/трубки",
    route:[{items:["07:30 Регистрация на пирсе","08:00 Отправление","10:15 Ко Рок Ной (Малый Остров Белок) — снорклинг. Богатый подводный мир, чистейшие пляжи","11:15 Ко Рок Яй (Большой Остров Белок) — пляжный отдых. Белоснежный песок, коралловые рифы","12:15 Обед на Ко Рок Яй","14:00 Ко Хаа (Остров 5 Скал) — снорклинг. Архипелаг из 5 островов, бирюзовые воды","15:00 Отправление на Пхукет","16:40 Пирс"]}],
  },
  { id:10, slug:"kohrok-lanta", cat:"sea", name:"Ко Рок + Ланта 2д/1н", nameEn:"Koh Rok + Lanta 2/1",
    operator:"SAWANU", duration:"2 дня / 1 ночь", hotel:"Lanta Pura Beach Resort", single:1500,
    tags:["Ко Рок","Ланта","Изумрудная пещера","снорклинг","ночёвка"],
    restrictions:"⚠️ Отель на севере Ланты — БОЛЬШИЕ ОТЛИВЫ у пляжа. Обязательно предупреждать гостей! При отеле есть бассейн",
    includes:"Транспорт, нац. парки, напитки, страховка, рус/англ. гид, маски/трубки, отель",
    route:[
      {day:1,items:["06:30 Сбор из отелей","08:00 Пирс — отправление","10:00 Изумрудная пещера Моракот (о. Мук) — туннель 80 м, изумрудный свет, тайная лагуна с белым пляжем","11:00 Пляж Крадан — мягкий белый песок, бирюзовая вода, снорклинг","13:00 Обед на Крадане","14:00 Река Ланта — мангровые леса, редкие птицы, дикие маки","15:10 Заселение в отель на Ланте","19:00 Закат","20:00 Фейерверк"]},
      {day:2,items:["07:30 Завтрак","08:00 Отплытие","09:00 Ко Рок Яй — снорклинг. Коралловые рифы в нескольких метрах от берега","10:00 Ко Рок Яй — снорклинг + пляжный отдых","12:00 Обед","14:30 Ко Рок Ной — снорклинг с пляжа","15:00 Ко Хаа — снорклинг. 5 скалистых островков, прозрачная вода","16:00 Возвращение","17:30 Пирс Пхукета"]},
    ],
  },
  { id:11, slug:"star-islands-krabi", cat:"sea", name:"Звёздные острова 2д/1н + Краби", nameEn:"Star Islands + Krabi 2/1",
    operator:"Dolce", duration:"2 дня / 1 ночь", hotel:"ARAWAN Krabi", single:1500,
    tags:["Пхи-Пхи","Краби","Майя Бэй","слоны","рафтинг","ночёвка"],
    includes:"Транспорт, нац. парки, напитки, страховка, рус/англ. гид, маски/трубки, отель",
    route:[
      {day:1,items:["06:00 Выезд","07:30 Пирс — перекус, инструктаж","08:30 Отправление","09:25 Майя Бэй — пляж из фильма «Пляж»","10:15 Лагуна Пи Ле — глубокая лагуна, известняковые скалы","10:45 Пещера Викингов","10:55 Пляж с обезьянами","11:10 Обед на Пхи-Пхи Дон","12:15 Остров Бамбу — снорклинг на Shark Point","14:15 Остров Курицы","14:25 Остров Пода — снорклинг","16:10 Пирс Ао Нанг (Краби) — заселение в отель","19:00 Ужин"]},
      {day:2,items:["08:00 Завтрак","09:00 Выезд","10:15 Храм Ват Лаем Сак — смотровая","11:30 Заповедник Тха Пом (нац. парк)","12:30 Бамбуковый рафтинг","13:30 Слоны: катание 30 мин + обед + кафе на холме","16:20 Трансфер на пирс","18:00 Пирс Пхукета"]},
    ],
  },
  { id:12, slug:"phiphi-overnight", cat:"sea", name:"Пхи-Пхи Overnight 2д/1н", nameEn:"Phi Phi Eco 2/1",
    operator:"Dolce", duration:"2 дня / 1 ночь", hotel:"Phi Phi Nice Beach", single:1500,
    tags:["Пхи-Пхи","Майя Бэй","Бамбу","ночёвка","снорклинг","огненное шоу"],
    includes:"Транспорт, нац. парки, напитки, страховка, рус/англ. гид, маски/трубки, отель",
    route:[
      {day:1,items:["07:30 Выезд","08:30 Пирс — перекус, инструктаж","09:30 Отправление","10:30 Остров Бамбу — белый коралловый песок","11:45 Снорклинг в бухте Тонсай","12:35 Пляж с обезьянами","12:50 Обед на Пхи-Пхи","13:30 Майя Бэй — пляж из фильма «Пляж»","14:20 Лагуна Пи Ле — купание в глубокой лагуне","15:10 Пещера Викингов","15:30 Заселение в отель. Свободное время","19:00 Ужин","20:00 Огненное шоу, бар с тайским боксом, ночная жизнь"]},
      {day:2,items:["07:00 Завтрак. Расслабляющее свободное утро","11:00 Выселение + обед","12:30 Остров Кхай Нок — пляж, снорклинг","15:00 Пирс Пхукета"]},
    ],
  },
  { id:13, slug:"phiphi-bamboo", cat:"sea", name:"Пхи-Пхи + Бамбу (1 день)", nameEn:"Phi Phi + Bamboo 1 Day",
    operator:"Love Andaman", duration:"1 день",
    tags:["Пхи-Пхи","Майя Бэй","Бамбу","Лагуна Пи Ле","снорклинг"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ. ⚠️ Купание в Майя Бэй ЗАПРЕЩЕНО",
    includes:"Транспорт (минибас + скоростная лодка), нац. парки, завтрак на пирсе, обед шведский стол, напитки, страховка, рус. гид, маски/трубки",
    route:[{items:["04:50–06:00 Трансфер","06:00 Завтрак на пирсе (сэндвичи, сладости, соки, чай/кофе)","06:35 Отправление на скоростной лодке","07:30–08:15 Майя Бэй — джунгли, знаменитая бухта. ❌ КУПАНИЕ ЗАПРЕЩЕНО","08:15–09:10 Лагуна Пи Ле — изумрудная кристальная вода","09:10 Пещера Викингов","09:30 Скала Обезьян — дикие обитатели джунглей","09:40 Снорклинг в бухте Пхи-Пхи Дон","10:40 Обед шведский стол с видом на море","12:00–13:30 Остров Бамбу — пляжный отдых","14:30 Пирс Пхукета"]}],
  },
  { id:14, slug:"phiphi-catamaran", cat:"sea", name:"Пхи-Пхи Катамаран + Майтон", nameEn:"Phi Phi Catamaran",
    operator:"Love Andaman", duration:"1 день",
    tags:["катамаран","Пхи-Пхи","Майтон","Лагуна Пи Ле","снорклинг","закат","горка","сапборд"],
    restrictions:"⚠️ Купание в Майя Бэй ЗАПРЕЩЕНО. 1 июля–1 октября высадка в бухте запрещена. Пирс: Visit Panwa",
    includes:"Транспорт, катамаран, нац. парки, завтрак, обед, напитки, снэк-бар, страховка, рус/англ. гид, маски/трубки. Лонгтейл в Лагуне Пи Ле включён",
    route:[{items:["07:00–08:00 Трансфер","09:00 Пирс Visit Panwa — завтрак, инструктаж","10:00 Отправление на катамаране","11:00 Лагуна Пи Ле — катание на тайской лонгтейл-лодке (включено)","12:00 Майя Бэй — пляж из фильма «Пляж». ❌ КУПАНИЕ ЗАПРЕЩЕНО","13:30 Пхи-Пхи Дон — обед, свободное время","15:00 Снорклинг","15:50 Переход на остров Майтон","16:40 Майтон (без высадки) — пуфы, горка, сапборд, снорклинг. Снэк-бар: барбекю, кексы, панна-котта, «Китовая акула»","18:00 Закат во время возвращения","18:20 Пирс Пхукета"]}],
  },
  { id:15, slug:"ocean-legends", cat:"sea", name:"Легенды Океана (Краби)", nameEn:"Ocean Legends",
    operator:"Dolce", duration:"1 день",
    tags:["Краби","Хонг","Яо Яй","Пак Биа","снорклинг"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ. ⚠️ Лагуна Хонг не посещается при отливе",
    includes:"Транспорт, нац. парки, напитки, страховка, рус/англ. гид, маски/трубки",
    route:[{items:["07:30 Выезд","08:30 Пирс — перекус, инструктаж","09:30 Отправление","— Коса Яо Яй — фотостоп без высадки","— Пляж Палм Бич — купание","— Потайная лагуна Хонг (только при приливе)","— Остров Хонг: смотровая, пляж, снорклинг, обед","— Остров Лао Ладин — прогулка, купание","— Остров Пак Биа — пляж","16:00 Пирс, трансфер"]}],
  },
  { id:16, slug:"surin-islands", cat:"sea", name:"Острова Сурин", nameEn:"Surin Islands",
    operator:"Love Andaman", duration:"1 день",
    tags:["Сурин","снорклинг","морские цыгане мокены","нац. парк"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ. Рус. гид — ВТОРНИК и ПЯТНИЦА. Места ТОЛЬКО ПО ЗАПРОСУ",
    includes:"Транспорт, нац. парки, завтрак, обед шведский стол, лёгкий ужин на пирсе, напитки, страховка, гид (вт/пт), маски/трубки",
    route:[{items:["05:00–07:00 Трансфер (Пхукет или Каолак)","07:00 Пирс Табламу — завтрак (сэндвичи, каша, сок, чай/кофе), брифинг","08:00–10:00 Отправление к архипелагу Сурин","10:00–11:00 Снорклинг в бухтах «Немо» / «Ананасовая». Пляж Твин для не-снорклеров","11:00–11:45 Деревня морских цыган мокенов. Доп. опция: аренда лодки для снорклинга в секретных местах (бронировать заранее)","11:45–13:00 Остров Сурин Ныа — обед шведский стол без ограничений","13:00–15:00 Снорклинг в бухтах Мэ Яй и Тао — кораллы и морские обитатели","15:00–17:00 Отправление на пирс","17:00–17:30 Ужин на пирсе: шашлычки, лапша, кокосовое мороженое","17:30–19:30 Трансфер в отели"]}],
  },
  { id:17, slug:"similan-speedboat", cat:"sea", name:"Симиланские острова", nameEn:"Similan Islands",
    operator:"Love Andaman", duration:"1 день",
    tags:["Симиланы","снорклинг","черепахи","Медовая луна","смотровая Парус"],
    restrictions:"Беременные, дети до 1 года, лица старше 70 лет — НЕ ДОПУСКАЮТСЯ. ⏰ С ноября по май, ежедневно",
    includes:"Транспорт (минибас + скоростная лодка), нац. парки, завтрак на пирсе, обед шведский стол, перекус, напитки, страховка, рус. гид, маски/трубки",
    route:[{items:["05:00–06:30 Трансфер","06:30 Завтрак на пирсе Love Andaman (сэндвичи, сладости, соки)","07:00 Отправление к Симиланским островам","08:20–11:00 Остров №4 Мианг. Пляжи «Медовая луна» и Принцессы. Разделение: снорклеры — к бухте (шанс поплыть с синей морской черепахой 🐢), остальные — на острове. Обед шведский стол","11:00 Переход к острову №9","11:15–11:45 Залив «Корал» острова №9 Бангу — снорклинг (разноцветные рыбы и кораллы). Команда помогает слабым пловцам!","11:55–13:25 Остров №8 Симилан — смотровая «Парус» (фото!), прогулка, Никобарские голуби и бенгальские вараны","13:30 Свежие фрукты и десерты. Отправление на пирс","14:45 Тапламу — перекус (шашлычки, лапша, кокосовое мороженое)","15:10–16:40 Трансфер в отели"]}],
  },
  { id:18, slug:"similan-catamaran", cat:"sea", name:"Симиланы Катамаран Ирбис-1", nameEn:"Similan Catamaran Irbis-1",
    operator:"Turan / Irbis", duration:"1 день",
    tags:["Симиланы","катамаран","снорклинг","40–60 чел"],
    restrictions:"⚠️ При отказе со справкой — штраф 1250 бат/чел (нац. парк + обед). Катамаран для нахождения на борту ВЕСЬ ДЕНЬ, не трансфер. 2 сан. узла, просторный 2-й этаж с навесом",
    includes:"Транспорт (автобус + катамаран Turan или Irbis), нац. парки, маски и ласты, страховка, рус. гид. ПИТАНИЕ: завтрак (яйца, картофель фри, сосиски, тосты с джемом), обед (жареный рис, курица с кешью, рыба, салат), ужин (пад тай, сом там, чай/кофе), 2× фрукты + сэндвичи с тунцом",
    route:[{items:["05:30–06:30 Пикап из отеля","08:00 Тапламу — завтрак на борту","08:30 Старт на Симиланы","10:30 Прибытие — первый снорклинг","11:30 Остров №8 — смотровая «Парус», пляж","13:00 Ланч на лодке. Переход ко второй точке снорклинга","13:40 Второй снорклинг","15:00 Старт обратно","17:00 Тапламу — перекус, трансфер по отелям","19:30–20:00 Отель"]}],
  },
  // ── ДАЙВИНГ ──────────────────────────────────
  { id:19, slug:"diving-phi-phi", cat:"diving", name:"Дайвинг на Пхи-Пхи", nameEn:"Diving Phi Phi",
    duration:"1 день",
    price:"Дайвер: 5500 + 600 бат нац. парк. No Dive (снорклинг): 2900 + 400 бат нац. парк. Дети: 5500/2500 + нац. парк",
    tags:["дайвинг","Пхи-Пхи","сертификат","снорклинг","Open Water"],
    restrictions:"⚠️ Погружаться ТОЛЬКО при наличии сертификата (мин. Open Water Diver). Нац. парк оплачивается НА МЕСТЕ: дайвер 600 бат, сопровождающий 400 бат. Дни — по запросу",
    includes:"Транспорт, оборудование для дайвинга/снорклинга, обед, безалкогольные напитки, инструктор",
    route:[{items:[
      "⚠️ Только профессиональные дайверы — мин. сертификат Open Water Diver",
      "",
      "08:30–09:00 Отправление с пирса",
      "09:00–09:30 Инструктаж на лодке, завтрак",
      "10:30–11:10 Первое погружение (дайверы) / снорклинг (сопровождающие)",
      "11:20–12:00 Отдых, закуски, фрукты",
      "12:30–13:10 Второе погружение / снорклинг",
      "13:10–15:10 Обед, отдых",
      "15:30–16:00 Прибытие на пирс",
      "",
      "📌 На месте: по возможности можно доплатить за 3-е погружение (уточнять у инструктора)",
      "📸 Фото/видео съёмка под водой: 1500 бат/чел — оплата ТОЛЬКО инструктору",
    ]}],
  },
  { id:20, slug:"diving-racha", cat:"diving", name:"Дайвинг на Рача Яй", nameEn:"Diving Racha Yai",
    duration:"1 день",
    price:"С сертификатом: 4700 бат (4500 для серт). Снорклинг: 2900 / 2500 бат",
    tags:["дайвинг","Рача","снорклинг","Open Water","DSD","корабль 18–20 м"],
    restrictions:"⚠️ ЗАПРЕЩЕНО: дети до 10 лет, за 18 ч до вылета. При бронировании ОБЯЗАТЕЛЬНО указать: рост, вес, размер одежды, размер ноги дайвера. Дни — по запросу. Корабль (18–20 м) — не гарантируется, не всегда доступен",
    includes:"Транспорт, оборудование для дайвинга/снорклинга, обед, безалкогольные напитки, инструктор",
    route:[{items:[
      "Доплата за трансфер:",
      "• Найянг/Майкао/Панва: 3400 бат / инд. трансфер",
      "• Сурин/Бангтао/Лагуна: +700 бат/чел",
      "• Камала: +400 бат/чел",
      "• Найтон: +800 бат/чел",
      "",
      "08:30–09:00 Отправление с пирса",
      "09:00–09:30 Инструктаж на лодке, завтрак",
      "Брифинг по ограничениям здоровья. Дайверы подписывают медицинскую анкету и документы по безопасности",
      "",
      "Для новичков (DSD): глубина до 12 м, акцент на безопасность",
      "Для сертифицированных: брифинг по точке погружения, напоминание сигналов",
      "Для снорклеров: брифинг по маске/трубке/спасжилету",
      "",
      "10:30–11:10 Первое погружение 30–35 мин / снорклинг",
      "11:20–12:00 Отдых, закуски, фрукты",
      "12:30–13:10 Второе погружение 30–35 мин / снорклинг",
      "13:10–15:10 Обед, отдых",
      "15:30–16:00 Пирс",
      "",
      "📸 Фото/видео: 1500 бат/чел — оплата ТОЛЬКО инструктору на месте",
    ]}],
  },
  { id:21, slug:"diving-courses", cat:"diving", name:"Курсы дайвинга", nameEn:"Diving Courses",
    duration:"1–3 дня",
    price:"18 000 бат",
    tags:["дайвинг","сертификат","обучение","OWD","AOWD","Rescue"],
    restrictions:"Получение сертификата для детей — с 10 лет (OWD Junior / Advance). Дни — по запросу. Алгоритм: передать ФИО + телефон экскурсионному диспетчеру — инструктор свяжется сам",
    includes:"Инструктор, бассейн (1-й день), погружения (2–3-й день), теория",
    route:[{items:[
      "Open Water Diver Full — 3 дня, 4 погружения",
      "День 1: занятия в бассейне + теоретические основы",
      "День 2–3: по 2 погружения с инструктором",
      "Бонус гиду: 300 бат/чел",
      "",
      "Advanced Open Water — 2 дня, 5 погружений",
      "Глубокое погружение (30 м) + подводное ориентирование — обязательны",
      "Открывает погружения до 30 м, расширенный доступ к маршрутам",
      "Бонус гиду: 200 бат/чел",
      "",
      "Emergency First Responder — 1 день",
      "Курс первой помощи: СЛР, повязки, перегрев/переохлаждение, утопление, ожоги, укусы",
      "Рекомендован всем — и дайверам, и не-дайверам",
      "Бонус гиду: 100 бат/чел",
      "",
      "Rescue Diver — 2 дня",
      "Предотвращение несчастных случаев, действия в аварийных ситуациях, медицинская помощь",
      "",
      "Specialty Course — по запросу",
      "Мастерство плавучести, течение, обогащённый воздух, ориентирование и др.",
      "Бонус гиду: 200 бат/чел",
    ]}],
  },
  // ── РЫБАЛКА ──────────────────────────────────
  { id:22, slug:"fishing-group", cat:"fishing", name:"Морская рыбалка (группа)", nameEn:"Sea Fishing Group",
    operator:"Eco Group", duration:"1 день",
    price:"Рыбак: 2900 бат / Сопровождающий: 1900 бат",
    tags:["рыбалка","троллинг","донная","снорклинг","Рая Яй"],
    restrictions:"⚠️ ИНФАНТЫ НЕ ДОПУСКАЮТСЯ. Без рус. гида. Группа до 15 чел (Join, межнациональная). Ката/Карон/Патонг — пикап бесплатный. Дальние районы — пикап платный. Наличие ваучера ОБЯЗАТЕЛЬНО",
    includes:"Транспорт, напитки, страховка, маски/трубки. Обед сет-меню + безалк. напитки",
    route:[{items:["07:00–09:00 Трансфер из отеля","10:00 Пирс Чалонг — отправление","10:30 Троллинг — 5 удочек, рыбу тянут все по очереди. Приманки: блёсны, воблеры, джиги, живец","11:30–12:30 Бухта Рая Яй — снорклинг у борта лодки","12:30–13:00 Обед сет-меню + безалкогольные напитки","13:30 Троллинг + донная рыбалка на обратном пути (~45 мин, лодка на якоре)","15:30–16:00 Пирс, трансфер"]}],
  },
  { id:23, slug:"fishing-red-dragon", cat:"fishing", name:"Морская рыбалка Red Dragon (VIP)", nameEn:"Sea Fishing Red Dragon",
    operator:"Red Dragon", duration:"1 день",
    price:"Рыбак: 4900 бат / Сопровождающий: 2500 бат",
    tags:["рыбалка","VIP","малая группа","рус. гид включён","троллинг"],
    restrictions:"⚠️ ИНФАНТЫ НЕ ДОПУСКАЮТСЯ. Макс. 8 чел (6 рыбаков + 2 сопр.). Найтон/Наянг +400 бат. Майкао/Панва — только инд. трансфер. По системе бронирования",
    includes:"Транспорт, напитки, страховка, маски/трубки. Обед сет-меню. ✅ РУС. ГИД ВКЛЮЧЁН!",
    route:[{items:["06:30–07:30 Трансфер","08:30 Пирс Чалонг — отправление","09:00 Троллинг (малая элитная группа с рус. гидом)","11:00–12:00 Бухта Рая Яй — снорклинг у борта","12:30–13:00 Обед сет-меню","13:30 Троллинг + донная рыбалка (~45 мин)","15:30–16:00 Пирс, трансфер"]}],
  },
  // ── СУХОПУТНЫЕ ───────────────────────────────
  { id:24, slug:"city-tour-free", cat:"land", name:"Сити-тур (бесплатный)", nameEn:"City Tour Free",
    duration:"1 день",
    tags:["Ват Чалонг","латекс","змеиная ферма","Моринга","бесплатно"],
    route:[{items:["08:00–09:00 Трансфер","09:30–10:15 Храм Ват Чалонг (в праздники может меняться)","10:20–11:00 Фабрика латекса","11:15–12:00 Змеиная ферма","12:15–13:00 Тайская народная аптека Моринга"]}],
  },
  { id:25, slug:"wonders-of-phuket", cat:"land", name:"City Tour — Wonders of Phuket (BG)", nameEn:"Wonders of Phuket",
    operator:"BG Asia", duration:"1 день",
    tags:["Ват Чалонг","Simon Cabaret","Ханумана","Моринга","латекс"],
    route:[{items:["10:00/11:20 Пикап (Big C) — или — 10:40/11:40 (Ката Хилл)","11:40/12:00 Quatex (музей сна, шоппинг) — ИЛИ — Змеиная ферма BSP/Thaiko (шоу 15 мин + шоппинг 45 мин)","13:00 Обед в Hanuman World (1 час)","14:00/14:40 Serpentarium — ИЛИ — Sanbada Latex (презентация + шоппинг 40 мин)","15:40 Moringa / Renala (презентация 20 мин + шоппинг 40 мин)","17:40 Simon Cabaret: 20 мин отдых + 1 ч шоу + 15 мин фото после шоу","19:15 Трансфер в отель (или остаться в Патонге)"]}],
  },
  { id:26, slug:"asia-safari", cat:"land", name:"Asia Safari 1 день (Каолак)", nameEn:"Asia Safari 1 Day",
    duration:"1 день",
    tags:["слоны","рафтинг","пещера","купание со слонами","водопад"],
    restrictions:"⚠️ При посещении храмов — доп. оплата входа. Открытые плечи/колени — одежда от храма за доп. плату",
    includes:"Транспорт, питание, рус. гид, страховка, нац. парк, программа со слонами (катание + купание), плоты/каноэ",
    route:[{items:["06:30 Выезд из отеля","08:30 Храм Суван Куха (Храм Обезьян) — пещера со сталактитами и летучими мышами, статуя Будды","09:30 Водопад — купание (зависит от сезона)","10:15 Слоновий СПА: купание со слоном + шоу слонёнка + катание на слонах (ВКЛЮЧЕНО ВСЁ)","12:00 Сплав на бамбуковых плотах по реке в джунглях","13:00 Обед (традиционная тайская кухня)","15:30 Мост Сарасин — обзорная площадка","16:00 Отель"]}],
  },
  { id:27, slug:"amazing-phangnga", cat:"land", name:"Удивительная Пхангнга", nameEn:"Amazing Phang Nga",
    duration:"1 день",
    tags:["Пхангнга","слоны","рафтинг","пляж с самолётами","морские цыгане","Самет Нангши"],
    restrictions:"⚠️ Пляж с самолётами: рекомендуется 20 бат на тук-тук",
    includes:"Транспорт, питание, рус. гид, страховка, нац. парк, программа со слонами",
    route:[{items:["07:00 Выезд","09:00 Пляж с самолётами — фото на фоне садящихся и взлетающих самолётов","10:30 Слоновий СПА: купание + шоу слонёнка + катание","11:30 Сплав на бамбуковых плотах","13:00 Деревня морских цыган — осмотр плавучей деревни","13:15 Катание на традиционной тайской лодке","13:30 Обед из морепродуктов в деревне (краб, креветки, рыба, кальмары)","15:30 Храм Обезьян","17:00 Самет Нангши — смотровая площадка Beyond Sky Walk, свободное время, фото","18:00 Выезд в отель"]}],
  },
  { id:28, slug:"mantra-spa", cat:"land", name:"Мантра / Mantra Forest Spa", nameEn:"Mantra Forest Spa",
    duration:"1 день",
    tags:["спа","онсэн","Джеймс Бонд","рассвет","Самет Нангши","каноэ","грязевые ванны"],
    restrictions:"Программа на минивэнах по 12 чел. 1 гид на 2 вэна. Взять: купальник, полотенце, палантин/рубашку (рассвет — прохладно)",
    includes:"Трансфер, VIP Longtail (Джеймс Бонд + каноэ), Mantra Forest Spa (онсэн, грязевые + фруктовые ванны, ледяная купель, минеральный водопад, сауна), обед. ⚠️ С высадкой на Острове Джеймса Бонда!",
    route:[{items:["03:50–05:00 Сбор гостей из отелей","06:00–07:30 Стеклянный мост + смотровая Самет Нангши — рассвет над заливом Пхангнга, панорама островов. Завтрак с видом на море","07:45–09:00 Морская прогулка VIP Longtail: остров Джеймса Бонда + каноэ по лагунам и гротам","09:30–12:00 Mantra Forest Spa: онсэн, грязевые и фруктовые ванны, ледяная купель, озеро с кувшинками, минеральный водопад, сауна, зоны отдыха","12:00–12:30 Обед в окружении тропической природы","14:00 Возвращение в отель"]}],
  },
  { id:29, slug:"cheow-lan", cat:"land", name:"Чео Лан 2д/1н", nameEn:"Cheow Lan 2/1 Group",
    duration:"2 дня / 1 ночь", hotel:"PHUTAWAN", single:2500,
    tags:["Чео Лан","слоны","рафтинг","озеро","ночёвка","нет мобильной связи"],
    restrictions:"Нет мобильной связи и интернета на озере. Древнейшие тропические леса планеты. При посещении храмов — доп. оплата",
    includes:"Транспорт, 1 завтрак, 1 обед, 1 ужин, рус. гид, страховка, нац. парк, отель PHUTAWAN, лодка. Каяки в отеле бесплатно",
    route:[
      {day:1,items:["06:45 Выезд из отелей","09:00 Храм Суван Куха — кормление обезьян, фото","12:30 Суратани — 7-Eleven перед озером","13:00 Пирс Чео Лан — тайская лодка, осмотр озера, фото у горы Гуилинь","14:20 Обед в плавучем ресторане. Заселение. Купание в озере, каяки (бесплатно)","20:00 Ужин"]},
      {day:2,items:["07:00 Завтрак","09:00 Выселение","11:00 Смотровая с видом на озеро","12:40 Храм Ват Банг Тонг — один из красивейших храмов юга Таиланда","13:40 Слоновник Като Вонгкот (Краби) — сплав на бамбуковых плотах + обед + катание на слонах","16:30 Выезд на Пхукет","18:00 Аптека традиционной тайской медицины"]},
    ],
  },
  { id:30, slug:"jungle-escape", cat:"land", name:"Побег из джунглей 2д/1н (Kao Sok)", nameEn:"Jungle Escape 2/1",
    duration:"2 дня / 1 ночь", hotel:"Khao Sok Boutique Hideaway", single:1500,
    tags:["Kao Sok","Чео Лан","слоны","рафтинг","ночёвка","кемпинг-комфорт"],
    restrictions:"Программа на большом автобусе. Отель: кемпинг-атмосфера с полным комфортом и всеми удобствами",
    includes:"Транспорт, 1 завтрак, 2 обеда, 1 ужин, рус. гид, страховка, нац. парк, отель, лодка. Нац. парк Као Сок — один из старейших тропических лесов планеты (700+ км²). Озеро Чео Лан — 165 км², создано в 1982 г.",
    route:[
      {day:1,items:["07:00–08:30 Выезд из Пхукета","10:00 Храм Суван Куха (Храм Обезьян)","12:20 Смотровая с панорамой на Чео Лан","13:00–16:00 Лодочное сафари: тайская лодка среди известняковых скал, обед в ресторане на воде, каяки и свободное время","17:30 Заселение в Khao Sok Boutique Hideaway","18:30 Ужин в отеле"]},
      {day:2,items:["07:00 Завтрак. Выселение","09:30–11:00 Катание на слонах по живописной местности","11:10–12:30 Купание со слонами + кормление","13:00 Обед","13:40 Сплав на бамбуковых плотах по реке","14:20 Bridge Hill Café — свободное время","16:30 Аптека тайской храмовой медицины (River Kwai)","17:30–18:45 Возвращение в отели Пхукета"]},
    ],
  },
  { id:31, slug:"way-to-avatar", cat:"land", name:"Путь Аватара", nameEn:"Way to Avatar",
    duration:"1 день",
    tags:["Пхангнга","слоны","Mantra","Самет Нангши","карены","массаж","водопад"],
    restrictions:"⚠️ При посещении храмов — доп. оплата. Открытые плечи/колени — одежда за доп. плату",
    includes:"Транспорт, 1 обед, рус. гид, страховка, нац. парк",
    route:[{items:["07:20–09:00 Выезд","09:30 Самет Нангши — море, острова и горы","10:15 Лонгтейл — мангровые леса и сталактитовые пещеры","11:00 Музей Беньярана — история и культура Таиланда","11:40 Деревня длинношеих женщин (Карены) — традиция веками","12:10 Купание со слонами","12:50–13:30 Обед","13:40 Массаж с травяными мешочками — ароматные травы","14:10 Райский водопад","14:50–16:50 Mantra Forest Spa (онсэн, сауна, фруктовые и травяные ванны, ледяная купель)","18:00 Возвращение в отель"]}],
  },
  { id:32, slug:"hanuman-world", cat:"land", name:"Мир Ханумана (зиплайн)", nameEn:"Hanuman World",
    duration:"1–3 часа",
    price:"A: 3500 / B: 2900 / C: 2500 бат. Roller Zipline — экстра-сервис. Luge 600 м: 1 спуск 790 / 2 спуска 890 / 3 спуска 990 бат",
    tags:["зиплайн","Skybridge","Skywalk","Roller","Luge 600 м","активный отдых"],
    restrictions:"⚠️ 60 лет+ — ЗАПРЕЩЕНО. До 4 лет и беременные — НЕ ДОПУСКАЮТСЯ. Макс. вес 120 кг (Roller: 40–100 кг). Нельзя: алкоголь, диабет, эпилепсия, травмы спины/ног/шеи",
    route:[{items:["Программа A (3 ч): 16 зиплайнов, 3 Abseil, 5 Sky Bridges, 2 Spiral, 1 Dual, Roller, Skywalk, обед — 08:00/10:00/13:00","Программа B (2 ч): 9 зиплайнов, 3 Abseil, 2 Bridges, 1 Spiral, 1 Dual, Roller, Skywalk, обед — 08:00/10:00/13:00/15:00","Программа C (1 ч): 3 зиплайна, 2 Abseil, 1 Spiral, Roller, Skywalk, обед — 08:00/10:00/13:00/15:00","Luge 600 м: дети 10+ самостоятельно, 4–10 лет с родителями"]}],
  },
  { id:33, slug:"atv-quad", cat:"land", name:"Квадроциклы в джунглях", nameEn:"ATV Quad Bikes",
    duration:"2 часа катания",
    price:"Водитель: 2990 / Взрослый пассажир: 2300 / Ребёнок пассажир: 1800 бат",
    tags:["квадроциклы","джунгли","ATV","активный отдых"],
    restrictions:"Водить с 18 лет. Пассажир с 4 лет. ОБЯЗАТЕЛЬНО указывать время в экстра-сервисе. Без выбора — операйшн ставит 12:00. Доп. трансфер: 1–4 чел 2000 бат, 5–9 чел 2500 бат",
    includes:"Трансфер, ATV Adly 150 куб. см. (автомат, Тайвань)",
    route:[{items:["07:30–08:20 Выезд из отеля","09:00–11:00 Катание 2 часа (без обеда)","12:30 Возвращение в отель","Время старта: 09:00 / 12:00 / 15:00"]}],
  },
  { id:34, slug:"rafting-elephants-atv", cat:"land", name:"Рафтинг + Слоны + Квадроциклы", nameEn:"Rafting + Elephants + ATV",
    duration:"1 день",
    tags:["рафтинг","слоны","квадроциклы","пещера","водопад","обезьяны"],
    restrictions:"⚠️ Очерёдность остановок может меняться. При посещении храмов — доп. оплата",
    includes:"Транспорт, питание, рус. гид, страховка, нац. парк, слоны, рафт-плоты, квадроциклы",
    route:[{items:["06:50 Выезд","08:50 Храм Суван Куха — обезьяны, пещера (сталактиты, летучие мыши), статуя лежащего Будды","09:50 Квадроциклы по джунглям","11:10 Инструктаж рафтинга","11:20 Сплав 5 км по реке с инструкторами","12:50 Водопад — купание","13:50 Обед на базе","14:50 Деревня слонов — катание","17:20 Отель"]}],
  },
  // ── АТТРАКЦИОНЫ / ШОУ ────────────────────────
  { id:35, slug:"jetski", cat:"show", name:"Гидроциклы Wave Rider (Jet Ski)", nameEn:"Jet Ski Wave Rider",
    duration:"Утренняя (08:30–13:00) / Дневная (13:30–18:00)",
    price:"8500 бат / 1 скутер (водитель + пассажир в рамках одной цены)",
    tags:["гидроцикл","острова","Ко Лаве","Naka Yai","снорклинг","пляж обезьян"],
    restrictions:"⚠️ Водить с 18 лет. Пассажир с 10 лет. Макс. возраст 69 лет. Вес до 190 кг/скутер. Без рус. гида. БРОНИРОВАТЬ через Речек в свои группы! Взять: одежда с длинными рукавами + солнцезащитный крем",
    route:[
      {label:"🌅 Утренняя программа",items:["08:30 Старт с пирса","08:40 Ao Po Grand Marina — фотостоп","09:00 Мангровые заросли — обзор заповедной зоны Ко Нати","09:30 Пляж обезьян — высадка, отдых, фото","10:00 Ко Лаве — прогулка, купание, фотосессия","10:40 Naka Yai — обед, свободное время","11:10 Снорклинг у Ко Раэт","11:40 Naka Noi — обзор без высадки","12:00 Ko Phe — прогулка и осмотр","13:00 Возвращение на пирс"]},
      {label:"☀️ Дневная программа",items:["13:30 Старт (аналогичный маршрут)","18:00 Возвращение на пирс"]},
    ],
  },
  { id:36, slug:"dolphin-show", cat:"show", name:"Дельфины: шоу + купание", nameEn:"Dolphin Show & Swim",
    duration:"По сеансам: 11:00 / 14:00 / 17:00",
    price:"Шоу A: взр.1200/дет.700 | B: 1000/600 | C-D: 900/500. Купание: 6000 бат/чел",
    tags:["дельфины","шоу 40–45 мин","купание","семейное"],
    restrictions:"⚠️ ПОНЕДЕЛЬНИК — ВЫХОДНОЙ. ОБЯЗАТЕЛЬНО запрашивать места при продаже купания! НУЖЕН ПРИВАТНЫЙ ТРАНСФЕР! Купание: с 6 лет самостоятельно, с 4 лет со взрослым (2 билета). Беременные — если нет противопоказаний. Вес до 120 кг. Золотые украшения — снять! 1 чел = 1 дельфин",
    route:[{items:["Шоу 40–45 мин","После шоу: 10–15 мин фото с дельфинами для всех","Купающиеся: переодевание + душ 10 мин","Брифинг: правила поведения с дельфинами 5 мин","Группы по 5 чел × 10 мин (5 чел на 5 дельфинов)","Финальное переодевание и душ","Глубина: 5 м. Вода: 25–26°C"]}],
  },
  { id:37, slug:"fantasea", cat:"show", name:"Phuket FantaSea", nameEn:"Phuket FantaSea",
    duration:"Шоу ~1 час",
    price:"Tickets Only / + Transfer / + Dinner / + Golden Seat — добавляются отдельно",
    tags:["шоу","вечернее","семейное","Вт/Пт/Вс"],
    restrictions:"⚠️ Вторник, Пятница, Воскресенье. Фото и видео во время шоу — ЗАПРЕЩЕНЫ",
    route:[{items:["17:00–17:40 Сбор из отелей","18:30 Прибытие в парк","17:30–20:30 Ресторан «Золотой Канари» (при заказе ужина)","20:30 Открытие ворот театра","21:00–22:00 Основное шоу","22:15 Трансфер в отель"]}],
  },
  { id:38, slug:"siam-niramit", cat:"show", name:"SIAM NIRAMIT", nameEn:"Siam Niramit",
    duration:"Вечернее шоу",
    price:"С ужином: Silver 2200/1800 | Gold 2400/2000 | Platinum 2600/2200. Без ужина: Silver 1800/1600 | Gold 2000/1800 | Platinum 2200/2000. Трансфер +350 бат/чел",
    tags:["шоу","вечернее","культура","Нага арена","тайская деревня"],
    restrictions:"⚠️ Все дни кроме ВТОРНИКА. Инфанты до 4 лет или до 100 см — бесплатно без места. Фото/видео во время шоу — ЗАПРЕЩЕНЫ",
    route:[{items:["17:00 Сбор из отелей","17:40 Открытие тайской традиционной деревни","17:30 Ресторан (ужин до шоу)","19:45 Мини-шоу на Нага арене","20:00 Открытие ворот театра","20:30–21:50 Основное шоу"]}],
  },
  { id:39, slug:"simon-cabaret", cat:"show", name:"Simon Cabaret Show", nameEn:"Simon Cabaret",
    duration:"~1 час шоу",
    price:"Tickets Only: Simon Patong - Tickets Only (Group). С групп. трансфером: +450 бат/чел. Найтон/Найянг/Майкао/Лаян: +650 бат/чел",
    tags:["шоу","кабаре","Патонг","ежедневно","18:00/19:30/21:00"],
    restrictions:"⚠️ Фото/видео во время шоу — ЗАПРЕЩЕНЫ. Северные районы: только 18:00 и 21:00, от 2 чел в ваучере. Прибыть за 20–30 мин до обмена билетов",
    route:[{items:["Выбрать сеанс: 18:00, 19:30 или 21:00","Tickets Only: (Phuket) Simon Patong - Tickets Only (Group)","С групп. трансфером: (Phuket) Simon Patong (Group) — +450 бат","Найтон/Найянг/Майкао/Лаян: только 18:00 и 21:00, от 2 чел в ваучере"]}],
  },
  { id:40, slug:"carnival-magic", cat:"show", name:"Carnival Magic", nameEn:"Carnival Magic",
    duration:"Шоу ~50 мин",
    price:"С ужином: смотри систему. Инфант до 100 см бесплатно, трансфер +450 бат",
    tags:["шоу","парк","«Королевство огней»","Пн/Ср/Сб"],
    restrictions:"⚠️ Понедельник, Среда, Суббота. Детям 101–140 см — подарки в Kids Club. Фото/видео во время шоу — ЗАПРЕЩЕНЫ",
    route:[{items:["17:00–17:40 Сбор из отелей","18:30 Парк","17:30–20:30 Ресторан «Райская птица» (при заказе ужина)","20:00 Театр «Ривер Палас»","20:30–21:20 Основное шоу","21:30 «Королевство огней» (после шествия)","21:50 Трансфер в отель"]}],
  },
  { id:41, slug:"andamanda", cat:"show", name:"Аквапарк Andamanda", nameEn:"Andamanda Water Park",
    duration:"Полный день",
    price:"Билет (от 122 см): 1750. Дети 91–122 см: 1150. 60+: 1200. +Обед: +350. +Трансфер: +400. Комплект всё: 2500/1900/1950 бат",
    tags:["аквапарк","семейное","дети","горки"],
    restrictions:"⚠️ Arrival: 10:00 или 13:00. Departure: 15:00 или 18:30. Варианты с обедом нет у уличных агентств — продавать с трансфером",
    route:[{items:["Прибытие 10:00 или 13:00","Полный день в аквапарке Andamanda Phuket","Обед A: Chicken Burger + Soft Drink","Обед B: Phat Thai + Salad + Soft Drink","Детский обед: Chicken Nugget + French Fries + Soft Drink","Отбытие 15:00 или 18:30"]}],
  },
  { id:42, slug:"sanctuary-elephant", cat:"show", name:"Заповедник слонов (Sanctuary)", nameEn:"Sanctuary Elephant Park",
    duration:"Full: 3.5 ч / Mini: 1.5 ч",
    price:"Full program: взр.2700 / дет.1500. Mini: взр.1400 / дет.800. Для VIP-тура: 1500 бат/чел",
    tags:["слоны","заповедник","латексное дерево","мастер-класс","семейное"],
    restrictions:"Ао По — только инд. трансфер. Трансфер включён: Бангтао, Камала, Патонг, Карон, Ката, Равай, Пхукет таун, Панва, Ко Сирей. Доп.: Майкао/Найянг/Найтон/Лаян +700 взр/400 дет",
    route:[{items:["FULL (3.5 ч) — 09:00 / 14:00: встреча + кормление бананами → прогулка в естественную среду (1–2 ч) → латексное дерево (демонстрация сбора сока) → мастер-класс тайского блюда «Coconut Soup with Chicken» → обед/ужин на фоне купающихся слонов","","MINI (1.5 ч) — 09:00 / 11:00 / 14:00: встреча + кормление → прогулка в естественную среду → латексное дерево"]}],
  },
  { id:43, slug:"elephant-care-naithon", cat:"show", name:"Слоны Найтон (Elephant Care Sanctuary)", nameEn:"Elephant Care Naithon",
    duration:"Half Day 3 ч / Feed & Spa 1.5 ч",
    price:"Half Day: взр.2900 / дет.2200 бат. Feed & Spa: взр.2200 / дет.1700 бат",
    tags:["слоны","заповедник","купание","грязевая ванна","DIY-сувенир","фотограф"],
    restrictions:"Дети 4–10 лет — детский билет. Morning пикап 07:15–07:30 (старт 08:00). Afternoon пикап 12:15–12:30 (старт 13:00). Feed&Spa: Morning пикап 09:15 (старт 10:00), Afternoon 13:15 (старт 14:00)",
    includes:"Страховка, обед (Half Day) / перекус (Feed&Spa), трансфер, фотограф, фрукты, безалк. напитки, магнит",
    route:[{items:["HALF DAY (3 ч): регистрация (чай/кофе/закуски) → знакомство с гидом об истории слонов → подготовка фруктов → кормление → грязевая ванна со слонами → купание в большом естественном бассейне → обед → DIY-сувенир → трансфер","","FEED & SPA (1.5 ч): регистрация → кормление → чистка кожи слонов грязью → душ вместе со слонами → DIY-сувенир → трансфер"]}],
  },
  // ── ПЕРЕЛЁТНЫЕ ТУРЫ ───────────────────────────
  { id:44, slug:"singapore", cat:"flight", name:"Сингапур 1 день", nameEn:"Singapore 1 Day",
    duration:"1 день",
    price:"23900 бат/чел. Single: +3700 бат. Инфант 0–2 г.: 6000 бат",
    tags:["Сингапур","виза","перелётный","Gardens by the Bay","Марина Бэй"],
    restrictions:"🚫 ОТМЕНА И ВОЗВРАТ НЕВОЗМОЖНЫ — в т.ч. по справке из больницы. Беременные — НЕ ДОПУСКАЮТСЯ партнёром",
    includes:"Перелёт туда-обратно, трансфер из/в отель, русскоговорящий гид, страховка, входные билеты по программе",
    route:[{items:[
      "04:00–05:00 Выезд из отеля на Пхукете, трансфер в аэропорт",
      "Перелёт Пхукет → Сингапур (около 1.5 ч)",
      "Прибытие в аэропорт Чанги — один из лучших аэропортов мира (сад-водопад Jewel внутри)",
      "Трансфер в центр города",
      "",
      "Обзорная программа по Сингапуру:",
      "Мерлион-парк — символ города, слияние реки Сингапур с заливом",
      "Марина Бэй — панорама небоскрёбов, отель Marina Bay Sands",
      "Gardens by the Bay — знаменитые «Деревья-великаны» SuperTree Grove (вход включён)",
      "Чайнатаун — храм Будды Зуба, уличная еда, сувениры",
      "Маленькая Индия (Литл Индия) — красочный квартал с храмами",
      "Арабский квартал — мечеть Султана, кафе и магазинчики",
      "Орчард Роуд — главная торговая улица Сингапура (свободное время)",
      "",
      "Обед в местном ресторане (включён / уточнять по программе)",
      "",
      "Вечерний перелёт Сингапур → Пхукет",
      "Прибытие на Пхукет, трансфер в отель",
      "",
      "⚠️ ДЛЯ ОФОРМЛЕНИЯ ВИЗЫ необходимо предоставить на КАЖДОГО туриста:",
      "• Фото на белом фоне",
      "• Образование",
      "• Профессия",
      "• Семейное положение",
      "• Религия",
      "• Годовой доход",
      "• Адрес проживания с почтовым индексом",
      "• Если проживаете 6+ мес. в другой стране: адрес и годы проживания",
    ]}],
  },
  { id:45, slug:"kuala-lumpur", cat:"flight", name:"Куала-Лумпур 1 день", nameEn:"Kuala Lumpur 1 Day",
    duration:"1 день", hotel:"Ibis KL City Centre",
    price:"18100 бат/чел. Single: +2600 бат. Инфант: 4500 бат",
    tags:["Куала-Лумпур","Малайзия","Башни Петронас","виза","перелётный"],
    restrictions:"🚫 ОТМЕНА И ВОЗВРАТ НЕВОЗМОЖНЫ. Беременные — НЕ ДОПУСКАЮТСЯ",
    includes:"Перелёт туда-обратно, трансфер, отель Ibis KL City Centre, русскоговорящий гид, страховка, входные билеты по программе",
    route:[{items:[
      "Ранний вылет из аэропорта Пхукета",
      "Перелёт Пхукет → Куала-Лумпур (около 1.5 ч)",
      "Встреча в аэропорту, трансфер в центр города",
      "",
      "Обзорная программа по Куала-Лумпуру:",
      "Башни-близнецы Петронас — самые узнаваемые небоскрёбы Азии. Фото с обзорной площадки (вход опционально)",
      "Парк KLCC — зелёный оазис у подножия Петронас, фонтаны",
      "Башня Менара КЛ — смотровая с панорамой всего города (вход включён / уточнять)",
      "Королевский дворец Истана Негара — резиденция короля Малайзии, фото снаружи",
      "Площадь Merdeka (Независимости) — центр исторического города, флагшток",
      "Мечеть Масджид Джамек — одна из старейших в КЛ, слияние двух рек",
      "Чайнатаун Петалинг Стрит — рынок, уличная еда, сувениры",
      "Торговый квартал Букит Бинтанг — Pavilion Mall, свободное время для шоппинга",
      "",
      "Обед в местном ресторане (малайзийская/китайская кухня)",
      "",
      "Вечерний перелёт КЛ → Пхукет",
      "Прибытие на Пхукет, трансфер в отель",
      "",
      "⚠️ ДЛЯ ОФОРМЛЕНИЯ ВИЗЫ необходимо предоставить на КАЖДОГО туриста:",
      "• Фото на белом фоне",
      "• Образование, профессия, семейное положение, религия",
      "• Годовой доход",
      "• Адрес проживания с почтовым индексом",
      "• Если 6+ мес. в другой стране: адрес и годы проживания",
    ]}],
  },
  { id:46, slug:"kl-singapore", cat:"flight", name:"Куала-Лумпур + Сингапур 3д/2н", nameEn:"KL + Singapore 3/2",
    duration:"3 дня / 2 ночи",
    price:"36400 бат/чел. Single: +6300 бат. Инфант: 7800 бат",
    tags:["Куала-Лумпур","Сингапур","Башни Петронас","Gardens by the Bay","виза","перелётный"],
    restrictions:"🚫 ОТМЕНА И ВОЗВРАТ НЕВОЗМОЖНЫ. Беременные — НЕ ДОПУСКАЮТСЯ",
    includes:"Перелёты (Пхукет→КЛ→Сингапур→Пхукет), 2 ночи в отелях, трансферы, русскоговорящий гид, страховка, входные билеты по программе",
    route:[
      {day:1, items:[
        "Ранний вылет из Пхукета в Куала-Лумпур",
        "Встреча, трансфер в отель, заселение",
        "",
        "Обзор Куала-Лумпура:",
        "Башни-близнецы Петронас — фото, обзорная площадка",
        "Парк KLCC, башня Менара КЛ — панорамный вид",
        "Королевский дворец, площадь Merdeka",
        "Мечеть Масджид Джамек",
        "Чайнатаун Петалинг Стрит — рынок, уличная еда",
        "Обед, ужин — малайзийская кухня",
        "Ночёвка в Куала-Лумпуре",
      ]},
      {day:2, items:[
        "Завтрак в отеле",
        "Утро: свободное время / шоппинг Букит Бинтанг",
        "Перелёт Куала-Лумпур → Сингапур (1 час)",
        "Встреча, трансфер в отель, заселение",
        "",
        "Обзор Сингапура:",
        "Мерлион-парк, набережная Марина Бэй",
        "Gardens by the Bay — SuperTree Grove",
        "Чайнатаун, Литл Индия, Арабский квартал",
        "Орчард Роуд — свободное время",
        "Ужин, ночёвка в Сингапуре",
      ]},
      {day:3, items:[
        "Завтрак в отеле",
        "Свободное утро: шоппинг или самостоятельные прогулки",
        "Трансфер в аэропорт Чанги",
        "Перелёт Сингапур → Пхукет",
        "Прибытие на Пхукет, трансфер в отель",
        "",
        "⚠️ ДЛЯ ОФОРМЛЕНИЯ ВИЗЫ (на каждого туриста):",
        "• Фото на белом фоне",
        "• Образование, профессия, семейное положение, религия",
        "• Годовой доход, адрес с почтовым индексом",
        "• При 6+ мес. проживании в другой стране: адрес и годы",
      ]},
    ],
  },
  { id:47, slug:"bangkok-1d", cat:"flight", name:"Бангкок 1 день", nameEn:"Bangkok 1 Day",
    duration:"1 день",
    price:"12500 бат/чел. Инфант: 5500 бат. Royal Bangkok: также 12500 бат",
    tags:["Бангкок","перелётный"],
    restrictions:"🚫 ОТМЕНА И ВОЗВРАТ НЕВОЗМОЖНЫ. Беременные — НЕ ДОПУСКАЮТСЯ",
    route:[{items:["Перелёт + программа по Бангкоку"]}],
  },
  { id:48, slug:"bangkok-premium", cat:"flight", name:"Бангкок Премиум 2д/1н", nameEn:"Bangkok Premium 2/1",
    duration:"2 дня / 1 ночь",
    price:"18000 бат/чел. Single: +2700",
    tags:["Бангкок","премиум","ночёвка","перелётный"],
    restrictions:"🚫 ОТМЕНА И ВОЗВРАТ НЕВОЗМОЖНЫ. Беременные — НЕ ДОПУСКАЮТСЯ",
    includes:"Отели: Twin Tower / Graph Rachada / Best Western",
    route:[{items:["Перелёт, отель, программа по Бангкоку"]}],
  },
  { id:49, slug:"cambodia", cat:"flight", name:"Камбоджа 2д/1н", nameEn:"Cambodia 2/1",
    duration:"2 дня / 1 ночь",
    price:"24200 бат/чел. Single: +2300. Инфант: 6500 бат",
    tags:["Камбоджа","виза","ночёвка","перелётный"],
    restrictions:"🚫 ОТМЕНА И ВОЗВРАТ НЕВОЗМОЖНЫ. Беременные — НЕ ДОПУСКАЮТСЯ",
    route:[{items:["Для визы: анкетные данные"]}],
  },
  { id:50, slug:"cambodia-bangkok", cat:"flight", name:"Камбоджа + Бангкок 3д/2н", nameEn:"Cambodia + Bangkok 3/2",
    duration:"3 дня / 2 ночи",
    price:"35400 бат/чел. Single: +4140. Инфант: 7150 бат",
    tags:["Камбоджа","Бангкок","виза","ночёвка","перелётный"],
    restrictions:"🚫 ОТМЕНА И ВОЗВРАТ НЕВОЗМОЖНЫ. Беременные — НЕ ДОПУСКАЮТСЯ",
    route:[{items:["Для визы: анкетные данные на каждого"]}],
  },
  // ── ПРОЧЕЕ ───────────────────────────────────
  { id:51, slug:"photoshoot", cat:"other", name:"Фотосессия", nameEn:"Photoshoot Individual",
    duration:"1–2 часа",
    price:"1 ч (6500 бат): 30 обр. фото + 5 в ретуши, 1 локация | 2 ч (11000): 50 обр + 7 в ретуши | Хит (15000): 1.5 ч + 50 обр + 10 авт. обработка + 3 видео рилса. Макияж+причёска от 6000. Платье 2000. Крылья белые 3500",
    tags:["фото","пляж","индивидуально","рилсы","ретушь"],
    restrictions:"⚠️ Уточнять доступность фотографа! Доплата выезда: Патонг +500, Камала +700, Сурин/Бангтао +900, Найтон/Найянг/Майкао +1300. Приватный трансфер +3500 бат",
    route:[{items:["Уточнить доступность фотографа и локацию","1 ч: 30 обр. фото + 5 в ретуши, 1 локация","2 ч: 50 обр. фото + 7 в ретуши, 1 локация","Хит: 50 обр + 10 авт. обработка (коррекция фигуры, глубокая ретушь, стилизация) + 3 видео рилса"]}],
  },
  { id:52, slug:"helicopter", cat:"other", name:"Вертолётные туры", nameEn:"Helicopter Tours",
    duration:"40–90 минут / рейс",
    price:"1. Magical Bays of Phuket 40 мин — 72400 | 2. Phang Nga Bay 40 мин — 72400 | 3. Phang Nga–Phuket 60 мин — 92900 | 4. Phi Phi–Phuket 70 мин — 105700 | 5. Phi Phi–Phang Nga–Phuket 90 мин — 133780 бат/рейс",
    tags:["вертолёт","VIP","панорама","6 чел/рейс"],
    restrictions:"Вертолёт вмещает 6 человек. Трансфер включён. Гид отдельно: +3500 бат",
    route:[{items:["5 маршрутов на выбор:","1. Magical Bays of Phuket — 40 мин — 72400 бат","2. Phang Nga Bay Tour — 40 мин — 72400 бат","3. Phang Nga – Phuket Tour — 60 мин — 92900 бат","4. Phi Phi – Phuket Tour — 70 мин — 105700 бат","5. Phi Phi – Phang Nga – Phuket — 90 мин — 133780 бат"]}],
  },
  { id:53, slug:"fast-track", cat:"other", name:"Fast Track (аэропорт)", nameEn:"Airport Fast Track",
    duration:"При вылете",
    price:"2500 бат/чел (06:00–23:59). Вылет 00:00–06:00: 3500 бат/чел. Инфанты 0–2 г. — БЕСПЛАТНО",
    tags:["аэропорт","Fast Track","VIP"],
    restrictions:"⚠️ Бронировать НЕ ПОЗДНЕЕ ЧЕМ ЗА 3 ДНЯ до вылета. ОБЯЗАТЕЛЕН инд. трансфер от нашей компании",
    route:[{items:["Быстрый проход через аэропортовые процедуры","Ночной вылет 00:00–06:00 — повышенный тариф 3500 бат"]}],
  },
  { id:54, slug:"boxing", cat:"other", name:"Тайский бокс", nameEn:"Muay Thai Boxing",
    duration:"Вечернее",
    price:"Ringside: 1800/1800 бат. Stadium: 1500/1300 бат",
    tags:["бокс","тайский бокс","спорт","Пн–Сб"],
    restrictions:"Трансфер включён только с Патонга, Каты, Карона. Дни: Пн–Сб",
    route:[{items:["Вечернее посещение профессиональных боёв по тайскому боксу","Места: Ringside (первые ряды) или Stadium (трибуны)","Трансфер из Патонга, Каты, Карона — включён","⚠️ Дни: Понедельник–Суббота (воскресенье — выходной)"]}],
  },
  { id:55, slug:"coconut-show", cat:"other", name:"Coconut Show 18+", nameEn:"Coconut Show 18+",
    duration:"1 час 10 минут",
    price:"1490 бат (на месте 2500 бат). Начало 19:00. Работает до 22:30",
    tags:["шоу","18+","вечернее","цикличное каждый час"],
    restrictions:"🔞 Строго 18+. Шоу цикличное — повторяется каждый час. Вход и выход в любое время",
    route:[{items:["19:00 Начало (повторяется ежечасно)","Длительность: 1 ч 10 мин","До: 22:30"]}],
  },
]

// ══════════════════════════════════════════════
// КОНСТАНТЫ
// ══════════════════════════════════════════════
const MCAT_META: Record<string,{label:string;icon:string;color:string;border:string;bg:string}> = {
  sea:     {label:"Морские туры",       icon:"🚤",color:"#38bdf8",border:"#1e3f6a",bg:"#0c2340"},
  fishing: {label:"Рыбалка",            icon:"🎣",color:"#4ade80",border:"#16a34a",bg:"#0d2010"},
  diving:  {label:"Дайвинг",            icon:"🤿",color:"#818cf8",border:"#4338ca",bg:"#1e1b4b"},
  land:    {label:"Сухопутные",         icon:"🐘",color:"#fbbf24",border:"#d97706",bg:"#2d1f00"},
  show:    {label:"Аттракционы / Шоу",  icon:"🎭",color:"#f472b6",border:"#be185d",bg:"#2d0f1f"},
  flight:  {label:"Перелётные туры",    icon:"✈️",color:"#a78bfa",border:"#7c3aed",bg:"#1e1040"},
  other:   {label:"Прочее",             icon:"⭐",color:"#94a3b8",border:"#475569",bg:"#1e293b"},
}
const MCAT_ORDER = ["sea","fishing","diving","land","show","flight","other"]
const ALL_MCATS = [{id:"all",label:"Все туры",icon:"🌴"},...MCAT_ORDER.map(c=>({id:c,...MCAT_META[c]}))]

const GENERAL_RULES = [
  {icon:"🤰",text:"Беременные, дети до 1 года и лица 70+ — НЕ ДОПУСКАЮТСЯ к морским турам"},
  {icon:"📋",text:"Все справки и документы — с номером ваучера"},
  {icon:"🏥",text:"Возврат за тур — справка из больницы в ДЕНЬ пропущенной экскурсии"},
  {icon:"🕒",text:"Гости севернее Патонга — время выезда может отличаться, уточнять у операйшн"},
  {icon:"🛏",text:"С отелем — уточнять тип номера (DBL/TWIN) и кол-во комнат"},
  {icon:"👨‍👩‍👧",text:"Две семьи в разных отелях — оформлять ОТДЕЛЬНЫМИ ваучерами"},
  {icon:"📍",text:"Нет отеля в системе → PHUKET REGION + отель в заметках. Гости не наши — обязательно телефон"},
  {icon:"✈️",text:"Перелётные туры: ВОЗВРАТ НЕВОЗМОЖЕН (вкл. справки). Беременные не допускаются"},
  {icon:"💊",text:"Экстра-сервисы — использовать при бронировании"},
]
const ROOM_RULES = [
  {type:"DBL",note:"1 большая кровать для 2 чел — стандарт, прописывать НЕ нужно"},
  {type:"TWIN",note:"Раздельные кровати для 2 чел — НУЖНО прописывать"},
  {type:"DBL + Extra bed",note:"Большая + доп. кровать. Для 2+1 или 3 чел — НУЖНО"},
  {type:"TWIN + Extra bed",note:"Три раздельные кровати. Для 2+1 или 3 чел — НУЖНО"},
  {type:"Single",note:"Одноместное размещение"},
]
const VIP_PRICES = [
  {item:"Минивэн",price:"5000"},
  {item:"Гид",price:"1000"},
  {item:"Бесплатные локации (1–2)",price:"+1000 за каждую следующую"},
  {item:"Тигры Большие/Средние/Маленькие",price:"1050 /чел"},
  {item:"Тигры Белый/Гигант",price:"1500 /чел"},
  {item:"Гепард",price:"1500 /чел"},
  {item:"Львы Большие/Средние/Маленькие",price:"1000 /чел"},
  {item:"Лев Белый",price:"1500 /чел"},
  {item:"Дельфины VIP/обычные",price:"1200 / 1000"},
  {item:"Слоны",price:"800 /чел"},
  {item:"ЗАПОВЕДНИК СЛОНОВ",price:"1500 /чел"},
  {item:"Птичий парк (пт–вс)",price:"500 /чел"},
  {item:"Крокодилы",price:"500 взр / 300 дет"},
  {item:"Купание с дельфинами",price:"6000 /чел"},
  {item:"Океанариум",price:"1290 взр / 700 дет"},
  {item:"Инд. трансфер в аэропорт",price:"2400"},
]

// ══════════════════════════════════════════════
// WA SHARE — ГЕНЕРАЦИЯ ТЕКСТА И ПОПАП
// ══════════════════════════════════════════════

function buildTourWAShort(tour: typeof MTOURS[0]): string {
  const lines: string[] = []
  lines.push(`🗺️ *${tour.name}*`)
  if (tour.nameEn) lines.push(`_${tour.nameEn}_`)
  lines.push("")
  if (tour.duration) lines.push(`⏱ Продолжительность: ${tour.duration}`)
  if (tour.operator) lines.push(`🏢 Оператор: ${tour.operator}`)
  if (tour.hotel) lines.push(`🏨 Отель: ${tour.hotel}${tour.single ? ` (single +${tour.single}฿)` : ""}`)
  if (tour.price) { lines.push(""); lines.push(`💰 Цены: ${tour.price}`) }
  if (tour.tags && tour.tags.length) lines.push(`\n🏷 ${tour.tags.join(" · ")}`)
  return lines.join("\n")
}

function buildTourWAFull(tour: typeof MTOURS[0]): string {
  const lines: string[] = []
  lines.push(`🗺️ *${tour.name}*`)
  if (tour.nameEn) lines.push(`_${tour.nameEn}_`)
  lines.push("")
  if (tour.duration) lines.push(`⏱ ${tour.duration}`)
  if (tour.operator) lines.push(`🏢 ${tour.operator}`)
  if (tour.hotel) lines.push(`🏨 ${tour.hotel}${tour.single ? ` · single +${tour.single}฿` : ""}`)
  if (tour.price) { lines.push(""); lines.push(`💰 *Цены:*\n${tour.price}`) }
  if (tour.includes) { lines.push(""); lines.push(`✅ *Включено:*\n${tour.includes}`) }
  if (tour.restrictions) { lines.push(""); lines.push(`⚠️ *Важно:*\n${tour.restrictions}`) }
  if (tour.route && tour.route.length) {
    lines.push("")
    lines.push("🗺️ *Программа:*")
    tour.route.forEach(block => {
      if (block.day || block.label) lines.push(`\n*${block.label ?? `День ${block.day}`}*`)
      block.items.forEach(item => {
        if (item === "") return
        lines.push(item.startsWith("•") ? item : `• ${item}`)
      })
    })
  }
  return lines.join("\n")
}

function buildBoatWAShort(boat: typeof BOATS_DATA[0]): string {
  const lines: string[] = []
  const m = BOAT_TYPE_META[boat.type]
  lines.push(`🚢 *${boat.name}* (${boat.size})`)
  lines.push(`📍 ${boat.pier} · 👥 до ${boat.maxPax} чел · ${m.label}`)
  if (boat.note) { lines.push(""); lines.push(`ℹ️ ${boat.note}`) }
  lines.push("")
  lines.push("💰 *Маршруты и цены:*")
  boat.tours.forEach(t => {
    const extra = t.extra !== null ? ` (экстра: ${typeof t.extra === "number" ? t.extra.toLocaleString("ru-RU")+"฿" : t.extra})` : ""
    const price = typeof t.price === "number" ? t.price.toLocaleString("ru-RU")+"฿" : (t.price ?? "—")
    lines.push(`• ${t.name} — ${price}${extra}`)
  })
  return lines.join("\n")
}

function buildBoatWAFull(boat: typeof BOATS_DATA[0]): string {
  return buildBoatWAShort(boat)
}

interface WAModalProps {
  dark: boolean
  title: string
  shortText: string
  fullText: string
  onClose: () => void
}

function WAShareModal({ dark, title, shortText, fullText, onClose }: WAModalProps) {
  const [phone, setPhone] = useState("")
  const [format, setFormat] = useState<"short"|"full">("short")
  const [phoneError, setPhoneError] = useState(false)

  const t = {
    bg: dark ? "#0b1120" : "#f0f4f8",
    card: dark ? "#131d2e" : "#ffffff",
    border: dark ? "#1e2f45" : "#d1dce8",
    text: dark ? "#e2eaf4" : "#1a2636",
    muted: dark ? "#5b7a9a" : "#6e8aa8",
    inputBg: dark ? "#101c2d" : "#ffffff",
  }

  function handleSend() {
    const cleaned = phone.replace(/[^\d+]/g, "")
    if (cleaned.length < 7) { setPhoneError(true); return }
    setPhoneError(false)
    const text = format === "short" ? shortText : fullText
    const url = `https://wa.me/${cleaned.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
    onClose()
  }

  const previewText = format === "short" ? shortText : fullText

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.65)"}}
      onClick={e => { if(e.target === e.currentTarget) onClose() }}>
      <div style={{background:t.card,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:"560px",padding:"20px 18px 32px",boxShadow:"0 -8px 40px rgba(0,0,0,0.4)",border:`1px solid ${t.border}`,borderBottom:"none",maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column",gap:"14px"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:"15px",fontWeight:800,color:t.text}}>📤 Отправить в WhatsApp</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",fontSize:"20px",cursor:"pointer",color:t.muted,lineHeight:1}}>×</button>
        </div>

        <div style={{fontSize:"12px",color:"#25d366",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📌 {title}</div>

        {/* Phone input */}
        <div>
          <div style={{fontSize:"11px",color:t.muted,marginBottom:"5px",fontWeight:600}}>📱 Номер получателя</div>
          <input
            value={phone}
            onChange={e => { setPhone(e.target.value); setPhoneError(false) }}
            placeholder="+66 92 279 11 99"
            type="tel"
            style={{width:"100%",padding:"10px 12px",fontSize:"14px",borderRadius:"10px",background:t.inputBg,
              border:`1.5px solid ${phoneError?"#ef4444":t.border}`,color:t.text,outline:"none",boxSizing:"border-box"}}
          />
          {phoneError && <div style={{fontSize:"11px",color:"#ef4444",marginTop:"4px"}}>Введите корректный номер</div>}
        </div>

        {/* Format selector */}
        <div>
          <div style={{fontSize:"11px",color:t.muted,marginBottom:"6px",fontWeight:600}}>📝 Формат сообщения</div>
          <div style={{display:"flex",gap:"8px"}}>
            {[{k:"short",label:"📋 Краткая сводка"},{k:"full",label:"📄 Полное описание"}].map(f => (
              <button key={f.k} onClick={() => setFormat(f.k as "short"|"full")}
                style={{flex:1,padding:"8px 6px",borderRadius:"10px",fontSize:"12px",fontWeight:700,cursor:"pointer",
                  border:`1.5px solid ${format===f.k?"#25d366":t.border}`,
                  background:format===f.k?"#25d36622":t.inputBg,
                  color:format===f.k?"#25d366":t.muted}}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{flex:1,overflowY:"auto",background:dark?"#0a1a10":"#f0fdf4",border:"1px solid #16a34a",borderRadius:"10px",padding:"10px 12px"}}>
          <div style={{fontSize:"10px",fontWeight:700,color:"#16a34a",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>👁 Предпросмотр</div>
          <pre style={{fontSize:"11px",color:dark?"#86efac":"#14532d",whiteSpace:"pre-wrap",margin:0,fontFamily:"inherit",lineHeight:1.5}}>{previewText}</pre>
        </div>

        {/* Send button */}
        <button onClick={handleSend}
          style={{width:"100%",padding:"13px",background:"#25d366",color:"#fff",border:"none",borderRadius:"12px",fontSize:"15px",fontWeight:800,cursor:"pointer",letterSpacing:"0.3px"}}>
          Открыть WhatsApp →
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// КОМПОНЕНТ
// ══════════════════════════════════════════════
function MethodichkaTab({dark}:{dark:boolean}) {
  const t = {
    bg:dark?"#0b1120":"#f0f4f8", card:dark?"#131d2e":"#ffffff",
    cardBorder:dark?"#1e2f45":"#d1dce8", text:dark?"#e2eaf4":"#1a2636",
    muted:dark?"#5b7a9a":"#6e8aa8", accent:dark?"#38bdf8":"#0369a1",
    header:dark?"#0d1929":"#e2ecf7", inputBg:dark?"#101c2d":"#ffffff",
    inputBdr:dark?"#1e3450":"#c5d5e5",
  }
  const [search, setSearch] = useState("")
  const [activeCat, setActiveCat] = useState("all")
  const [activeOp, setActiveOp] = useState("all")
  const [expandedTour, setExpandedTour] = useState<string|null>(null)
  const [openCats, setOpenCats] = useState<Record<string,boolean>>(
    Object.fromEntries(MCAT_ORDER.map(c=>[c,true]))
  )

  function toggleCat(cat: string) {
    setOpenCats(prev=>({...prev,[cat]:!prev[cat]}))
  }
  const [showRules, setShowRules] = useState(false)
  const [showRooms, setShowRooms] = useState(false)
  const [showVip, setShowVip] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const tocRef = useRef<HTMLDivElement>(null)
  const [waModal, setWaModal] = useState<{title:string;short:string;full:string}|null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [liveTours, setLiveTours] = useState<MTour[]>(MTOURS)
  const [excelStatus, setExcelStatus] = useState<string|null>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const s = localStorage.getItem("nav_mtours_data")
    if (s) try { setLiveTours(JSON.parse(s)) } catch {}
  }, [])

  function handleExcelUpload(file: File) {
    setExcelStatus("⏳ Читаю файл...")
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, {type:"array"})

        // Try every sheet, find rows with tour data
        // Expected columns (any order, by header keyword):
        // Название / Name / Тур  →  name
        // Цена / Price           →  price
        // Продолжительность / Duration → duration
        // Оператор / Operator    →  operator
        // Включено / Includes    →  includes
        // Ограничения / Restrictions → restrictions
        const incoming: any[] = []

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<any[]>(ws, {header:1, defval:null})

          // Find header row
          let headerIdx = -1
          const colMap: Record<string,number> = {}
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i]
            let found = false
            row.forEach((v:any, ci:number) => {
              const s = String(v||"").toLowerCase()
              if (s.includes("назван") || s.includes("name") || s.includes("тур")) { colMap.name = ci; found = true }
              if (s.includes("цена") || s.includes("price")) colMap.price = ci
              if (s.includes("продолж") || s.includes("duration")) colMap.duration = ci
              if (s.includes("оператор") || s.includes("operator")) colMap.operator = ci
              if (s.includes("включ") || s.includes("include")) colMap.includes = ci
              if (s.includes("огранич") || s.includes("restrict")) colMap.restrictions = ci
            })
            if (found) { headerIdx = i; break }
          }
          if (headerIdx < 0 || colMap.name === undefined) continue

          for (let i = headerIdx+1; i < rows.length; i++) {
            const row = rows[i]
            const nameVal = row[colMap.name]
            if (!nameVal || String(nameVal).trim() === "") continue
            const entry: any = {name: String(nameVal).trim()}
            if (colMap.price !== undefined && row[colMap.price] != null) entry.price = String(row[colMap.price]).trim()
            if (colMap.duration !== undefined && row[colMap.duration] != null) entry.duration = String(row[colMap.duration]).trim()
            if (colMap.operator !== undefined && row[colMap.operator] != null) entry.operator = String(row[colMap.operator]).trim()
            if (colMap.includes !== undefined && row[colMap.includes] != null) entry.includes = String(row[colMap.includes]).trim()
            if (colMap.restrictions !== undefined && row[colMap.restrictions] != null) entry.restrictions = String(row[colMap.restrictions]).trim()
            incoming.push(entry)
          }
        }

        if (incoming.length === 0) {
          setExcelStatus("⚠️ Туры не найдены. Нужны колонки: Название, Цена, Оператор...")
          return
        }

        handleAIUpdate(incoming)
        setExcelStatus(`✅ Обновлено туров: обработано ${incoming.length} строк`)
      } catch(err) { setExcelStatus("❌ Ошибка: " + String(err)) }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleAIUpdate(incoming: any[]) {
    setLiveTours(prev => {
      const result = [...prev]
      incoming.forEach((nt: any) => {
        const idx = result.findIndex(t => t.name.toLowerCase() === (nt.name||"").toLowerCase())
        if (idx >= 0) {
          result[idx] = {
            ...result[idx],
            ...(nt.price && {price: nt.price}),
            ...(nt.includes && {includes: nt.includes}),
            ...(nt.restrictions && {restrictions: nt.restrictions}),
            ...(nt.duration && {duration: nt.duration}),
          }
        } else if (nt.name) {
          result.push({
            id: Date.now() + Math.random(),
            slug: (nt.name||"tour").toLowerCase().replace(/\s+/g,"-").slice(0,30),
            cat: nt.cat || "other",
            name: nt.name, nameEn: nt.nameEn || "",
            duration: nt.duration || "", price: nt.price || "",
            tags: [], includes: nt.includes, restrictions: nt.restrictions, route: [],
          })
        }
      })
      localStorage.setItem("nav_mtours_data", JSON.stringify(result))
      return result
    })
  }

  const ALL_OPS = useMemo(()=>{
    const ops = new Set<string>()
    liveTours.forEach(t=>{ if(t.operator) ops.add(t.operator) })
    return ["all",...Array.from(ops).sort()]
  },[liveTours])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return liveTours.filter(tour => {
      if (activeCat !== "all" && tour.cat !== activeCat) return false
      if (activeOp !== "all" && (tour.operator||"") !== activeOp) return false
      if (!q) return true
      return tour.name.toLowerCase().includes(q) || tour.nameEn.toLowerCase().includes(q) ||
        tour.tags.some(g => g.toLowerCase().includes(q)) || (tour.operator||"").toLowerCase().includes(q)
    })
  }, [search, activeCat, activeOp, liveTours])

  const grouped = MCAT_ORDER.map(cat => ({
    cat, meta: MCAT_META[cat],
    tours: filtered.filter(tour => tour.cat === cat)
  })).filter(g => g.tours.length > 0)

  const catCount = (id: string) => id === "all" ? liveTours.length : liveTours.filter(tour => tour.cat === id).length

  function scrollToTour(slug: string) {
    setExpandedTour(slug)
    setTocOpen(false)
    setTimeout(() => {
      document.getElementById("mt-" + slug)?.scrollIntoView({behavior:"smooth", block:"start"})
    }, 50)
  }

  function toggleTour(slug: string) {
    setExpandedTour(prev => prev === slug ? null : slug)
  }

  const inp: React.CSSProperties = {
    width:"100%", padding:"9px 12px 9px 34px", fontSize:"13px",
    borderRadius:"8px", background:t.inputBg, border:`1px solid ${t.inputBdr}`,
    color:t.text, outline:"none", boxSizing:"border-box"
  }
  const pill: React.CSSProperties = {
    padding:"6px 12px", fontSize:"12px", fontWeight:700,
    borderRadius:"99px", border:"none", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0
  }

  return (
    <div style={{display:"flex", flexDirection:"column", height:"calc(100vh - 110px)", overflow:"hidden", position:"relative"}}>

      {/* ── TOOLBAR ── */}
      <div style={{background:t.header, borderBottom:`1px solid ${t.cardBorder}`, padding:"10px 12px", flexShrink:0}}>

        {/* Row 1: search + TOC dropdown button */}
        <div style={{display:"flex", gap:"8px", marginBottom:"8px", alignItems:"center"}}>
          <div style={{position:"relative", flex:1}}>
            <span style={{position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", fontSize:"13px", pointerEvents:"none"}}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по туру, тегу, оператору..." style={inp}/>
          </div>
          {/* TOC dropdown button */}
          <div style={{position:"relative"}} ref={tocRef}>
            <button onClick={() => setTocOpen(v => !v)}
              style={{...pill, background:tocOpen?(dark?"#38bdf8":"#0369a1"):(dark?"#1e2f45":"#dce7f0"), color:tocOpen?"#fff":(dark?"#94a3b8":"#374151"), borderRadius:"10px", padding:"8px 14px", fontSize:"13px"}}>
              📑 Оглавление {tocOpen ? "▲" : "▼"}
            </button>
            {/* Dropdown */}
            {tocOpen && (
              <div style={{position:"absolute", top:"calc(100% + 6px)", right:0, width:"280px", maxHeight:"60vh", overflowY:"auto", background:t.card, border:`1px solid ${t.cardBorder}`, borderRadius:"14px", boxShadow:"0 8px 32px rgba(0,0,0,0.4)", zIndex:200, padding:"6px 0"}}>
                <div style={{padding:"8px 14px 6px", borderBottom:`1px solid ${t.cardBorder}`, fontSize:"10px", fontWeight:700, color:t.muted, textTransform:"uppercase", letterSpacing:"0.8px"}}>
                  {filtered.length} / {liveTours.length} туров
                </div>
                {grouped.map(g => (
                  <div key={g.cat}>
                    <div style={{padding:"8px 14px 4px", fontSize:"10px", fontWeight:700, color:g.meta.color, textTransform:"uppercase", letterSpacing:"0.5px", marginTop:"2px"}}>
                      {g.meta.icon} {g.meta.label} ({g.tours.length})
                    </div>
                    {g.tours.map(tour => (
                      <button key={tour.id} onClick={() => scrollToTour(tour.slug)}
                        style={{width:"100%", textAlign:"left", background:"transparent", border:"none", cursor:"pointer", padding:"5px 14px 5px 20px", fontSize:"12px", color:t.muted, display:"flex", alignItems:"baseline", gap:"6px", lineHeight:1.4}}
                        onMouseEnter={e => {(e.currentTarget as HTMLElement).style.background=dark?"#1e2f45":"#f0f4f8"}}
                        onMouseLeave={e => {(e.currentTarget as HTMLElement).style.background="transparent"}}>
                        <span style={{color:g.meta.color, fontSize:"10px", flexShrink:0}}>#{tour.id}</span>
                        <span style={{color:t.text}}>{tour.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: quick-info buttons */}
        <div style={{display:"flex", gap:"5px", marginBottom:"8px", flexWrap:"wrap", alignItems:"flex-start"}}>
          {[
            {key:"rules", label:"📋 Правила бронирования", active:showRules, fn:() => {setShowRules(v=>!v);setShowRooms(false);setShowVip(false)}, color:"#d97706"},
            {key:"rooms", label:"🛏 Типы номеров", active:showRooms, fn:() => {setShowRooms(v=>!v);setShowRules(false);setShowVip(false)}, color:"#0891b2"},
            {key:"vip",   label:"👑 VIP тарифы",  active:showVip,   fn:() => {setShowVip(v=>!v);setShowRules(false);setShowRooms(false)}, color:"#d97706"},
          ].map(b => (
            <button key={b.key} onClick={b.fn}
              style={{...pill, background:b.active ? b.color : (dark?"#1e2f45":"#dce7f0"), color:b.active?"#fff":(dark?"#94a3b8":"#374151")}}>
              {b.label}
            </button>
          ))}
          <input ref={excelInputRef} type="file" accept=".xlsx,.xls" style={{display:"none"}}
            onChange={e=>{const f=e.target.files?.[0];if(f)handleExcelUpload(f);e.target.value=""}}/>
          <div style={{display:"flex",flexDirection:"column",gap:"2px"}}>
            <button onClick={()=>excelInputRef.current?.click()}
              style={{...pill, background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#fff", fontWeight:700, boxShadow:"0 2px 8px rgba(245,158,11,0.3)"}}>
              📂 Загрузить прайс (Excel)
            </button>
            {excelStatus && <div style={{fontSize:"10px",color:excelStatus.startsWith("✅")?"#4ade80":excelStatus.startsWith("❌")?"#f87171":"#fbbf24",fontWeight:600,paddingLeft:"4px"}}>{excelStatus}</div>}
          </div>
        </div>

        {/* Row 3: category filter pills — horizontal scroll, compact */}
        <div
          onTouchStart={e=>e.stopPropagation()}
          onTouchMove={e=>e.stopPropagation()}
          onTouchEnd={e=>e.stopPropagation()}
          style={{display:"flex", gap:"5px", overflowX:"auto", paddingBottom:"4px", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none"}}>
          {ALL_MCATS.map(cat => {
            const meta = cat.id !== "all" ? MCAT_META[cat.id] : null
            const active = activeCat === cat.id
            const count = catCount(cat.id)
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                style={{...pill, flexShrink:0, whiteSpace:"nowrap", padding:"5px 10px", fontSize:"11px",
                  background:active?(meta?meta.color:(dark?"#38bdf8":"#0369a1")):(dark?"#1e2f45":"#dce7f0"),
                  color:active?"#fff":(dark?"#94a3b8":"#374151"),
                  border:active?`1px solid transparent`:`1px solid ${dark?"#2a3f5a":"#c5d5e5"}`}}>
                {cat.icon} {cat.id==="all"?"Все":cat.label.split(" ")[0]}
                <span style={{marginLeft:"4px", fontSize:"10px", opacity:0.75}}>({count})</span>
              </button>
            )
          })}
        </div>

        {/* Row 4: operator filter pills */}
        {ALL_OPS.length > 2 && (
          <div
            onTouchStart={e=>e.stopPropagation()}
            onTouchMove={e=>e.stopPropagation()}
            onTouchEnd={e=>e.stopPropagation()}
            style={{display:"flex", gap:"4px", overflowX:"auto", paddingBottom:"4px", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none", alignItems:"center"}}>
            <span style={{fontSize:"9px", fontWeight:700, color:dark?"#38bdf8":"#0369a1", letterSpacing:"1px", textTransform:"uppercase" as const, flexShrink:0, paddingRight:"2px"}}>Оператор:</span>
            {ALL_OPS.map(op => {
              const active = activeOp === op
              const opColors: Record<string,string> = {"SAWANU":"#0d9488","Love Andaman":"#0891b2","Dolce Vita":"#db2777","Dolce":"#db2777","BG Asia":"#7c3aed","BG":"#7c3aed"}
              const col = opColors[op] ?? "#64748b"
              const opCount = op==="all" ? filtered.length : filtered.filter(t=>t.operator===op).length
              return (
                <button key={op} onClick={()=>setActiveOp(op)}
                  style={{...pill, flexShrink:0, whiteSpace:"nowrap" as const, padding:"4px 9px", fontSize:"10px",
                    background:active?col:(dark?"#1a2e46":"#dce7f0"),
                    color:active?"#fff":(dark?"#7dd3fc":"#374151"),
                    border:active?"1px solid transparent":`1px solid ${dark?"#2a3f5a":"#c5d5e5"}`}}>
                  {op==="all"?"🌐 Все":op}
                  <span style={{marginLeft:"3px", fontSize:"9px", opacity:0.75}}>({opCount})</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── INFO PANELS ── */}
      {showRules && (
        <div style={{background:dark?"#1c1500":"#fffbeb", borderBottom:"1px solid #d97706", padding:"10px 14px", flexShrink:0}}>
          <div style={{fontSize:"11px", fontWeight:700, color:"#d97706", marginBottom:"6px"}}>📋 Общие правила бронирования</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 16px"}}>
            {GENERAL_RULES.map((r,i) => (
              <div key={i} style={{display:"flex", gap:"6px", fontSize:"11px", color:dark?"#fde68a":"#92400e"}}>
                <span style={{flexShrink:0}}>{r.icon}</span><span>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {showRooms && (
        <div style={{background:dark?"#0a1f2d":"#eff6ff", borderBottom:"1px solid #0891b2", padding:"10px 14px", flexShrink:0}}>
          <div style={{fontSize:"11px", fontWeight:700, color:"#0891b2", marginBottom:"6px"}}>🛏 Типы номеров</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 16px"}}>
            {ROOM_RULES.map((r,i) => (
              <div key={i} style={{fontSize:"11px", color:dark?"#7dd3fc":"#1e40af"}}><b>{r.type}</b> — {r.note}</div>
            ))}
          </div>
          <div style={{marginTop:"6px", fontSize:"11px", fontWeight:700, color:"#ef4444"}}>❌ НЕТ: Family Room · DBL+TWIN · 1 номер на 4/5/6 чел · Connection room</div>
          <div style={{marginTop:"3px", fontSize:"11px", color:dark?"#7dd3fc":"#1e40af"}}>3 чел → DBL/TWIN+Extra bed · 4 чел → 2×DBL · 5 чел → 2×DBL+Extra bed или 2×DBL+Single</div>
        </div>
      )}
      {showVip && (
        <div style={{background:dark?"#1c1200":"#fffbeb", borderBottom:"1px solid #d97706", padding:"10px 14px", flexShrink:0}}>
          <div style={{fontSize:"11px", fontWeight:700, color:"#d97706", marginBottom:"6px"}}>👑 VIP расчёт: база = минивэн 5000 + гид 1000 + бесплатные локации 1000</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"2px 10px"}}>
            {VIP_PRICES.map((v,i) => (
              <div key={i} style={{fontSize:"11px", color:dark?"#fde68a":"#92400e"}}>{v.item}: <b>{v.price}</b></div>
            ))}
          </div>
        </div>
      )}

      {/* ── TOUR LIST ── */}
      <div style={{overflowY:"auto", flex:1, padding:"12px 14px"}}
        onClick={() => { if(tocOpen) setTocOpen(false) }}>
        {filtered.length === 0 ? (
          <div style={{textAlign:"center", padding:"80px 20px", color:t.muted}}>
            <div style={{fontSize:"40px", marginBottom:"10px"}}>🔍</div>
            <div>Ничего не найдено по запросу «{search}»</div>
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:"6px"}}>
            {filtered.map(tour => {
              const m = MCAT_META[tour.cat]
              const isOpen = expandedTour === tour.slug
              return (
                <div id={"mt-" + tour.slug} key={tour.id}
                  style={{background:t.card, borderRadius:"14px", border:`1.5px solid ${isOpen ? m.color : m.border}`, overflow:"hidden", transition:"border-color 0.2s"}}>

                  {/* Card header */}
                  <div onClick={() => toggleTour(tour.slug)}
                    style={{display:"flex", alignItems:"stretch", cursor:"pointer", userSelect:"none"}}>
                    <div style={{width:"4px", background:m.color, flexShrink:0}}/>
                    <div style={{flex:1, padding:"11px 12px", minWidth:0}}>
                      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px"}}>
                        <div style={{display:"flex", alignItems:"center", gap:"8px", minWidth:0}}>
                          <span style={{fontSize:"15px", flexShrink:0}}>{m.icon}</span>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:"13px", fontWeight:700, color:t.text, lineHeight:1.3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{tour.name}</div>
                            <div style={{fontSize:"11px", color:t.muted, marginTop:"1px"}}>{tour.duration}{tour.operator ? ` · ${tour.operator}` : ""}</div>
                          </div>
                        </div>
                        <div style={{display:"flex", alignItems:"center", gap:"6px", flexShrink:0}}>
                          <span style={{fontSize:"11px", color:t.muted}}>#{tour.id}</span>
                          <span style={{fontSize:"14px", color:m.color, transition:"transform 0.2s", transform:isOpen?"rotate(180deg)":"rotate(0)"}}>▾</span>
                        </div>
                      </div>
                      <div style={{display:"flex", flexWrap:"wrap", gap:"4px", marginTop:"6px"}}>
                        {tour.tags.slice(0,5).map(tag => (
                          <span key={tag} style={{fontSize:"10px", background:m.bg, color:m.color, border:`1px solid ${m.border}`, borderRadius:"99px", padding:"1px 7px", fontWeight:600}}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div style={{borderTop:`1px solid ${m.border}`, padding:"12px", background:dark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.02)", display:"flex", flexDirection:"column", gap:"10px"}}>
                      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px"}}>
                        {[
                          tour.price    && {icon:"💰", label:"Цена",      val:tour.price},
                          tour.duration && {icon:"⏱", label:"Длительность", val:tour.duration},
                          tour.operator && {icon:"🏢", label:"Оператор",  val:tour.operator},
                        ].filter(Boolean).map((row:any, i) => (
                          <div key={i} style={{background:m.bg, borderRadius:"8px", padding:"7px 10px", border:`1px solid ${m.border}`}}>
                            <div style={{fontSize:"10px", color:m.color, fontWeight:700}}>{row.icon} {row.label}</div>
                            <div style={{fontSize:"12px", color:t.text, marginTop:"2px", fontWeight:600}}>{row.val}</div>
                          </div>
                        ))}
                      </div>
                      {tour.tags.length > 0 && (
                        <div style={{display:"flex", flexWrap:"wrap", gap:"5px"}}>
                          {tour.tags.map(tag => (
                            <span key={tag} style={{fontSize:"11px", padding:"3px 9px", borderRadius:"99px", background:m.bg, color:m.color, border:`1px solid ${m.border}`, fontWeight:600}}>{tag}</span>
                          ))}
                        </div>
                      )}
                      {tour.includes && (
                        <div style={{background:dark?"#0a2010":"#f0fdf4", border:"1px solid #4ade80", borderRadius:"10px", padding:"10px 12px"}}>
                          <div style={{fontSize:"10px", fontWeight:700, color:"#4ade80", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.6px"}}>✅ Включено</div>
                          <div style={{fontSize:"12px", color:dark?"#86efac":"#166534", lineHeight:1.6}}>{tour.includes}</div>
                        </div>
                      )}
                      {tour.restrictions && (
                        <div style={{background:dark?"#2d0a0a":"#fff1f2", border:"1px solid #ef4444", borderRadius:"10px", padding:"10px 12px"}}>
                          <div style={{fontSize:"10px", fontWeight:700, color:"#ef4444", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.6px"}}>⚠️ Важно / Ограничения</div>
                          <div style={{fontSize:"12px", color:dark?"#fca5a5":"#991b1b", lineHeight:1.6}}>{tour.restrictions}</div>
                        </div>
                      )}
                      <div style={{border:`1px solid ${m.border}`, borderRadius:"14px", overflow:"hidden"}}>
                        <div style={{background:m.bg, padding:"10px 14px", display:"flex", alignItems:"center", gap:"8px"}}>
                          <span style={{fontSize:"14px"}}>🗺️</span>
                          <span style={{fontSize:"11px", fontWeight:700, color:m.color, textTransform:"uppercase", letterSpacing:"1px"}}>Маршрут / Программа</span>
                        </div>
                        <div style={{padding:"14px 14px 6px", display:"flex", flexDirection:"column", gap:"16px"}}>{tour.route.map((block, bi) => (
                            <div key={bi}>
                              {(block.day || block.label) && (
                                <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px"}}>
                                  <div style={{height:"1px", flex:1, background:m.border}}/>
                                  <span style={{background:m.color, color:m.bg, borderRadius:"99px", padding:"2px 12px", fontSize:"10px", fontWeight:800, letterSpacing:"0.5px", flexShrink:0}}>
                                    {block.label ?? `ДЕНЬ ${block.day}`}
                                  </span>
                                  <div style={{height:"1px", flex:1, background:m.border}}/>
                                </div>
                              )}
                              <div style={{position:"relative", paddingLeft:"28px"}}>
                                <div style={{position:"absolute", left:"7px", top:"6px", bottom:"6px", width:"1.5px", background:`linear-gradient(to bottom, ${m.color}88, ${m.color}22)`}}/>
                                <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
                                  {block.items.map((item, ii) => {
                                    if (item === "") return <div key={ii} style={{height:"2px"}}/>
                                    const isSection = item.startsWith("===") || (item.endsWith(":") && item.length < 40 && !item.match(/^\d/))
                                    const timePart = item.match(/^(\d{1,2}[:\.]\d{2}(?:[–-]\d{1,2}[:\.]\d{2})?)\s+(.+)/)
                                    const isAlert = item.includes("❌") || item.includes("⚠️") || item.includes("ЗАПРЕЩЕНО")
                                    const isFood = item.toLowerCase().includes("обед") || item.toLowerCase().includes("ужин") || item.toLowerCase().includes("завтрак")
                                    if (isSection) return <div key={ii} style={{fontSize:"10px", fontWeight:700, color:m.color, letterSpacing:"1px", textTransform:"uppercase", paddingLeft:"4px", marginTop:"4px"}}>{item}</div>
                                    return (
                                      <div key={ii} style={{display:"flex", alignItems:"flex-start", gap:"10px", position:"relative"}}>
                                        <div style={{position:"absolute", left:"-22px", top:"4px", width:"10px", height:"10px", borderRadius:"50%", background:isAlert?"#f87171":isFood?"#fbbf24":timePart?m.color:m.border+"88", border:`2px solid ${isAlert?"#f87171":isFood?"#fbbf24":timePart?m.color+"66":m.border}`, boxShadow:timePart?`0 0 6px ${m.color}44`:"none", flexShrink:0}}/>
                                        <div style={{flex:1}}>
                                          {timePart ? (
                                            <div style={{display:"flex", flexWrap:"wrap", alignItems:"baseline", gap:"6px"}}>
                                              <span style={{fontSize:"10px", fontWeight:800, color:m.color, background:m.bg, borderRadius:"6px", padding:"1px 6px", flexShrink:0, fontFamily:"monospace"}}>{timePart[1]}</span>
                                              <span style={{fontSize:"12px", color:isAlert?"#f87171":t.text, lineHeight:1.5, flex:1}}>{timePart[2]}</span>
                                            </div>
                                          ) : (
                                            <span style={{fontSize:"12px", color:isAlert?"#f87171":t.text, lineHeight:1.5}}>{item}</span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{height:"10px"}}/>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setWaModal({title:tour.name, short:buildTourWAShort(tour), full:buildTourWAFull(tour)}) }}
                        style={{width:"100%",padding:"9px",background:"#25d366",color:"#fff",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                        <span>📤</span> Отправить в WhatsApp
                      </button>
                      <button onClick={() => setExpandedTour(null)}
                        style={{background:"transparent", border:`1px solid ${m.border}`, borderRadius:"8px", padding:"7px", fontSize:"12px", color:m.color, cursor:"pointer", fontWeight:600}}>
                        Свернуть ▲
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* WA Modal */}
      {waModal && <WAShareModal dark={dark} title={waModal.title} shortText={waModal.short} fullText={waModal.full} onClose={() => setWaModal(null)}/>}
      {aiOpen && <AIUpdatePanel dark={dark} mode="methodichka" onUpdate={handleAIUpdate} onClose={() => setAiOpen(false)}/>}
    </div>
  )
}


// ═══════════════════════════════════════════
// ЛОДКИ — ДАННЫЕ И КОМПОНЕНТ
// ═══════════════════════════════════════════

const BOATS_DATA = [
  { id:1, name:"Bowie 1", size:"46ft", pier:"Royal Phuket Marina", type:"speedboat", maxPax:25, tours:[
    {name:"Phi Phi + Bamboo",price:45000,extra:1500,paxIncl:"1–2"},
    {name:"James Bond + Naka Island",price:45000,extra:1500,paxIncl:"1–2"},
    {name:"Phi Phi Overnight",price:67900,extra:4000,paxIncl:"1–2"},
    {name:"Krabi",price:42150,extra:1500,paxIncl:"1–2"},
    {name:"Phi Phi + Krabi",price:55000,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Krabi",price:53600,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Phi Phi",price:59300,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Krabi + Phi Phi",price:63600,extra:2500,paxIncl:"1–2"},
    {name:"Andaman Treasure 2/1",price:86500,extra:4600,paxIncl:"1–2"},
  ]},
  { id:2, name:"Bowie 2", size:"36ft", pier:"Royal Phuket Marina", type:"speedboat", maxPax:20, tours:[
    {name:"Phi Phi + Bamboo",price:45000,extra:1500,paxIncl:"1–2"},
    {name:"James Bond + Naka Island",price:45000,extra:1500,paxIncl:"1–2"},
    {name:"Phi Phi Overnight",price:67900,extra:4000,paxIncl:"1–2"},
    {name:"Krabi",price:42150,extra:1500,paxIncl:"1–2"},
    {name:"Phi Phi + Krabi",price:55000,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Krabi",price:53600,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Phi Phi",price:59300,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Krabi + Phi Phi",price:63600,extra:2500,paxIncl:"1–2"},
    {name:"Andaman Treasure 2/1",price:86500,extra:4600,paxIncl:"1–2"},
  ]},
  { id:3, name:"Sofia", size:"45ft", pier:"Bang Rong Pier", type:"speedboat", maxPax:20, tours:[
    {name:"Phi Phi + Bamboo",price:38000,extra:1500,paxIncl:"1–2"},
    {name:"James Bond + Naka Island",price:39000,extra:1500,paxIncl:"1–2"},
    {name:"Krabi",price:38000,extra:1500,paxIncl:"1–2"},
    {name:"Phi Phi + Krabi",price:50500,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Krabi",price:50500,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Phi Phi",price:50500,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Krabi + Phi Phi",price:62150,extra:2500,paxIncl:"1–2"},
  ]},
  { id:4, name:"Thaimarine", size:"47ft", pier:"Royal Phuket Marina", type:"speedboat", maxPax:20, tours:[
    {name:"Phi Phi + Bamboo",price:72400,extra:1500,paxIncl:"1–2"},
    {name:"James Bond + Naka Island",price:64900,extra:1500,paxIncl:"1–2"},
    {name:"Phi Phi + Krabi",price:76900,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Krabi",price:82800,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Phi Phi",price:82800,extra:2500,paxIncl:"1–2"},
  ]},
  { id:5, name:"Gambit", size:"36ft", pier:"Chalong Pier", type:"speedboat", maxPax:10, tours:[
    {name:"Phi Phi + Bamboo",price:38000,extra:1500,paxIncl:"1–2"},
  ]},
  { id:6, name:"Yamela", size:"40ft", pier:"Chalong Pier", type:"speedboat", maxPax:15, tours:[
    {name:"Phi Phi + Bamboo",price:38000,extra:1500,paxIncl:"1–2"},
  ]},
  { id:7, name:"Lexi", size:"45ft", pier:"Royal Phuket Marina", type:"speedboat", maxPax:30, tours:[
    {name:"Phi Phi + Bamboo",price:49300,extra:1600,paxIncl:"1–2"},
    {name:"James Bond + Naka Island",price:47900,extra:1600,paxIncl:"1–2"},
    {name:"Phi Phi + Krabi",price:62150,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Krabi",price:77150,extra:2500,paxIncl:"1–2"},
    {name:"James Bond + Phi Phi",price:77150,extra:2500,paxIncl:"1–2"},
    {name:"Similan (RPM)",price:96400,extra:1700,paxIncl:"1–2"},
    {name:"Similan (Taplamu)",price:68600,extra:2150,paxIncl:"1–2"},
    {name:"Surin Islands",price:80000,extra:2500,paxIncl:"1–2"},
    {name:"Koh Rok Ko Ha",price:97000,extra:1800,paxIncl:"1–2"},
  ]},
  { id:8, name:"Verona", size:"46ft", pier:"Taplamu Pier", type:"speedboat", maxPax:30, tours:[
    {name:"Similan Islands",price:68500,extra:1500,paxIncl:"1–2"},
    {name:"Surin Islands",price:80000,extra:2500,paxIncl:"1–2"},
  ]},
  { id:9, name:"Romeo", size:"46ft", pier:"Taplamu Pier", type:"speedboat", maxPax:30, tours:[
    {name:"Similan Islands",price:68500,extra:1500,paxIncl:"1–2"},
    {name:"Surin Islands",price:80000,extra:2500,paxIncl:"1–2"},
  ]},
  { id:10, name:"Randezvous", size:"44ft", pier:"Chalong Pier", type:"catamaran", maxPax:10,
    note:"Обед включён. Seafood +650 ฿/чел, рус. гид +3500 ฿",
    tours:[
      {name:"Maithon + Racha Yai",price:68800,extra:null,paxIncl:"10"},
      {name:"Racha Yai Fishing",price:68800,extra:null,paxIncl:"10"},
      {name:"Phi Phi",price:76500,extra:800,paxIncl:"1–2"},
      {name:"Phi Phi Bamboo",price:83500,extra:800,paxIncl:"1–2"},
      {name:"Krabi-Koh Hong",price:83500,extra:800,paxIncl:"1–2"},
  ]},
  { id:11, name:"Zoe", size:"46ft", pier:"Chalong Pier", type:"catamaran", maxPax:15,
    note:"Обед (seafood) включён. Рус. гид +3500 ฿. Бассейн +3500 ฿, горка +3500 ฿",
    tours:[
      {name:"Racha Yai + Coral",price:40000,extra:1500,paxIncl:"1–2"},
      {name:"Racha Noi",price:46500,extra:1500,paxIncl:"1–2"},
  ]},
  { id:12, name:"Sunny", size:"38ft", pier:"Chalong Pier", type:"catamaran", maxPax:10,
    note:"Обед (seafood) включён. Рус. гид +3500 ฿. Бассейн +3500 ฿, горка +3500 ฿",
    tours:[
      {name:"Racha Yai + Coral",price:37500,extra:1500,paxIncl:"1–2"},
      {name:"Racha Noi",price:44500,extra:1500,paxIncl:"1–2"},
  ]},
  { id:13, name:"Oceanland", size:"45ft", pier:"Chalong Pier", type:"catamaran", maxPax:20,
    note:"Обед (seafood) включён. Рус. гид +3500 ฿. Бассейн +3500 ฿, горка +3500 ฿",
    tours:[
      {name:"Racha Yai + Coral",price:51500,extra:1500,paxIncl:"1–2"},
      {name:"Racha Noi",price:57500,extra:1500,paxIncl:"1–2"},
  ]},
  { id:14, name:"Pepper", size:"47ft", pier:"Chalong Pier", type:"catamaran", maxPax:30,
    note:"Обед не включён (640–920 ฿/чел). Рус. гид +3500 ฿. 1–15 чел в базе.",
    tours:[
      {name:"Racha Yai + Coral",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
      {name:"Maithon + Coral",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
      {name:"Coral + Promthep",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
  ]},
  { id:15, name:"Senna", size:"47ft", pier:"Chalong Pier", type:"catamaran", maxPax:30,
    note:"Обед не включён (640–920 ฿/чел). Рус. гид +3500 ฿. 1–15 чел в базе.",
    tours:[
      {name:"Racha Yai + Coral",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
      {name:"Maithon + Coral",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
      {name:"Coral + Promthep",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
  ]},
  { id:16, name:"Summer", size:"47ft", pier:"Nakalay Pier (Kalim)", type:"catamaran", maxPax:15,
    note:"Обед включён. Рус. гид +3500 ฿. 1–6 чел в базе.",
    tours:[
      {name:"North (Rock Cliff + Kamala + Laem Sing + Surin + Koh Waew + Banana)",price:65500,extra:900,paxIncl:"1–6"},
      {name:"South (Patong + Freedom Beach + Laem Krating + Promthep)",price:65500,extra:900,paxIncl:"1–6"},
  ]},
  { id:17, name:"Coco", size:"40ft", pier:"Chalong Pier", type:"catamaran", maxPax:20,
    note:"Обед не включён. Рус. гид +3500 ฿. 1–15 чел в базе.",
    tours:[
      {name:"Racha Yai + Coral",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
      {name:"Maithon + Coral",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
      {name:"Coral + Promthep",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
  ]},
  { id:18, name:"Tahaa", size:"42ft", pier:"Chalong Pier", type:"catamaran", maxPax:30,
    note:"Обед не включён. Рус. гид +3500 ฿. 1–15 чел в базе.",
    tours:[
      {name:"Racha Yai + Coral",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
      {name:"Maithon + Coral",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
      {name:"Coral + Promthep",price:44000,extra:"1500+lunch",paxIncl:"Lunch не вкл."},
  ]},
  { id:19, name:"Myra", size:"47ft", pier:"Ao Po", type:"catamaran", maxPax:15,
    note:"Обед не включён. Рус. гид +3500 ฿. Нац. парки и каноэ оплачиваются отдельно.",
    tours:[
      {name:"Phang Nga Bay (Panak + Hong + Bond)",price:59600,extra:null,paxIncl:"1–15"},
      {name:"Khai Island + Naka Island",price:59600,extra:null,paxIncl:"1–15"},
      {name:"Hong-Krabi (Hong + Lao Lading + Lao Ka + Pakbia + Rai)",price:71000,extra:null,paxIncl:"1–15"},
  ]},
  { id:20, name:"Ocean Dream", size:"40ft", pier:"Chalong Pier", type:"catamaran", maxPax:15,
    note:"Обед включён. Рус. гид +3500 ฿. Бассейн +4500 ฿, горка +3600 ฿. 1–6 чел в базе.",
    tours:[
      {name:"Racha Yai + Coral (9:00–16:00)",price:38000,extra:2500,paxIncl:"1–6"},
      {name:"Khai Island (9:00–18:00)",price:45000,extra:2500,paxIncl:"1–6"},
      {name:"Racha Yai + Coral + Sunset (10:30–19:00)",price:42000,extra:2500,paxIncl:"1–6"},
  ]},
  { id:21, name:"Ameray", size:"37ft", pier:"Chalong Pier", type:"catamaran", maxPax:15,
    note:"Обед включён. Рус. гид +3500 ฿. Бассейн +4500 ฿, горка +3600 ฿. 1–6 чел в базе.",
    tours:[
      {name:"Racha Yai + Coral (9:00–16:00)",price:38000,extra:2500,paxIncl:"1–6"},
      {name:"Khai Island (9:00–18:00)",price:45000,extra:2500,paxIncl:"1–6"},
      {name:"Racha Yai + Coral + Sunset (10:30–19:00)",price:42000,extra:2500,paxIncl:"1–6"},
  ]},
  { id:22, name:"Wildcat", size:"44ft", pier:"Chalong Pier", type:"catamaran", maxPax:15,
    note:"Обед включён. Рус. гид +3500 ฿. Бассейн +4500 ฿, горка +3600 ฿. 1–6 чел в базе.",
    tours:[
      {name:"Racha Yai + Coral (9:00–16:00)",price:38000,extra:2500,paxIncl:"1–6"},
      {name:"Khai Island (9:00–18:00)",price:45000,extra:2500,paxIncl:"1–6"},
      {name:"Racha Yai + Coral + Sunset (10:30–19:00)",price:42000,extra:2500,paxIncl:"1–6"},
  ]},
  { id:23, name:"White Corn", size:"38ft", pier:"Chalong Pier", type:"catamaran", maxPax:15,
    note:"Обед BBQ+Seafood включён. Рус. гид +3500 ฿. 1–5 чел в базе.",
    tours:[{name:"Racha Yai + Coral",price:40000,extra:1500,paxIncl:"1–5"}]},
  { id:24, name:"Black Pearl", size:"40ft", pier:"Chalong Pier", type:"catamaran", maxPax:15,
    note:"Обед BBQ+Seafood включён. Рус. гид +3500 ฿. 1–5 чел в базе.",
    tours:[{name:"Racha Yai + Coral",price:40000,extra:1500,paxIncl:"1–5"}]},
  { id:25, name:"Ella", size:"53ft", pier:"Chalong Pier", type:"catamaran", maxPax:20,
    note:"Обед +500 ฿/чел. Рус. гид +3500 ฿. Бассейн +3500 ฿. 1–10 чел в базе. Цена выше 20/12–01/03.",
    tours:[
      {name:"Racha Yai + Coral",price:42000,extra:"1500+lunch",paxIncl:"1–10"},
      {name:"Racha + Coral + Promthep",price:44000,extra:"1500+lunch",paxIncl:"1–10"},
  ]},
  { id:26, name:"Calypso", size:"44ft", pier:"Chalong Pier", type:"catamaran", maxPax:20,
    note:"Обед +500 ฿/чел. Рус. гид +3500 ฿. Бассейн +3500 ฿. 1–10 чел в базе. Цена выше 20/12–01/03.",
    tours:[
      {name:"Racha Yai + Coral",price:44500,extra:"1500+lunch",paxIncl:"1–10"},
      {name:"Racha + Coral + Promthep",price:46500,extra:"1500+lunch",paxIncl:"1–10"},
  ]},
  { id:27, name:"Bohemian", size:"50ft", pier:"Chalong Pier", type:"catamaran", maxPax:25,
    note:"Обед +500 ฿/чел. Рус. гид +3500 ฿. Бассейн +3500 ฿. 1–10 чел в базе. Цена выше 20/12–01/03.",
    tours:[
      {name:"Racha Yai + Coral",price:42000,extra:"1500+lunch",paxIncl:"1–10"},
      {name:"Racha + Coral + Promthep",price:44000,extra:"1500+lunch",paxIncl:"1–10"},
  ]},
  { id:28, name:"F1", size:"42ft", pier:"Chalong Pier", type:"catamaran", maxPax:15,
    note:"Обед включён. Рус. гид +3500 ฿. Бассейн +3500 ฿. 1–8 чел в базе.",
    tours:[
      {name:"Racha Yai + Coral",price:54450,extra:1900,paxIncl:"1–8"},
      {name:"Racha + Racha Yai",price:58100,extra:1900,paxIncl:"1–8"},
      {name:"Phi Phi (без Bamboo)",price:59260,extra:"1000/чел до 8, +2800 свыше 8",paxIncl:"1–2"},
      {name:"James Bond + Koh Khai Nok",price:67800,extra:"1500/чел до 8, +3300 свыше 8",paxIncl:"1–2"},
  ]},
  { id:29, name:"Whiskey", size:"48ft", pier:"Chalong Pier", type:"powercat", maxPax:20,
    note:"Обед включён. Бассейн и горка включены. Удочки бесплатно. Рус. гид +3500 ฿. 1–10 чел в базе.",
    tours:[{name:"Racha Yai + Coral",price:54600,extra:1500,paxIncl:"1–10"}]},
  { id:30, name:"Tequila", size:"37ft", pier:"Chalong Pier", type:"powercat", maxPax:10,
    note:"Обед включён. Бассейн и горка включены. Удочки бесплатно. Рус. гид +3500 ฿.",
    tours:[
      {name:"Racha Yai + Coral",price:57150,extra:null,paxIncl:"1–10"},
      {name:"Racha + Racha Noi",price:62900,extra:null,paxIncl:"1–10"},
      {name:"Phi Phi + Bamboo",price:66900,extra:1000,paxIncl:"1–2"},
  ]},
  { id:31, name:"Vodka", size:"46ft", pier:"Chalong Pier", type:"speedboat", maxPax:10,
    note:"Обед включён. Бассейн и горка включены. Удочки бесплатно. Рус. гид +3500 ฿.",
    tours:[
      {name:"Racha Yai + Coral",price:65710,extra:null,paxIncl:"1–10"},
      {name:"Racha + Racha Noi",price:80000,extra:null,paxIncl:"1–10"},
      {name:"Phi Phi + Bamboo",price:88300,extra:1000,paxIncl:"1–2"},
  ]},
  { id:32, name:"Origin", size:"90ft", pier:"Chalong Pier", type:"yacht", maxPax:20,
    note:"Обед не включён (640–920 ฿/чел). Рус. гид +3500 ฿. Complimentary: вино 2 бут., пиво 24 бан., бассейн, горка, iAqua ×2, SUP и т.д.",
    tours:[
      {name:"Racha Yai + Coral",price:124300,extra:"+lunch",paxIncl:"1–20"},
      {name:"Maithon + Coral",price:124300,extra:"+lunch",paxIncl:"1–20"},
      {name:"Coral + Promthep",price:124300,extra:"+lunch",paxIncl:"1–20"},
      {name:"Khai + Maithon",price:124300,extra:"+lunch",paxIncl:"1–20"},
  ]},
  { id:33, name:"Lady M", size:"54ft", pier:"Royal Phuket Marina", type:"yacht", maxPax:8,
    note:"Обед и гид включены. Пиво 24 бан. или 12 бан. + 1 бут. вина (на выбор).",
    tours:[
      {name:"Coral Island",price:150000,extra:4500,paxIncl:"1–4"},
      {name:"Maithon Island",price:150000,extra:4500,paxIncl:"1–4"},
      {name:"Khai Island",price:150000,extra:4500,paxIncl:"1–4"},
      {name:"Racha",price:200000,extra:4500,paxIncl:"1–4"},
      {name:"Phi Phi Island",price:190000,extra:4500,paxIncl:"1–4"},
  ]},
  { id:34, name:"Azimut", size:"50ft", pier:"Chalong Pier", type:"yacht", maxPax:11,
    note:"Обед и пиво (24 бан.) включены. Рус. гид +3500 ฿. Цена выше 20/12–20/01. 1–8 чел в базе.",
    tours:[
      {name:"Racha Yai",price:85000,extra:1500,paxIncl:"1–8"},
      {name:"Racha Noi",price:93600,extra:1500,paxIncl:"1–8"},
      {name:"Phi Phi Bamboo",price:106400,extra:1500,paxIncl:"1–8"},
      {name:"James Bond",price:99300,extra:1500,paxIncl:"1–8"},
      {name:"Krabi",price:99300,extra:1500,paxIncl:"1–8"},
      {name:"Phi Phi",price:99300,extra:1500,paxIncl:"1–8"},
  ]},
  { id:35, name:"Bertram", size:"50ft", pier:"Chalong Pier", type:"yacht", maxPax:13,
    note:"Обед и пиво (24 бан.) включены. Рус. гид +3500 ฿. Цена выше 20/12–20/01. 1–8 чел в базе.",
    tours:[
      {name:"Coral Island (Coral + Nui Bay + Promthep)",price:63600,extra:1500,paxIncl:"1–8"},
      {name:"Racha Yai",price:83600,extra:1500,paxIncl:"1–8"},
      {name:"Racha Noi",price:92150,extra:1500,paxIncl:"1–8"},
      {name:"Phi Phi Don / Phi Phi Lay",price:99300,extra:1500,paxIncl:"1–8"},
      {name:"Racha Yai Fishing",price:83600,extra:1500,paxIncl:"1–8"},
      {name:"Racha Noi Fishing",price:92150,extra:1500,paxIncl:"1–8"},
  ]},
  { id:36, name:"Red Dragon", size:"36ft", pier:"Chalong Pier", type:"speedboat", maxPax:8,
    note:"Обед включён. Рус. гид +3500 ฿.",
    tours:[{name:"Racha Yai",price:28500,extra:null,paxIncl:"1–8"}]},
  { id:37, name:"Solita", size:"48ft", pier:"Chalong Pier", type:"speedboat", maxPax:10,
    note:"Обед включён. Рус. гид +3500 ฿.",
    tours:[{name:"Racha Yai",price:31500,extra:null,paxIncl:"1–10"}]},
]

const BOAT_TYPE_META: Record<string,{label:string;color:string;border:string;bg:string}> = {
  speedboat: {label:"⚡ Скоростная", color:"#38bdf8", border:"#1e3f6a", bg:"#0c2340"},
  catamaran: {label:"⛵ Катамаран",  color:"#4ade80", border:"#16a34a", bg:"#0d2010"},
  powercat:  {label:"🔱 Пауэркат",  color:"#fb923c", border:"#c2410c", bg:"#2d1500"},
  yacht:     {label:"🛥️ Яхта",      color:"#c084fc", border:"#7c3aed", bg:"#1e1040"},
}
const BOAT_PIERS = ["Все","Chalong Pier","Royal Phuket Marina","Bang Rong Pier","Taplamu Pier","Nakalay Pier (Kalim)","Ao Po"]

function fmtPrice(n: number|string|null): string {
  if (n === null) return "—"
  if (typeof n === "number") return n.toLocaleString("ru-RU") + " ฿"
  return n + " ฿"
}

const BOATS_DRIVE_LINKS: Record<string,string> = {
  "Bowie 1":    "https://drive.google.com/drive/folders/1DMstt7CMkXog7yp0LCpvxedzSuNXblrG",
  "Bowie 2":    "https://drive.google.com/drive/folders/1soiMLhTVqupUqYL7TuE1Ln7RERkiw5XV",
  "Thaimarine": "https://drive.google.com/drive/folders/1jEEnwwBajxtSO5I0vGUfdXlolOtgcY3q",
  "Gambit":     "https://drive.google.com/drive/folders/1NN6M-ea9pDlKgz51s_WP-UkcvQutt3OC",
  "Yamela":     "https://drive.google.com/drive/folders/1iTg81mXUhcR_j36oqNas69a30tQEmQHU",
  "Verona":     "https://drive.google.com/drive/folders/1c0AMe86EWdQU0HLwDOoLAk7P4kuI2oq4",
  "Romeo":      "https://drive.google.com/drive/folders/1qs-REzkEGfGWyfIJXGj66OfssaFxFUAn",
  "Lexi":       "https://drive.google.com/drive/folders/1XBSdmfPFk1LXadlJ4qAIU0QsdczFGUOj",
  "Randezvous": "https://drive.google.com/drive/folders/1ILUqV3U8VJq-gA3cBEIczFy86qArFSD-",
  "Zoe":        "https://drive.google.com/drive/folders/1PUVoPqbYKkYnZqjMiN5zyVypphtNZj3h",
  "Sunny":      "https://drive.google.com/drive/folders/1jfPZgXfTy58EfSvG3wR7znvR8lCalzHX",
  "Oceanland":  "https://drive.google.com/drive/folders/1--7mTJnU-FfdGaPT8BdIcGBc1QlBgmr3",
  "Pepper":     "https://drive.google.com/drive/folders/1O9usPG_S7xSzonv2xDHhh4h57cyjj5PC",
  "Senna":      "https://drive.google.com/drive/folders/1dhoafTN76LDlEcXhXxG_O2ZR4alXh3Lu",
  "Summer":     "https://drive.google.com/drive/folders/1PCh6daqP_fB7o7HV2Vgpj4w1ANnhQnzE",
  "Coco":       "https://drive.google.com/drive/folders/1YJ3hrUBHgZs1uB_WfzfUZ4wJwP2pczUM",
  "Tahaa":      "https://drive.google.com/drive/folders/1yKSJmaghsTTzabRivmWpVZrwekFsLFDm",
  "Myra":       "https://drive.google.com/drive/folders/1T4Vn3ub7ohqk3qI46phscLA8yW-SZl_j",
  "Ocean Dream":"https://drive.google.com/drive/u/0/folders/1dIqceqeU4jpv0_8Jb722pxOrV2sW63Z",
  "Ameray":     "https://drive.google.com/drive/folders/1RvMJgxFDf-2QWPqX2eGoqwC99VDGXF1w",
  "Wildcat":    "https://drive.google.com/drive/folders/1FzZp3QV2x8wWhQY23bDmJTEMvKRIajqC",
  "White Corn": "https://drive.google.com/drive/folders/1-_WwAhjkyJACcXK0uW9dF5K7pUugVD7H",
  "Black Pearl":"https://drive.google.com/drive/folders/1-MNse3i6r3OHoxtR2gukV5lKWQFBkU2j",
  "Ella":       "https://drive.google.com/drive/folders/1GaJbjLCzLO7clwYJNC6Ewiw1JWjeNHij",
  "Calypso":    "https://drive.google.com/drive/folders/1ow1u3IqmpJ0H-U-HDsCo46JZgg48-s0j",
  "Bohemian":   "https://drive.google.com/drive/folders/1Oo4-GftlfLBhgKGygQCRSFgrC0giEb2B",
  "F1":         "https://drive.google.com/drive/folders/17JVhaqA7fg5OgtWL5BpQQgudR9aonYbX",
  "Whiskey":    "https://drive.google.com/drive/folders/1GcrhgI2zst9ZIXddiFu4QbltigqChkLo",
  "Tequila":    "https://drive.google.com/drive/folders/1Qj56ehlML7DrSU7NArhed0gFszIXZCxn",
  "Vodka":      "https://drive.google.com/drive/folders/1a6gwWKdpaI1k6IvddudzA4MLJmFKETWz",
  "Origin":     "https://drive.google.com/drive/folders/1Qk63PA8BPrLb5i-eonuOpXa73Ih1-nw3",
  "Lady M":     "https://drive.google.com/drive/folders/1S7xW_Ffg4DAsJu1Q74jlvF-jZgWGajNM",
  "Red Dragon": "https://drive.google.com/drive/folders/13xVqPmzDQ37ZZatcGqYvJLoEaoSx1it0",
  "Solita":     "https://drive.google.com/drive/folders/182eRIu9f4Eh9QTKZr37VDdoW23gKBphx",
}

function BoatsTab({dark}:{dark:boolean}) {
  const t = {
    bg:dark?"#0b1120":"#f0f4f8", card:dark?"#131d2e":"#ffffff",
    cardBorder:dark?"#1e2f45":"#d1dce8", text:dark?"#e2eaf4":"#1a2636",
    muted:dark?"#5b7a9a":"#6e8aa8", accent:dark?"#38bdf8":"#0369a1",
    header:dark?"#0d1929":"#e2ecf7", inputBg:dark?"#101c2d":"#ffffff",
    inputBdr:dark?"#1e3450":"#c5d5e5", row0:dark?"transparent":"#fafafa",
    row1:dark?"rgba(255,255,255,0.02)":"#f0f4f8",
  }

  const [search,  setSearch]  = useState("")
  const [typeF,   setTypeF]   = useState("all")
  const [pierF,   setPierF]   = useState("all")
  const [sortBy,  setSortBy]  = useState<"name"|"price"|"size"|"pax">("name")
  const [openId,  setOpenId]  = useState<number|null>(null)
  const [waModal, setWaModal] = useState<{title:string;short:string;full:string}|null>(null)

  // Calculator state
  const [calcOpen,     setCalcOpen]     = useState(false)
  const [calcBoatId,   setCalcBoatId]   = useState<number|string>("")
  const [calcTour,     setCalcTour]     = useState(0)
  const [calcPax,      setCalcPax]      = useState(2)
  const [calcGuide,    setCalcGuide]    = useState(false)
  const [calcMeal,     setCalcMeal]     = useState<"none"|"A"|"B"|"C">("none")
  const [calcPool,     setCalcPool]     = useState(false)
  const [calcSlide,    setCalcSlide]    = useState(false)
  const [calcSeafood,  setCalcSeafood]  = useState(false)
  const [calcBBQ,      setCalcBBQ]      = useState(false)
  const [calcFishing,  setCalcFishing]  = useState(false)
  const [calcCanoe,    setCalcCanoe]    = useState(false)

  const [aiOpen, setAiOpen] = useState(false)
  const [liveBoats, setLiveBoats] = useState<typeof BOATS_DATA>(BOATS_DATA)
  const [excelStatus, setExcelStatus] = useState<string|null>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const [pinnedBoats, setPinnedBoats] = useState<number[]>([])
  const [copiedPrice, setCopiedPrice] = useState<string|null>(null)

  useEffect(() => {
    const s = localStorage.getItem("nav_boats_data")
    if (s) try { setLiveBoats(JSON.parse(s)) } catch {}
    const p = localStorage.getItem("nav_boats_pinned")
    if (p) try { setPinnedBoats(JSON.parse(p)) } catch {}
  }, [])

  function togglePin(id: number) {
    setPinnedBoats(prev => {
      const next = prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]
      localStorage.setItem("nav_boats_pinned", JSON.stringify(next))
      return next
    })
  }

  function copyPrice(price: number|string, label: string) {
    const text = typeof price === "number" ? price.toLocaleString("ru-RU") + " ฿" : String(price)
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPrice(label); setTimeout(() => setCopiedPrice(null), 1500)
    })
  }

  const SHEET_TO_BOAT_BOATS: Record<string,string> = {
    "Table 1":"Bowie 1","Table 2":"Bowie 2","Table 3":"Sofia","Table 4":"Thaimarine",
    "Table 5":"Gambit","Table 6":"Yamela","Table 7":"Verona","Table 8":"Romeo",
    "Table 9":"Lexi","Table 10":"Randezvous","Table 11":"Zoe","Table 12":"Sunny",
    "Table 13":"Oceanland","Table 14":"Pepper","Table 15":"Senna","Table 16":"Summer",
    "Table 17":"Coco","Table 18":"Myra","Table 19":"Tahaa","Table 20":"Ocean Dream",
    "Table 21":"Ameray","Table 22":"Wildcat","Table 23":"White Corn","Table 24":"Black Pearl",
    "Table 25":"Ella","Table 26":"Calypso","Table 27":"Bohemian","Table 28":"F1",
    "Table 29":"Whiskey","Table 30":"Tequila","Table 31":"Vodka","Table 32":"Origin",
    "Table 33":"Lady M","Table 35":"Red Dragon","Table 36":"Solita",
  }

  function handleExcelUpload(file: File) {
    setExcelStatus("⏳ Читаю файл...")
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, {type:"array"})
        const updates: {name:string; tours:{price:number;extra:number|string|null}[]; maxPax:number|null}[] = []

        for (const [sheetName, boatName] of Object.entries(SHEET_TO_BOAT_BOATS)) {
          if (!wb.SheetNames.includes(sheetName)) continue
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<any[]>(ws, {header:1, defval:null})

          let headerIdx = -1, tourCol = -1, priceCol = -1, extraCol = -1
          for (let i = 0; i < rows.length; i++) {
            if (rows[i].some((v:any) => String(v||"").toUpperCase().includes("TOUR"))) {
              headerIdx = i
              rows[i].forEach((v:any, ci:number) => {
                const s = String(v||"").toUpperCase()
                if (s.includes("TOUR") && tourCol<0) tourCol = ci
                else if (s.includes("PRICE") && priceCol<0) priceCol = ci
                else if (s.includes("EXTRA") && extraCol<0) extraCol = ci
              })
              break
            }
          }
          if (headerIdx < 0 || priceCol < 0) continue

          let maxPax: number|null = null
          for (const row of rows) {
            for (const v of row) {
              const m = String(v||"").match(/MAXIMUM\s*(\d+)/i)
              if (m) { maxPax = parseInt(m[1]); break }
            }
            if (maxPax) break
          }

          const tours: {price:number;extra:number|string|null}[] = []
          for (let i = headerIdx+1; i < rows.length; i++) {
            const row = rows[i]
            const tourVal = tourCol>=0 ? row[tourCol] : null
            const priceVal = priceCol>=0 ? row[priceCol] : null
            if (!tourVal || typeof priceVal !== "number") continue
            let extra: number|string|null = null
            if (extraCol>=0 && row[extraCol]!=null && String(row[extraCol]).trim()!==".") {
              const ev = String(row[extraCol]).trim()
              const num = parseFloat(ev)
              extra = isNaN(num) ? ev : num
            }
            tours.push({price: Math.round(priceVal), extra})
          }
          if (tours.length > 0) updates.push({name: boatName, tours, maxPax})
        }

        if (updates.length === 0) { setExcelStatus("⚠️ Лодки не найдены. Проверь формат файла."); return }

        setLiveBoats(prev => {
          const result = [...prev] as any[]
          let updatedCount = 0
          updates.forEach(upd => {
            const idx = result.findIndex(b => b.name === upd.name)
            if (idx < 0) return
            const boat = {...result[idx]}
            const newTours = [...boat.tours]
            upd.tours.forEach((ut, ti) => {
              if (ti < newTours.length) newTours[ti] = {...newTours[ti], price: ut.price, ...(ut.extra!==null&&{extra:ut.extra})}
            })
            boat.tours = newTours
            if (upd.maxPax) boat.maxPax = upd.maxPax
            result[idx] = boat
            updatedCount++
          })
          localStorage.setItem("nav_boats_data", JSON.stringify(result))
          setExcelStatus(`✅ Обновлено ${updatedCount} лодок из ${updates.length} найденных`)
          return result
        })
      } catch(err) { setExcelStatus("❌ Ошибка: " + String(err)) }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleAIUpdate(incoming: any[]) {
    setLiveBoats(prev => {
      const result = [...prev] as any[]
      incoming.forEach((nb: any) => {
        const idx = result.findIndex(b => b.name.toLowerCase() === (nb.name||"").toLowerCase())
        if (idx >= 0) {
          const boat = {...result[idx]}
          if (nb.tours?.length) {
            const tours = [...boat.tours] as any[]
            nb.tours.forEach((nt: any) => {
              const ti = tours.findIndex((t:any) => t.name.toLowerCase() === nt.name.toLowerCase())
              if (ti >= 0) tours[ti] = {...tours[ti], price: nt.price ?? tours[ti].price, extra: nt.extra !== undefined ? nt.extra : tours[ti].extra}
              else tours.push({name: nt.name, price: nt.price, extra: nt.extra ?? null, paxIncl: nt.paxIncl || "1–2"})
            })
            boat.tours = tours
          }
          if (nb.note) boat.note = nb.note
          result[idx] = boat
        } else if (nb.name) {
          result.push({id: Date.now(), name: nb.name, size: nb.size||"", pier: nb.pier||"", type: nb.type||"speedboat", maxPax: nb.maxPax||20, tours: (nb.tours||[]).map((t:any)=>({name:t.name,price:t.price,extra:t.extra??null,paxIncl:t.paxIncl||"1–2"})), ...(nb.note&&{note:nb.note})})
        }
      })
      localStorage.setItem("nav_boats_data", JSON.stringify(result))
      return result
    })
  }

  const allPiers = useMemo(()=>Array.from(new Set(liveBoats.map(b=>b.pier))).sort(),[liveBoats])

  const filtered = useMemo(()=>{
    return [...liveBoats].filter(b=>{
      const q = search.toLowerCase().trim()
      const matchQ = !q || b.name.toLowerCase().includes(q) || b.pier.toLowerCase().includes(q) ||
        b.tours.some(tt=>tt.name.toLowerCase().includes(q))
      const matchT = typeF==="all" || b.type===typeF
      const matchP = pierF==="all" || b.pier===pierF
      return matchQ && matchT && matchP
    }).sort((a,b2)=>{
      const aPinned = pinnedBoats.includes(a.id) ? 0 : 1
      const bPinned = pinnedBoats.includes(b2.id) ? 0 : 1
      if (aPinned !== bPinned) return aPinned - bPinned
      if(sortBy==="name") return a.name.localeCompare(b2.name)
      if(sortBy==="price"){
        const pa = Math.min(...a.tours.map(tt=>typeof tt.price==="number"?tt.price:999999))
        const pb = Math.min(...b2.tours.map(tt=>typeof tt.price==="number"?tt.price:999999))
        return pa - pb
      }
      if(sortBy==="size") return parseInt(b2.size)-parseInt(a.size)
      if(sortBy==="pax")  return b2.maxPax - a.maxPax
      return 0
    })
  },[search,typeF,pierF,sortBy,liveBoats,pinnedBoats])

  const typeStats = ["speedboat","catamaran","powercat","yacht"].map(tp=>({
    tp, label:BOAT_TYPE_META[tp]?.label||tp, color:BOAT_TYPE_META[tp]?.color||"#888",
    count:liveBoats.filter(b=>b.type===tp).length
  }))

  const inputSt:React.CSSProperties={width:"100%",padding:"9px 12px",borderRadius:"10px",border:`1px solid ${t.inputBdr}`,background:t.inputBg,color:t.text,fontSize:"13px",fontWeight:600,outline:"none",boxSizing:"border-box"}

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 110px)",overflow:"hidden"}}>

      {/* ── Toolbar ── */}
      <div style={{background:t.header,borderBottom:`1px solid ${t.cardBorder}`,padding:"10px 12px",flexShrink:0}}>

        {/* Title row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px",flexWrap:"wrap",gap:"6px"}}>
          <div>
            <div style={{fontSize:"14px",fontWeight:800,color:t.accent}}>🚢 Лодки и яхты</div>
            <div style={{fontSize:"11px",color:t.muted}}>Прайс-лист · {liveBoats.length} судов · сезон 2025–2026 · все цены ฿</div>
          </div>
          <div style={{display:"flex",gap:"5px",alignItems:"center",flexWrap:"wrap"}}>
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" style={{display:"none"}}
              onChange={e=>{const f=e.target.files?.[0];if(f)handleExcelUpload(f);e.target.value=""}}/>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"2px"}}>
              <button onClick={()=>excelInputRef.current?.click()}
                style={{padding:"6px 12px",fontSize:"12px",fontWeight:700,borderRadius:"8px",border:"none",cursor:"pointer",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",boxShadow:"0 2px 8px rgba(245,158,11,0.3)"}}>
                📂 Загрузить прайс (Excel)
              </button>
              {excelStatus && <div style={{fontSize:"10px",color:excelStatus.startsWith("✅")?"#4ade80":excelStatus.startsWith("❌")?"#f87171":"#fbbf24",fontWeight:600}}>{excelStatus}</div>}
            </div>
            <button onClick={()=>{setCalcOpen(true);setCalcBoatId("");setCalcTour(0);setCalcPax(2);setCalcGuide(false);setCalcMeal("none");setCalcPool(false);setCalcSlide(false);setCalcSeafood(false);setCalcBBQ(false);setCalcFishing(false);setCalcCanoe(false)}}
              style={{padding:"6px 12px",fontSize:"12px",fontWeight:700,borderRadius:"8px",border:"none",cursor:"pointer",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",boxShadow:"0 2px 8px rgba(245,158,11,0.3)"}}>
              🧮 Калькулятор
            </button>
            {typeStats.map(s=>(
              <span key={s.tp} style={{fontSize:"10px",padding:"2px 7px",borderRadius:"99px",background:`${s.color}22`,color:s.color,fontWeight:700,border:`1px solid ${s.color}44`}}>
                {s.label}: {s.count}
              </span>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Поиск по названию, маршруту, пирсу..."
            style={{...inputSt,flex:"1 1 160px",padding:"8px 12px"}}/>
          <select value={pierF} onChange={e=>setPierF(e.target.value)} style={{...inputSt,flex:"0 0 auto"}}>
            <option value="all">Все пирсы</option>
            {allPiers.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={{...inputSt,flex:"0 0 auto"}}>
            <option value="all">Все типы</option>
            {["speedboat","catamaran","powercat","yacht"].map(tp=>(
              <option key={tp} value={tp}>{BOAT_TYPE_META[tp]?.label||tp}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)} style={{...inputSt,flex:"0 0 auto"}}>
            <option value="name">По имени</option>
            <option value="price">По цене ↑</option>
            <option value="size">По размеру ↓</option>
            <option value="pax">По PAX ↓</option>
          </select>
        </div>
        <div style={{fontSize:"11px",color:t.muted,marginTop:"6px"}}>Найдено: {filtered.length} из {liveBoats.length}</div>
      </div>

      {/* ── Boat list ── */}
      <div style={{overflowY:"auto",flex:1,padding:"12px 14px"}}>
        {filtered.length===0 && (
          <div style={{textAlign:"center",padding:"60px 20px",color:t.muted}}>
            <div style={{fontSize:"36px",marginBottom:"10px"}}>🚢</div>
            <div>Ничего не найдено. Измените фильтры.</div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"10px"}}>
          {filtered.map(boat=>{
            const m = BOAT_TYPE_META[boat.type]||{label:boat.type,color:"#888",border:"#444",bg:"#111"}
            const isOpen = openId===boat.id
            const prices = boat.tours.map(tt=>tt.price).filter((p):p is number=>typeof p==="number")
            const minPrice = prices.length ? Math.min(...prices) : null
            const isPinned = pinnedBoats.includes(boat.id)
            return (
              <div key={boat.id} style={{background:t.card,borderRadius:"14px",border:`1.5px solid ${isOpen||isPinned?m.color:m.border}`,overflow:"hidden",transition:"border-color 0.2s",boxShadow:isPinned?`0 0 0 2px ${m.color}33`:"none"}}>

                {/* Pinned strip */}
                {isPinned && (
                  <div style={{background:m.color,padding:"2px 10px",fontSize:"10px",fontWeight:800,color:"#000",letterSpacing:"0.8px"}}>
                    ⭐ ЗАКРЕПЛЕНО
                  </div>
                )}

                <div onClick={()=>setOpenId(isOpen?null:boat.id)} style={{cursor:"pointer",userSelect:"none"}}>
                  <div style={{background:m.bg,borderBottom:`1px solid ${m.border}`,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:"16px",fontWeight:800,color:m.color,letterSpacing:"-0.3px"}}>
                          {boat.name}
                          <span style={{fontSize:"12px",fontWeight:400,color:m.color,opacity:0.7,marginLeft:"7px"}}>{boat.size}</span>
                        </div>
                        <div style={{fontSize:"11px",color:m.color,opacity:0.65,marginTop:"2px"}}>📍 {boat.pier}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px"}}>
                        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                          <button onClick={e=>{e.stopPropagation();togglePin(boat.id)}}
                            title={isPinned?"Открепить":"Закрепить наверху"}
                            style={{background:"none",border:"none",cursor:"pointer",fontSize:"16px",lineHeight:1,padding:"0",opacity:isPinned?1:0.3,transition:"opacity 0.2s"}}>
                            ⭐
                          </button>
                          <span style={{background:`${m.color}22`,color:m.color,border:`1px solid ${m.border}`,borderRadius:"99px",padding:"2px 9px",fontSize:"11px",fontWeight:700}}>{m.label}</span>
                        </div>
                        <span style={{fontSize:"11px",color:m.color,opacity:0.7}}>👥 макс. {boat.maxPax} чел.</span>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      {minPrice && (
                        <span
                          onClick={e=>{e.stopPropagation();copyPrice(minPrice,`${boat.name}:min`)}}
                          title="Тап — скопировать цену"
                          style={{fontSize:"14px",fontWeight:700,color:copiedPrice===`${boat.name}:min`?"#4ade80":m.color,cursor:"pointer",transition:"color 0.2s"}}>
                          {copiedPrice===`${boat.name}:min`?"✅ скопировано":`от ${minPrice.toLocaleString("ru-RU")} ฿`}
                        </span>
                      )}
                      <span style={{fontSize:"11px",color:t.muted}}>{boat.tours.length} {boat.tours.length===1?"маршрут":boat.tours.length<5?"маршрута":"маршрутов"}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      {BOATS_DRIVE_LINKS[boat.name] && (
                        <a href={BOATS_DRIVE_LINKS[boat.name]} target="_blank" rel="noreferrer"
                          onClick={e=>e.stopPropagation()}
                          style={{fontSize:"10px",color:t.accent,background:`${t.accent}18`,padding:"2px 7px",borderRadius:"6px",border:`1px solid ${t.accent}44`,textDecoration:"none",fontWeight:700}}>
                          📁 Фото
                        </a>
                      )}
                      <span style={{fontSize:"13px",color:m.color,transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0)"}}>▾</span>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div style={{borderTop:`1px solid ${m.border}`,padding:"12px 14px",background:dark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.02)"}}>
                    {boat.note && (
                      <div style={{background:dark?"#2d1f00":"#fffbeb",border:"1px solid #d97706",borderRadius:"8px",padding:"8px 11px",fontSize:"11px",color:dark?"#fde68a":"#92400e",marginBottom:"10px",lineHeight:1.5}}>
                        ℹ️ {boat.note}
                      </div>
                    )}
                    <div style={{borderRadius:"8px",overflow:"hidden",border:`1px solid ${m.border}`}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",background:m.bg,padding:"6px 10px",gap:"8px"}}>
                        {["Маршрут","Цена","Экстра/чел","Вкл. чел"].map(h=>(
                          <div key={h} style={{fontSize:"10px",fontWeight:700,color:m.color,textAlign:h==="Маршрут"?"left":"right",textTransform:"uppercase" as any,letterSpacing:"0.5px"}}>{h}</div>
                        ))}
                      </div>
                      {boat.tours.map((tour,i)=>(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",padding:"7px 10px",gap:"8px",alignItems:"center",background:i%2===0?t.row0:t.row1,borderTop:i===0?"none":`1px solid ${dark?"rgba(255,255,255,0.05)":"#f0f0f0"}`}}>
                          <div style={{fontSize:"12px",color:t.text,lineHeight:1.4}}>{tour.name}</div>
                          <div
                            onClick={e=>{e.stopPropagation();copyPrice(tour.price,`${boat.name}:${i}`)}}
                            title="Тап — скопировать цену"
                            style={{fontSize:"13px",fontWeight:700,color:copiedPrice===`${boat.name}:${i}`?"#4ade80":m.color,textAlign:"right" as any,whiteSpace:"nowrap",cursor:"pointer",transition:"color 0.2s"}}>
                            {copiedPrice===`${boat.name}:${i}`?"✅ скопировано":fmtPrice(tour.price)}
                          </div>
                          <div style={{fontSize:"11px",color:t.muted,textAlign:"right" as any,whiteSpace:"nowrap"}}>
                            {tour.extra===null?"—":typeof tour.extra==="number"?`${tour.extra.toLocaleString("ru-RU")} ฿`:String(tour.extra)}
                          </div>
                          <div style={{fontSize:"11px",color:t.muted,textAlign:"right" as any,whiteSpace:"nowrap"}}>{tour.paxIncl||"—"}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={e=>{e.stopPropagation();setWaModal({title:boat.name,short:buildBoatWAShort(boat),full:buildBoatWAFull(boat)})}}
                      style={{marginTop:"8px",width:"100%",background:"#25d366",color:"#fff",border:"none",borderRadius:"8px",padding:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                      <span>📤</span> Отправить в WhatsApp
                    </button>
                    <button onClick={e=>{e.stopPropagation();setCalcBoatId(boat.id);setCalcTour(0);setCalcPax(2);setCalcGuide(false);setCalcMeal("none");setCalcPool(false);setCalcSlide(false);setCalcSeafood(false);setCalcBBQ(false);setCalcFishing(false);setCalcCanoe(false);setCalcOpen(true)}}
                      style={{marginTop:"6px",width:"100%",padding:"8px",borderRadius:"8px",border:"none",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>
                      🧮 Калькулятор
                    </button>
                    <button onClick={()=>setOpenId(null)}
                      style={{marginTop:"6px",width:"100%",background:"transparent",border:`1px solid ${m.border}`,borderRadius:"8px",padding:"7px",fontSize:"12px",color:m.color,cursor:"pointer",fontWeight:600}}>
                      Свернуть ▲
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Calculator Modal ── */}
      {calcOpen && (()=>{
        const boat = liveBoats.find(b=>b.id===calcBoatId)
        const tour = boat ? boat.tours[calcTour] : null
        const m = boat ? (BOAT_TYPE_META[boat.type]||BOAT_TYPE_META["speedboat"]) : null
        const note:string = (boat as any)?.note||""
        const hasGuide   = true
        const hasMeal    = note.includes("не включ") || note.includes("640") || note.includes("500")
        const hasPool    = note.includes("Бассейн") || note.includes("бассейн")
        const hasSlide   = note.includes("горка")
        const hasSeafood = note.includes("seafood") || note.includes("Seafood") || note.includes("650")
        const hasBBQ     = note.includes("BBQ")
        const hasFishing = note.includes("удочки") || note.includes("Удочки")
        const hasCanoe   = note.includes("каноэ") || note.includes("Каноэ")
        const mealPrice:{[k:string]:number}={none:0,A:640,B:780,C:920}

        const rows:{label:string;amount:number}[]=[]
        let total=0

        if(boat&&tour){
          const extra=tour.extra
          const inclStr=String(tour.paxIncl||"")
          const inclMax=parseInt(inclStr.split("–")[1]||inclStr.replace(/\D/g,""))||2
          rows.push({label:`🚢 База (вкл. ${tour.paxIncl} чел.)`,amount:tour.price as number})
          total+=tour.price as number
          if(calcPax>inclMax&&extra!==null&&typeof extra==="number"){
            const ep=calcPax-inclMax; const et=ep*extra
            rows.push({label:`👤 Доп. ${ep} чел × ${extra.toLocaleString("ru-RU")} ฿`,amount:et})
            total+=et
          } else if(calcPax>inclMax&&extra!==null&&typeof extra==="string"){
            rows.push({label:`⚠️ Доп. тариф: ${extra}`,amount:0})
          }
        }
        if(calcGuide){rows.push({label:"🇷🇺 Рус. гид",amount:3500});total+=3500}
        if(calcMeal!=="none"&&hasMeal){const mp=mealPrice[calcMeal]*calcPax;rows.push({label:`🍽️ Питание кат.${calcMeal} ×${calcPax}`,amount:mp});total+=mp}
        if(calcPool&&hasPool){const pp=note.includes("4500")?4500:3500;rows.push({label:"🏊 Бассейн",amount:pp});total+=pp}
        if(calcSlide&&hasSlide){const sp=note.includes("3600")?3600:3500;rows.push({label:"🎢 Горка",amount:sp});total+=sp}
        if(calcSeafood&&hasSeafood){const sf=650*calcPax;rows.push({label:`🦐 Морепродукты ×${calcPax}`,amount:sf});total+=sf}
        if(calcBBQ&&hasBBQ){rows.push({label:"🍗 BBQ",amount:1500});total+=1500}
        if(calcFishing&&hasFishing){rows.push({label:"🎣 Удочки",amount:1000});total+=1000}
        if(calcCanoe&&hasCanoe){const cn=500*calcPax;rows.push({label:`🛶 Каноэ ×${calcPax}`,amount:cn});total+=cn}

        function CBox({checked,onChange,label,price,avail}:{checked:boolean;onChange:(v:boolean)=>void;label:string;price:string;avail:boolean}){
          if(!avail)return null
          return(
            <label style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",borderRadius:"8px",cursor:"pointer",border:`1px solid ${checked?(m?.border||t.cardBorder):t.cardBorder}`,background:checked?(m?.bg||t.header):t.header,marginBottom:"6px",transition:"all 0.15s"}}>
              <div style={{width:"18px",height:"18px",borderRadius:"6px",border:`2px solid ${checked?(m?.color||t.accent):t.muted}`,background:checked?(m?.color||t.accent):"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={()=>onChange(!checked)}>
                {checked&&<span style={{color:"#fff",fontSize:"11px",fontWeight:900}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:"12px",color:t.text,fontWeight:500}}>{label}</span>
              <span style={{fontSize:"11px",color:m?.color||t.accent,fontWeight:700,flexShrink:0}}>{price}</span>
            </label>
          )
        }

        return(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"12px"}} onClick={()=>setCalcOpen(false)}>
            <div style={{background:t.card,border:`1.5px solid ${t.cardBorder}`,borderRadius:"20px",width:"100%",maxWidth:"420px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",display:"flex",flexDirection:"column",maxHeight:"92vh"}} onClick={(e:React.MouseEvent)=>e.stopPropagation()}>
              <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${t.cardBorder}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:"16px",fontWeight:800,color:t.text}}>🧮 Калькулятор лодки</div>
                  <div style={{fontSize:"10px",color:t.muted,marginTop:"1px"}}>Лодки и яхты · сезон 2025–2026</div>
                </div>
                <button onClick={()=>setCalcOpen(false)} style={{background:t.cardBorder,border:"none",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"14px",color:t.text,flexShrink:0}}>✕</button>
              </div>
              <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}>
                <div style={{marginBottom:"12px"}}>
                  <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"5px"}}>Лодка</div>
                  <select value={String(calcBoatId)} onChange={e=>{setCalcBoatId(Number(e.target.value));setCalcTour(0);setCalcPool(false);setCalcSlide(false);setCalcSeafood(false);setCalcBBQ(false);setCalcFishing(false);setCalcCanoe(false);setCalcMeal("none")}} style={inputSt}>
                    <option value="">— Выберите лодку —</option>
                    {[...liveBoats].sort((a,b2)=>a.name.localeCompare(b2.name)).map(b=>(
                      <option key={b.id} value={b.id}>{b.name} ({b.size}) · {BOAT_TYPE_META[b.type]?.label||b.type}</option>
                    ))}
                  </select>
                </div>
                {boat&&(
                  <div style={{marginBottom:"12px"}}>
                    <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"5px"}}>Маршрут</div>
                    <select value={calcTour} onChange={e=>setCalcTour(Number(e.target.value))} style={inputSt}>
                      {boat.tours.map((tt,i)=>(
                        <option key={i} value={i}>{tt.name} — {fmtPrice(tt.price)}</option>
                      ))}
                    </select>
                  </div>
                )}
                {boat&&(
                  <div style={{marginBottom:"16px"}}>
                    <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"5px"}}>
                      Количество человек: <span style={{color:m?.color||t.accent,fontSize:"13px"}}>{calcPax}</span> <span style={{fontWeight:400}}>/ макс. {boat.maxPax}</span>
                    </div>
                    <div onTouchStart={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}><input type="range" min={1} max={boat.maxPax} value={calcPax} onChange={e=>setCalcPax(Number(e.target.value))} style={{width:"100%",accentColor:m?.color||"#38bdf8",cursor:"pointer"}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:t.muted,marginTop:"1px"}}>
                      <span>1</span><span>{boat.maxPax}</span>
                    </div>
                  </div>
                )}
                {boat&&tour&&(
                  <div style={{marginBottom:"16px"}}>
                    <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"8px"}}>Доп. услуги</div>
                    <CBox checked={calcGuide} onChange={setCalcGuide} label="🇷🇺 Русскоговорящий гид" price="+3 500 ฿" avail={hasGuide}/>
                    <CBox checked={calcPool}  onChange={setCalcPool}  label="🏊 Бассейн на борту" price={note.includes("4500")?"+4 500 ฿":"+3 500 ฿"} avail={hasPool}/>
                    <CBox checked={calcSlide} onChange={setCalcSlide} label="🎢 Горка" price={note.includes("3600")?"+3 600 ฿":"+3 500 ฿"} avail={hasSlide}/>
                    <CBox checked={calcSeafood} onChange={setCalcSeafood} label={`🦐 Морепродукты ×${calcPax}`} price={`+${(650*calcPax).toLocaleString("ru-RU")} ฿`} avail={hasSeafood}/>
                    <CBox checked={calcBBQ}     onChange={setCalcBBQ}     label="🍗 BBQ" price="+1 500 ฿" avail={hasBBQ}/>
                    <CBox checked={calcFishing}  onChange={setCalcFishing}  label="🎣 Удочки" price="+1 000 ฿" avail={hasFishing}/>
                    <CBox checked={calcCanoe}    onChange={setCalcCanoe}    label={`🛶 Каноэ ×${calcPax}`} price={`+${(500*calcPax).toLocaleString("ru-RU")} ฿`} avail={hasCanoe}/>
                    {hasMeal&&(
                      <div style={{marginTop:"8px"}}>
                        <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"6px"}}>🍽️ Питание (на {calcPax} чел.)</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px"}}>
                          {(["none","A","B","C"] as const).map(cat=>{
                            const lbs:{[k:string]:string}={none:"Нет",A:`A\n${640*calcPax}฿`,B:`B\n${780*calcPax}฿`,C:`C\n${920*calcPax}฿`}
                            const active=calcMeal===cat
                            return(
                              <button key={cat} onClick={()=>setCalcMeal(cat)}
                                style={{padding:"8px 4px",borderRadius:"8px",border:`1.5px solid ${active?(m?.color||t.accent):t.cardBorder}`,background:active?(m?.bg||t.header):t.header,color:active?(m?.color||t.accent):t.muted,fontSize:"10px",fontWeight:700,cursor:"pointer",lineHeight:1.4,whiteSpace:"pre-wrap" as any,textAlign:"center" as any}}>
                                {lbs[cat]}
                              </button>
                            )
                          })}
                        </div>
                        <div style={{fontSize:"10px",color:t.muted,marginTop:"4px"}}>A=640 · B=780 · C=920 ฿/чел</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {boat&&tour?(
                <div style={{borderTop:`1.5px solid ${m?.border||t.cardBorder}`,background:m?m.bg:t.header,padding:"14px 20px",flexShrink:0,borderRadius:"0 0 18px 18px"}}>
                  {rows.map((row,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:t.text,marginBottom:"3px",opacity:0.8}}>
                      <span>{row.label}</span>
                      <span style={{fontWeight:600,flexShrink:0,marginLeft:"8px"}}>{row.amount>0?row.amount.toLocaleString("ru-RU")+" ฿":"—"}</span>
                    </div>
                  ))}
                  <div style={{borderTop:`1px solid ${m?.border||t.cardBorder}`,marginTop:"10px",paddingTop:"10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:"10px",color:t.muted}}>ИТОГО за {calcPax} чел.</div>
                      <div style={{fontSize:"26px",fontWeight:900,color:m?.color||t.accent,letterSpacing:"-0.5px"}}>{total.toLocaleString("ru-RU")} ฿</div>
                    </div>
                    <div style={{textAlign:"right" as any}}>
                      <div style={{fontSize:"10px",color:t.muted}}>НА ЧЕЛОВЕКА</div>
                      <div style={{fontSize:"20px",fontWeight:800,color:m?.color||t.accent}}>{Math.round(total/calcPax).toLocaleString("ru-RU")} ฿</div>
                    </div>
                  </div>
                </div>
              ):(
                <div style={{padding:"20px",textAlign:"center" as any,color:t.muted,fontSize:"13px",borderTop:`1px solid ${t.cardBorder}`}}>
                  👆 Выберите лодку и маршрут
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* WA Modal */}
      {waModal && <WAShareModal dark={dark} title={waModal.title} shortText={waModal.short} fullText={waModal.full} onClose={() => setWaModal(null)}/>}
      {aiOpen && <AIUpdatePanel dark={dark} mode="boats" onUpdate={handleAIUpdate} onClose={() => setAiOpen(false)}/>}
    </div>
  )
}

// ═══════════════════════════════════════════
// BOAT SUMMER UPDATE 1.05.26 — ДАННЫЕ И КОМПОНЕНТ
// ═══════════════════════════════════════════

const BOATS_SUMMER_DATA = [
  { id:"bs1", name:"Bowie 1", size:"46ft", pier:"Royal Phuket Marina", type:"speedboat", maxPax:25,
    drive:"https://drive.google.com/drive/folders/1DMstt7CMkXog7yp0LCpvxedzSuNXblrG",
    tours:[
      {name:"Phi Phi + Bamboo",price:45000,extra:1500,incl:"1–2"},
      {name:"James Bond + Naka Island",price:45000,extra:1500,incl:"1–2"},
      {name:"Phi Phi Overnight",price:67900,extra:4000,incl:"1–2"},
      {name:"Krabi",price:42150,extra:1500,incl:"1–2"},
      {name:"Phi Phi + Krabi",price:55000,extra:2500,incl:"1–2"},
      {name:"James Bond + Krabi",price:53600,extra:2500,incl:"1–2"},
      {name:"James Bond + Phi Phi",price:59300,extra:2500,incl:"1–2"},
      {name:"James Bond + Krabi + Phi Phi",price:63600,extra:2500,incl:"1–2"},
      {name:"Andaman Treasure 2/1",price:86500,extra:4600,incl:"1–2"},
    ]},
  { id:"bs2", name:"Bowie 2", size:"36ft", pier:"Royal Phuket Marina", type:"speedboat", maxPax:20,
    drive:"https://drive.google.com/drive/folders/1soiMLhTVqupUqYL7TuE1Ln7RERkiw5XV",
    tours:[
      {name:"Phi Phi + Bamboo",price:45000,extra:1500,incl:"1–2"},
      {name:"James Bond + Naka Island",price:45000,extra:1500,incl:"1–2"},
      {name:"Phi Phi Overnight",price:67900,extra:4000,incl:"1–2"},
      {name:"Krabi",price:42150,extra:1500,incl:"1–2"},
      {name:"Phi Phi + Krabi",price:55000,extra:2500,incl:"1–2"},
      {name:"James Bond + Krabi",price:53600,extra:2500,incl:"1–2"},
      {name:"James Bond + Phi Phi",price:59300,extra:2500,incl:"1–2"},
      {name:"James Bond + Krabi + Phi Phi",price:63600,extra:2500,incl:"1–2"},
      {name:"Andaman Treasure 2/1",price:86500,extra:4600,incl:"1–2"},
    ]},
  { id:"bs3", name:"Sofia", size:"45ft", pier:"Bang Rong Pier", type:"speedboat", maxPax:20, tours:[
    {name:"Phi Phi + Bamboo",price:42300,extra:1500,incl:"1–2"},
    {name:"James Bond + Naka Island",price:43300,extra:1500,incl:"1–2"},
    {name:"Krabi",price:42300,extra:1500,incl:"1–2"},
    {name:"Phi Phi + Krabi",price:54800,extra:2500,incl:"1–2"},
    {name:"James Bond + Krabi",price:54800,extra:2500,incl:"1–2"},
    {name:"James Bond + Phi Phi",price:54800,extra:2500,incl:"1–2"},
    {name:"James Bond + Krabi + Phi Phi",price:66450,extra:2500,incl:"1–2"},
  ]},
  { id:"bs4", name:"Thaimarine", size:"47ft", pier:"Royal Phuket Marina", type:"speedboat", maxPax:20,
    drive:"https://drive.google.com/drive/folders/1jEEnwwBajxtSO5I0vGUfdXlolOtgcY3q",
    tours:[
      {name:"Phi Phi + Bamboo",price:72400,extra:1500,incl:"1–2"},
      {name:"James Bond + Naka Island",price:64900,extra:1500,incl:"1–2"},
      {name:"Phi Phi + Krabi",price:76900,extra:2500,incl:"1–2"},
      {name:"James Bond + Krabi",price:82800,extra:2500,incl:"1–2"},
      {name:"James Bond + Phi Phi",price:82800,extra:2500,incl:"1–2"},
    ]},
  { id:"bs5", name:"Gambit", size:"36ft", pier:"Chalong Pier", type:"speedboat", maxPax:10,
    drive:"https://drive.google.com/drive/folders/1NN6M-ea9pDlKgz51s_WP-UkcvQutt3OC",
    tours:[{name:"Phi Phi + Bamboo",price:38000,extra:1500,incl:"1–2"}]},
  { id:"bs6", name:"Yamela", size:"40ft", pier:"Chalong Pier", type:"speedboat", maxPax:15,
    drive:"https://drive.google.com/drive/folders/1iTg81mXUhcR_j36oqNas69a30tQEmQHU",
    tours:[{name:"Phi Phi + Bamboo",price:38000,extra:1500,incl:"1–2"}]},
  { id:"bs7", name:"Verona", size:"46ft", pier:"Taplamu Pier", type:"speedboat", maxPax:30,
    drive:"https://drive.google.com/drive/folders/1c0AMe86EWdQU0HLwDOoLAk7P4kuI2oq4",
    tours:[
      {name:"Similan Islands",price:68500,extra:1500,incl:"1–2"},
      {name:"Surin Islands",price:80000,extra:2500,incl:"1–2"},
    ]},
  { id:"bs8", name:"Romeo", size:"46ft", pier:"Taplamu Pier", type:"speedboat", maxPax:30,
    drive:"https://drive.google.com/drive/folders/1qs-REzkEGfGWyfIJXGj66OfssaFxFUAn",
    tours:[
      {name:"Similan Islands",price:68500,extra:1500,incl:"1–2"},
      {name:"Surin Islands",price:80000,extra:2500,incl:"1–2"},
    ]},
  { id:"bs9", name:"Lexi", size:"45ft", pier:"Royal Phuket Marina", type:"speedboat", maxPax:30,
    drive:"https://drive.google.com/drive/folders/1XBSdmfPFk1LXadlJ4qAIU0QsdczFGUOj",
    tours:[
      {name:"Phi Phi + Bamboo",price:49300,extra:1600,incl:"1–2"},
      {name:"James Bond + Naka Island",price:47900,extra:1600,incl:"1–2"},
      {name:"Phi Phi + Krabi",price:62150,extra:2500,incl:"1–2"},
      {name:"James Bond + Krabi",price:77150,extra:2500,incl:"1–2"},
      {name:"James Bond + Phi Phi",price:77150,extra:2500,incl:"1–2"},
      {name:"Similan (RPM)",price:96400,extra:1700,incl:"1–2"},
      {name:"Similan (Taplamu)",price:68600,extra:2150,incl:"1–2"},
      {name:"Surin Islands",price:80000,extra:2500,incl:"1–2"},
      {name:"Koh Rok Ko Ha",price:97000,extra:1800,incl:"1–2"},
    ]},
  { id:"bs10", name:"Randezvous", size:"44ft", pier:"Chalong Pier", type:"catamaran", maxPax:10,
    note:"Обед включён. Seafood +650฿/чел, рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/1ILUqV3U8VJq-gA3cBEIczFy86qArFSD-",
    tours:[
      {name:"Maithon + Racha Yai",price:50000,extra:null,incl:"10 PAX"},
      {name:"Racha Yai Fishing",price:50000,extra:null,incl:"10 PAX"},
      {name:"Phi Phi",price:56800,extra:800,incl:"1–2"},
      {name:"Phi Phi Bamboo",price:64800,extra:800,incl:"1–2"},
      {name:"Krabi-Koh Hong",price:64800,extra:800,incl:"1–2"},
    ]},
  { id:"bs11", name:"Zoe", size:"46ft", pier:"Chalong Pier", type:"sailboat", maxPax:15,
    note:"Обед (seafood) включён. >11 чел +3500฿ доп. вэн. Бассейн/горка/рус. гид — доп.",
    drive:"https://drive.google.com/drive/folders/1PUVoPqbYKkYnZqjMiN5zyVypphtNZj3h",
    tours:[
      {name:"Racha Yai + Coral",price:40000,extra:1500,incl:"1–2"},
      {name:"Racha Noi",price:46500,extra:1500,incl:"1–2"},
    ]},
  { id:"bs12", name:"Sunny", size:"38ft", pier:"Chalong Pier", type:"sailboat", maxPax:10,
    note:"Обед (seafood) включён. Бассейн/горка/рус. гид — доп.",
    drive:"https://drive.google.com/drive/folders/1jfPZgXfTy58EfSvG3wR7znvR8lCalzHX",
    tours:[
      {name:"Racha Yai + Coral",price:37500,extra:1500,incl:"1–2"},
      {name:"Racha Noi",price:44500,extra:1500,incl:"1–2"},
    ]},
  { id:"bs13", name:"Oceanland", size:"45ft", pier:"Chalong Pier", type:"sailboat", maxPax:20,
    note:"Обед (seafood) включён. >11 чел +3500฿ доп. вэн.",
    drive:"https://drive.google.com/drive/folders/1--7mTJnU-FfdGaPT8BdIcGBc1QlBgmr3",
    tours:[
      {name:"Racha Yai + Coral",price:51500,extra:1500,incl:"1–2"},
      {name:"Racha Noi",price:57500,extra:1500,incl:"1–2"},
    ]},
  { id:"bs14", name:"Pepper", size:"47ft", pier:"Chalong Pier", type:"sailboat", maxPax:30,
    note:"Обед НЕ включён (оплач. отдельно). База 1–15 чел. >11 чел +3500฿ доп. вэн.",
    drive:"https://drive.google.com/drive/folders/1O9usPG_S7xSzonv2xDHhh4h57cyjj5PC",
    tours:[
      {name:"Racha Yai + Coral",price:44000,extra:"1500+обед",incl:"1–15"},
      {name:"Maithon + Coral",price:44000,extra:"1500+обед",incl:"1–15"},
      {name:"Coral + Promthep",price:44000,extra:"1500+обед",incl:"1–15"},
    ]},
  { id:"bs15", name:"Senna", size:"47ft", pier:"Chalong Pier", type:"sailboat", maxPax:30,
    note:"Обед НЕ включён. >11 чел +3500฿ доп. вэн.",
    drive:"https://drive.google.com/drive/folders/1dhoafTN76LDlEcXhXxG_O2ZR4alXh3Lu",
    tours:[
      {name:"Racha Yai + Coral",price:44000,extra:"1500+обед",incl:"1–15"},
      {name:"Maithon + Coral",price:44000,extra:"1500+обед",incl:"1–15"},
      {name:"Coral + Promthep",price:44000,extra:"1500+обед",incl:"1–15"},
    ]},
  { id:"bs16", name:"Summer", size:"47ft", pier:"Nakalay Pier (Kalim)", type:"sailboat", maxPax:15,
    note:"Обед включён. >11 чел +3500฿ доп. вэн. Рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/1PCh6daqP_fB7o7HV2Vgpj4w1ANnhQnzE",
    tours:[
      {name:"North (Rock Cliff + Kamala + Laem Sing + Surin + Koh Waew + Banana Beach)",price:65500,extra:900,incl:"1–6"},
      {name:"South (Patong + Freedom Beach + Laem Krating + Promthep Cape)",price:65500,extra:900,incl:"1–6"},
    ]},
  { id:"bs17", name:"Coco", size:"40ft", pier:"Chalong Pier", type:"catamaran", maxPax:20,
    note:"Обед НЕ включён. >11 чел +3500฿ доп. вэн.",
    drive:"https://drive.google.com/drive/folders/1YJ3hrUBHgZs1uB_WfzfUZ4wJwP2pczUM",
    tours:[
      {name:"Racha Yai + Coral",price:44000,extra:"1500+обед",incl:"1–15"},
      {name:"Maithon + Coral",price:44000,extra:"1500+обед",incl:"1–15"},
      {name:"Coral + Promthep",price:44000,extra:"1500+обед",incl:"1–15"},
    ]},
  { id:"bs18", name:"Tahaa", size:"42ft", pier:"Chalong Pier", type:"catamaran", maxPax:30,
    note:"Обед НЕ включён. >11 чел +3500฿ доп. вэн.",
    drive:"https://drive.google.com/drive/folders/1yKSJmaghsTTzabRivmWpVZrwekFsLFDm",
    tours:[
      {name:"Racha Yai + Coral",price:44000,extra:"1500+обед",incl:"1–15"},
      {name:"Maithon + Coral",price:44000,extra:"1500+обед",incl:"1–15"},
      {name:"Coral + Promthep",price:44000,extra:"1500+обед",incl:"1–15"},
    ]},
  { id:"bs19", name:"Myra", size:"47ft", pier:"Ao Po", type:"sailboat", maxPax:15,
    note:"Обед — доп. (сет 6 чел: A-4800/B-5500/C-6500฿). Нац. парк и каноэ — доп.",
    drive:"https://drive.google.com/drive/folders/1T4Vn3ub7ohqk3qI46phscLA8yW-SZl_j",
    tours:[
      {name:"Phang Nga Bay (Panak+Hong+Bond)",price:59600,extra:null,incl:"1–15"},
      {name:"Khai Island + Naka Island",price:59600,extra:null,incl:"1–15"},
      {name:"Hong-Krabi (Hong+Lao Lading+Lao Ka+Pakbia+Rai)",price:71000,extra:null,incl:"1–15"},
    ]},
  { id:"bs20", name:"Ocean Dream", size:"40ft", pier:"Chalong Pier", type:"sailboat", maxPax:15,
    note:"Обед (seafood) включён. >11 чел +3500฿ доп. вэн. Бассейн +4500฿, горка +3600฿, рус. гид +3500฿",
    drive:"https://drive.google.com/drive/u/0/folders/1dIqceqeU4jpv0_8Jb722pxOrV2sW63Z",
    tours:[
      {name:"Racha Yai + Coral (9:00–16:00)",price:38000,extra:2500,incl:"1–6"},
      {name:"Khai Island (9:00–18:00)",price:45000,extra:2500,incl:"1–6"},
      {name:"Racha Yai + Coral + Sunset (10:30–19:00)",price:42000,extra:2500,incl:"1–6"},
    ]},
  { id:"bs21", name:"Ameray", size:"37ft", pier:"Chalong Pier", type:"sailboat", maxPax:15,
    note:"Обед (seafood) включён. >11 чел +3500฿ доп. вэн. Бассейн +4500฿, горка +3600฿, рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/1RvMJgxFDf-2QWPqX2eGoqwC99VDGXF1w",
    tours:[
      {name:"Racha Yai + Coral (9:00–16:00)",price:38000,extra:2500,incl:"1–6"},
      {name:"Khai Island (9:00–18:00)",price:45000,extra:2500,incl:"1–6"},
      {name:"Racha Yai + Coral + Sunset (10:30–19:00)",price:42000,extra:2500,incl:"1–6"},
    ]},
  { id:"bs22", name:"Wildcat", size:"44ft", pier:"Chalong Pier", type:"catamaran", maxPax:15,
    note:"Обед (seafood) включён. >11 чел +3500฿ доп. вэн. Бассейн +4500฿, горка +3600฿, рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/1FzZp3QV2x8wWhQY23bDmJTEMvKRIajqC",
    tours:[
      {name:"Racha Yai + Coral (9:00–16:00)",price:38000,extra:2500,incl:"1–6"},
      {name:"Khai Island (9:00–18:00)",price:45000,extra:2500,incl:"1–6"},
      {name:"Racha Yai + Coral + Sunset (10:30–19:00)",price:42000,extra:2500,incl:"1–6"},
    ]},
  { id:"bs23", name:"White Corn", size:"38ft", pier:"Chalong Pier", type:"sailboat", maxPax:15,
    note:"Обед BBQ + Seafood включён. >11 чел +3500฿ доп. вэн. Рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/1-_WwAhjkyJACcXK0uW9dF5K7pUugVD7H",
    tours:[{name:"Racha Yai + Coral",price:40000,extra:1500,incl:"1–5"}]},
  { id:"bs24", name:"Black Pearl", size:"40ft", pier:"Chalong Pier", type:"sailboat", maxPax:15,
    note:"Обед BBQ + Seafood включён. >11 чел +3500฿ доп. вэн. Рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/1-MNse3i6r3OHoxtR2gukV5lKWQFBkU2j",
    tours:[{name:"Racha Yai + Coral",price:40000,extra:1500,incl:"1–5"}]},
  { id:"bs25", name:"Ella", size:"53ft", pier:"Chalong Pier", type:"catamaran", maxPax:20,
    note:"Обед +500฿/чел доп. >11 чел +3500฿ доп. вэн. Бассейн 3500฿, горка 3600฿, удочки 1000฿, BBQ 1500฿, рус. гид +3500฿. Выше цена 20/12–01/03.",
    drive:"https://drive.google.com/drive/folders/1GaJbjLCzLO7clwYJNC6Ewiw1JWjeNHij",
    tours:[
      {name:"Racha Yai + Coral",price:42000,extra:"1500+обед",incl:"1–10"},
      {name:"Racha + Coral + Promthep",price:44000,extra:"1500+обед",incl:"1–10"},
    ]},
  { id:"bs26", name:"Calypso", size:"44ft", pier:"Chalong Pier", type:"catamaran", maxPax:20,
    note:"Обед +500฿/чел доп. >11 чел +3500฿ доп. вэн. Бассейн 3500฿, горка 3600฿. Выше цена 20/12–01/03.",
    drive:"https://drive.google.com/drive/folders/1ow1u3IqmpJ0H-U-HDsCo46JZgg48-s0j",
    tours:[
      {name:"Racha Yai + Coral",price:44500,extra:"1500+обед",incl:"1–10"},
      {name:"Racha + Coral + Promthep",price:56500,extra:"1500+обед",incl:"1–10"},
    ]},
  { id:"bs27", name:"Bohemian", size:"50ft", pier:"Chalong Pier", type:"catamaran", maxPax:25,
    note:"Обед +500฿/чел доп. >11 чел +3500฿ доп. вэн. Выше цена 20/12–01/03.",
    drive:"https://drive.google.com/drive/folders/1Oo4-GftlfLBhgKGygQCRSFgrC0giEb2B",
    tours:[
      {name:"Racha Yai + Coral",price:42000,extra:"1500+обед",incl:"1–10"},
      {name:"Racha + Coral + Promthep",price:44000,extra:"1500+обед",incl:"1–10"},
    ]},
  { id:"bs28", name:"F1", size:"42ft", pier:"Chalong Pier", type:"powercat", maxPax:15,
    note:"Обед включён. >11 чел +3500฿ доп. вэн. Бассейн 3500฿, горка 3600฿, рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/17JVhaqA7fg5OgtWL5BpQQgudR9aonYbX",
    tours:[
      {name:"Racha Yai + Coral",price:54450,extra:1900,incl:"1–8"},
      {name:"Racha + Racha Yai",price:58100,extra:1900,incl:"1–8"},
      {name:"Phi Phi Island (No Bamboo)",price:59260,extra:"1000 (до 8 чел) / 2800 (>8)",incl:"1–2"},
      {name:"James Bond + Koh Khai Nok",price:67800,extra:"1500 (до 8 чел) / 3300 (>8)",incl:"1–2"},
    ]},
  { id:"bs29", name:"Whiskey", size:"48ft", pier:"Chalong Pier", type:"powercat", maxPax:20,
    note:"Бассейн и горка включены. Обед включён. Удочки бесплатно по запросу. >11 чел +3500฿ доп. вэн.",
    drive:"https://drive.google.com/drive/folders/1GcrhgI2zst9ZIXddiFu4QbltigqChkLo",
    tours:[{name:"Racha Yai + Coral",price:54600,extra:1500,incl:"1–10"}]},
  { id:"bs30", name:"Tequila", size:"37ft", pier:"Chalong Pier", type:"speedboat", maxPax:10,
    note:"Бассейн и горка включены. Обед включён. Удочки бесплатно по запросу.",
    drive:"https://drive.google.com/drive/folders/1Qj56ehlML7DrSU7NArhed0gFszIXZCxn",
    tours:[
      {name:"Racha Yai + Coral",price:57150,extra:null,incl:"1–10"},
      {name:"Racha + Racha Noi",price:62900,extra:null,incl:"1–10"},
      {name:"Phi Phi Island + Bamboo",price:66900,extra:1000,incl:"1–2"},
    ]},
  { id:"bs31", name:"Vodka", size:"46ft", pier:"Chalong Pier", type:"speedboat", maxPax:10,
    note:"Бассейн и горка включены. Обед включён. Удочки бесплатно по запросу.",
    drive:"https://drive.google.com/drive/folders/1a6gwWKdpaI1k6IvddudzA4MLJmFKETWz",
    tours:[
      {name:"Racha Yai + Coral",price:65710,extra:null,incl:"1–10"},
      {name:"Racha + Racha Noi",price:80000,extra:null,incl:"1–10"},
      {name:"Phi Phi Island + Bamboo",price:88300,extra:1000,incl:"1–2"},
    ]},
  { id:"bs32", name:"Origin", size:"90ft", pier:"Chalong Pier", type:"yacht", maxPax:20,
    note:"20 чел включены. Просекко x2, пиво x24, AC/WiFi/TV, бассейн и горка, морской скутер x2, доп. обед по меню.",
    drive:"https://drive.google.com/drive/folders/1Qk63PA8BPrLb5i-eonuOpXa73Ih1-nw3",
    tours:[
      {name:"Racha Yai + Coral",price:124300,extra:null,incl:"1–20"},
      {name:"Maithon + Coral",price:124300,extra:null,incl:"1–20"},
      {name:"Coral + Promthep",price:124300,extra:null,incl:"1–20"},
      {name:"Khai + Maithon",price:124300,extra:null,incl:"1–20"},
    ]},
  { id:"bs33", name:"Lady M", size:"54ft", pier:"Royal Phuket Marina", type:"yacht", maxPax:8,
    note:"Обед и гид включены. 24 пива ИЛИ 12 пива + 1 бут. вина.",
    drive:"https://drive.google.com/drive/folders/1S7xW_Ffg4DAsJu1Q74jlvF-jZgWGajNM",
    tours:[
      {name:"Coral Island",price:150000,extra:4500,incl:"1–4"},
      {name:"Maithon Island",price:150000,extra:4500,incl:"1–4"},
      {name:"Khai Island",price:150000,extra:4500,incl:"1–4"},
      {name:"Racha",price:200000,extra:4500,incl:"1–4"},
      {name:"Phi Phi Island",price:190000,extra:4500,incl:"1–4"},
    ]},
  { id:"bs34", name:"Red Dragon", size:"36ft", pier:"Chalong Pier", type:"speedboat", maxPax:8,
    note:"Обед включён. Рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/13xVqPmzDQ37ZZatcGqYvJLoEaoSx1it0",
    tours:[{name:"Racha Yai",price:28500,extra:null,incl:"1–8"}]},
  { id:"bs35", name:"Solita", size:"48ft", pier:"Chalong Pier", type:"speedboat", maxPax:10,
    note:"Обед включён. Рус. гид +3500฿",
    drive:"https://drive.google.com/drive/folders/182eRIu9f4Eh9QTKZr37VDdoW23gKBphx",
    tours:[{name:"Racha Yai",price:31500,extra:null,incl:"1–10"}]},
]

const BS_TYPE_META: Record<string,{label:string;color:string;border:string;bg:string}> = {
  speedboat: {label:"Speedboat",   color:"#38bdf8", border:"#1e3f6a", bg:"#0c2340"},
  sailboat:  {label:"Парусная",    color:"#4ade80", border:"#166534", bg:"#0d2010"},
  catamaran: {label:"Катамаран",   color:"#fb923c", border:"#9a3412", bg:"#2d1500"},
  powercat:  {label:"Power Cat",   color:"#c084fc", border:"#6b21a8", bg:"#2d1b4e"},
  yacht:     {label:"Яхта",        color:"#f9a8d4", border:"#9d174d", bg:"#2d0a1a"},
}

function buildBoatSummerWA(boat: Record<string, any>): string {
  const m = BS_TYPE_META[String(boat.type)] || {label: boat.type, color:"#38bdf8", border:"#1e3f6a", bg:"#0c2340"}
  const lines: string[] = []
  lines.push(`🚤 *${boat.name}* (${boat.size}) — ${m.label}`)
  lines.push(`📍 ${boat.pier} · 👥 до ${boat.maxPax} чел.`)
  if (boat.note) { lines.push(""); lines.push(`ℹ️ ${boat.note}`) }
  lines.push("")
  lines.push("💰 *Маршруты и цены (Summer Update 1.05.26):*")
  boat.tours.forEach((tt: Record<string,any>) => {
    const price = tt.price.toLocaleString("ru-RU") + " ฿"
    const extra = tt.extra === null ? "" : typeof tt.extra === "number" ? ` (экстра: ${tt.extra.toLocaleString("ru-RU")} ฿/чел)` : ` (экстра: ${tt.extra})`
    lines.push(`• ${tt.name} — *${price}*${extra}`)
  })
  lines.push("")
  lines.push("🌴 Navigator-Sayama Travel")
  return lines.join("\n")
}

function BoatSummerTab({dark}: {dark: boolean}) {
  const t = {
    bg:dark?"#0b1120":"#f0f4f8", card:dark?"#131d2e":"#ffffff",
    cardBorder:dark?"#1e2f45":"#d1dce8", text:dark?"#e2eaf4":"#1a2636",
    muted:dark?"#5b7a9a":"#6e8aa8", accent:dark?"#38bdf8":"#0369a1",
    header:dark?"#0d1929":"#e2ecf7", inputBg:dark?"#101c2d":"#ffffff",
    inputBdr:dark?"#1e3450":"#c5d5e5", row0:dark?"transparent":"#fafafa",
    row1:dark?"rgba(255,255,255,0.02)":"#f0f4f8",
  }

  const [search, setSearch] = useState("")
  const [pierFilter, setPierFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [openId, setOpenId] = useState<string|null>(null)
  const [waModal, setWaModal] = useState<{title:string;short:string;full:string}|null>(null)
  const [calcOpen, setCalcOpen] = useState(false)
  const [calcBoat, setCalcBoat] = useState<string>("")
  const [calcTour, setCalcTour] = useState<number>(0)
  const [calcPax, setCalcPax] = useState<number>(2)
  const [calcGuide, setCalcGuide] = useState(false)
  const [calcMeal, setCalcMeal] = useState<"none"|"A"|"B"|"C">("none")
  const [calcPool, setCalcPool] = useState(false)
  const [calcSlide, setCalcSlide] = useState(false)
  const [calcSeafood, setCalcSeafood] = useState(false)
  const [calcBBQ, setCalcBBQ] = useState(false)
  const [calcFishing, setCalcFishing] = useState(false)
  const [calcCanoe, setCalcCanoe] = useState(false)

  const [aiOpen, setAiOpen] = useState(false)
  const [liveBoatsSummer, setLiveBoatsSummer] = useState<typeof BOATS_SUMMER_DATA>(BOATS_SUMMER_DATA)
  const [excelStatus, setExcelStatus] = useState<string|null>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const s = localStorage.getItem("nav_summer_data")
    if (s) try { setLiveBoatsSummer(JSON.parse(s)) } catch {}
  }, [])

  // Excel sheet → boat name mapping (Table 1 = Bowie 1, etc.)
  const SHEET_TO_BOAT: Record<string,string> = {
    "Table 1":"Bowie 1","Table 2":"Bowie 2","Table 3":"Sofia","Table 4":"Thaimarine",
    "Table 5":"Gambit","Table 6":"Yamela","Table 7":"Verona","Table 8":"Romeo",
    "Table 9":"Lexi","Table 10":"Randezvous","Table 11":"Zoe","Table 12":"Sunny",
    "Table 13":"Oceanland","Table 14":"Pepper","Table 15":"Senna","Table 16":"Summer",
    "Table 17":"Coco","Table 18":"Myra","Table 19":"Tahaa","Table 20":"Ocean Dream",
    "Table 21":"Ameray","Table 22":"Wildcat","Table 23":"White Corn","Table 24":"Black Pearl",
    "Table 25":"Ella","Table 26":"Calypso","Table 27":"Bohemian","Table 28":"F1",
    "Table 29":"Whiskey","Table 30":"Tequila","Table 31":"Vodka","Table 32":"Origin",
    "Table 33":"Lady M","Table 35":"Red Dragon","Table 36":"Solita",
  }

  function handleExcelUpload(file: File) {
    setExcelStatus("⏳ Читаю файл...")
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, {type:"array"})
        const updates: {name:string; tours:{price:number;extra:number|string|null}[]; maxPax:number|null}[] = []

        for (const [sheetName, boatName] of Object.entries(SHEET_TO_BOAT)) {
          if (!wb.SheetNames.includes(sheetName)) continue
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<any[]>(ws, {header:1, defval:null})

          // Find header row with TOUR column
          let headerIdx = -1, tourCol = -1, priceCol = -1, extraCol = -1
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const found = row.some(v => String(v||"").toUpperCase().includes("TOUR"))
            if (found) {
              headerIdx = i
              row.forEach((v:any, ci:number) => {
                const s = String(v||"").toUpperCase()
                if (s.includes("TOUR") && tourCol<0) tourCol = ci
                else if (s.includes("PRICE") && priceCol<0) priceCol = ci
                else if (s.includes("EXTRA") && extraCol<0) extraCol = ci
              })
              break
            }
          }
          if (headerIdx < 0 || priceCol < 0) continue

          // Extract maxPax
          let maxPax: number|null = null
          for (const row of rows) {
            for (const v of row) {
              const m = String(v||"").match(/MAXIMUM\s*(\d+)/i)
              if (m) { maxPax = parseInt(m[1]); break }
            }
            if (maxPax) break
          }

          // Collect tour rows
          const tours: {price:number;extra:number|string|null}[] = []
          for (let i = headerIdx+1; i < rows.length; i++) {
            const row = rows[i]
            const tourVal = tourCol>=0 ? row[tourCol] : null
            const priceVal = priceCol>=0 ? row[priceCol] : null
            if (!tourVal || typeof priceVal !== "number") continue
            let extra: number|string|null = null
            if (extraCol >= 0 && row[extraCol] != null && String(row[extraCol]).trim() !== ".") {
              const ev = String(row[extraCol]).trim()
              const num = parseFloat(ev)
              extra = isNaN(num) ? ev : num  // "1500+lunch" stays as string, 1500 → number
            }
            tours.push({price: Math.round(priceVal), extra})
          }

          if (tours.length > 0) updates.push({name: boatName, tours, maxPax})
        }

        if (updates.length === 0) {
          setExcelStatus("⚠️ Лодки не найдены. Проверь формат файла.")
          return
        }

        // Apply updates: match by index to preserve tour names from code
        setLiveBoatsSummer(prev => {
          const result = [...prev] as any[]
          let updatedCount = 0
          updates.forEach(upd => {
            const idx = result.findIndex(b => b.name === upd.name)
            if (idx < 0) return
            const boat = {...result[idx]}
            const newTours = [...boat.tours]
            upd.tours.forEach((ut, ti) => {
              if (ti < newTours.length) {
                // Update price + extra, preserve name and incl
                newTours[ti] = {...newTours[ti], price: ut.price, ...(ut.extra !== null && {extra: ut.extra})}
              }
            })
            boat.tours = newTours
            if (upd.maxPax) boat.maxPax = upd.maxPax
            result[idx] = boat
            updatedCount++
          })
          localStorage.setItem("nav_summer_data", JSON.stringify(result))
          setExcelStatus(`✅ Обновлено ${updatedCount} лодок из ${updates.length} найденных`)
          return result
        })
      } catch(err) {
        setExcelStatus("❌ Ошибка чтения файла: " + String(err))
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleAIUpdate(incoming: any[]) {
    setLiveBoatsSummer(prev => {
      const result = [...prev] as any[]
      incoming.forEach((nb: any) => {
        const idx = result.findIndex(b => b.name.toLowerCase() === (nb.name||"").toLowerCase())
        if (idx >= 0) {
          const boat = {...result[idx]}
          if (nb.tours?.length) {
            const tours = [...boat.tours] as any[]
            nb.tours.forEach((nt: any) => {
              const ti = tours.findIndex((t:any) => t.name.toLowerCase() === nt.name.toLowerCase())
              if (ti >= 0) tours[ti] = {...tours[ti], price: nt.price ?? tours[ti].price, extra: nt.extra !== undefined ? nt.extra : tours[ti].extra}
              else tours.push({name: nt.name, price: nt.price, extra: nt.extra ?? null, incl: nt.incl || nt.paxIncl || "1–2"})
            })
            boat.tours = tours
          }
          if (nb.note) boat.note = nb.note
          result[idx] = boat
        } else if (nb.name) {
          result.push({id: "bs_"+Date.now(), name: nb.name, size: nb.size||"", pier: nb.pier||"", type: nb.type||"sailboat", maxPax: nb.maxPax||20, tours: (nb.tours||[]).map((t:any)=>({name:t.name,price:t.price,extra:t.extra??null,incl:t.incl||t.paxIncl||"1–2"})), ...(nb.note&&{note:nb.note})})
        }
      })
      localStorage.setItem("nav_summer_data", JSON.stringify(result))
      return result
    })
  }

  const allPiers = useMemo(()=>Array.from(new Set(liveBoatsSummer.map(b=>b.pier))).sort(),[liveBoatsSummer])

  const filtered = useMemo(()=>{
    return [...liveBoatsSummer].filter(b=>{
      const q = search.toLowerCase()
      const matchQ = !q || b.name.toLowerCase().includes(q) || b.pier.toLowerCase().includes(q) ||
        b.tours.some(tt=>tt.name.toLowerCase().includes(q))
      const matchP = pierFilter==="all" || b.pier===pierFilter
      const matchT = typeFilter==="all" || b.type===typeFilter
      return matchQ && matchP && matchT
    }).sort((a,b2)=>{
      if(sortBy==="name") return a.name.localeCompare(b2.name)
      if(sortBy==="price") return Math.min(...a.tours.map(tt=>tt.price)) - Math.min(...b2.tours.map(tt=>tt.price))
      if(sortBy==="size") return parseInt(b2.size) - parseInt(a.size)
      if(sortBy==="pax") return b2.maxPax - a.maxPax
      return 0
    })
  },[search,pierFilter,typeFilter,sortBy,liveBoatsSummer])

  function fmtP(n: number) { return n.toLocaleString("ru-RU") + " ฿" }

  const typeStats = ["speedboat","sailboat","catamaran","powercat","yacht"].map(tp=>({
    tp, label:BS_TYPE_META[tp].label, color:BS_TYPE_META[tp].color,
    count: liveBoatsSummer.filter(b=>b.type===tp).length
  }))

  const selStyle = {padding:"8px 10px",fontSize:"12px",borderRadius:"8px",border:`1px solid ${t.inputBdr}`,background:t.inputBg,color:t.text,outline:"none",cursor:"pointer"}

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 110px)",overflow:"hidden"}}>

      {/* ── Toolbar ── */}
      <div style={{background:t.header,borderBottom:`1px solid ${t.cardBorder}`,padding:"10px 12px",flexShrink:0}}>

        {/* Title row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px",flexWrap:"wrap",gap:"6px"}}>
          <div>
            <div style={{fontSize:"14px",fontWeight:800,color:t.accent}}>🚤 Boat Summer Update 1.05.26</div>
            <div style={{fontSize:"11px",color:t.muted}}>Прайс-лист · {liveBoatsSummer.length} судов · сезон 2025–2026 · все цены ฿</div>
          </div>
          <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap"}}>
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" style={{display:"none"}}
              onChange={e=>{const f=e.target.files?.[0];if(f)handleExcelUpload(f);e.target.value=""}}/>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"2px"}}>
              <button onClick={()=>excelInputRef.current?.click()}
                style={{padding:"6px 12px",fontSize:"12px",fontWeight:700,borderRadius:"8px",border:"none",cursor:"pointer",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",boxShadow:"0 2px 8px rgba(245,158,11,0.3)"}}>
                📂 Загрузить прайс (Excel)
              </button>
              {excelStatus && <div style={{fontSize:"10px",color:excelStatus.startsWith("✅")?"#4ade80":excelStatus.startsWith("❌")?"#f87171":"#fbbf24",fontWeight:600}}>{excelStatus}</div>}
            </div>
            <button onClick={()=>{setCalcOpen(true);setCalcBoat("");setCalcTour(0);setCalcPax(2);setCalcGuide(false);setCalcMeal("none");setCalcPool(false);setCalcSlide(false);setCalcSeafood(false);setCalcBBQ(false);setCalcFishing(false);setCalcCanoe(false)}}
              style={{padding:"6px 12px",fontSize:"12px",fontWeight:700,borderRadius:"8px",border:"none",cursor:"pointer",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#fff",boxShadow:"0 2px 8px rgba(245,158,11,0.35)"}}>
              🧮 Калькулятор
            </button>
            <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
              {typeStats.map(s=>(
                <span key={s.tp} style={{fontSize:"10px",padding:"2px 7px",borderRadius:"99px",background:`${s.color}22`,color:s.color,fontWeight:700,border:`1px solid ${s.color}44`}}>
                  {s.label}: {s.count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="🔍 Поиск по названию, туру, пирсу..."
            style={{...selStyle,flex:"1 1 180px",padding:"8px 12px"}}/>
          <select value={pierFilter} onChange={e=>setPierFilter(e.target.value)} style={{...selStyle,flex:"0 0 auto"}}>
            <option value="all">Все пирсы</option>
            {allPiers.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...selStyle,flex:"0 0 auto"}}>
            <option value="all">Все типы</option>
            {["speedboat","sailboat","catamaran","powercat","yacht"].map(tp=>(
              <option key={tp} value={tp}>{BS_TYPE_META[tp].label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)} style={{...selStyle,flex:"0 0 auto"}}>
            <option value="name">По имени</option>
            <option value="price">По цене ↑</option>
            <option value="size">По размеру ↓</option>
            <option value="pax">По PAX ↓</option>
          </select>
        </div>

        <div style={{fontSize:"11px",color:t.muted,marginTop:"6px"}}>Найдено: {filtered.length} из {liveBoatsSummer.length}</div>
      </div>

      {/* ── Boat list ── */}
      <div style={{overflowY:"auto",flex:1,padding:"12px 14px"}}>
        {filtered.length===0 && (
          <div style={{textAlign:"center",padding:"60px 20px",color:t.muted}}>
            <div style={{fontSize:"36px",marginBottom:"10px"}}>🚤</div>
            <div>Ничего не найдено. Измените фильтры.</div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"10px"}}>
          {filtered.map(boat=>{
            const m = BS_TYPE_META[String(boat.type)] || {label:boat.type,color:"#38bdf8",border:"#1e3f6a",bg:"#0c2340"}
            const isOpen = openId===boat.id
            const prices = boat.tours.map(tt=>tt.price)
            const minPrice = Math.min(...prices)
            return (
              <div key={boat.id} style={{background:t.card,borderRadius:"14px",border:`1.5px solid ${isOpen?m.color:m.border}`,overflow:"hidden",transition:"border-color 0.2s"}}>
                <div onClick={()=>setOpenId(isOpen?null:boat.id)} style={{cursor:"pointer",userSelect:"none"}}>
                  <div style={{background:m.bg,borderBottom:`1px solid ${m.border}`,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:"16px",fontWeight:800,color:m.color,letterSpacing:"-0.3px"}}>
                          {boat.name}
                          <span style={{fontSize:"12px",fontWeight:400,color:m.color,opacity:0.7,marginLeft:"7px"}}>{boat.size}</span>
                        </div>
                        <div style={{fontSize:"11px",color:m.color,opacity:0.65,marginTop:"2px"}}>📍 {boat.pier}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px"}}>
                        <span style={{background:`${m.color}22`,color:m.color,border:`1px solid ${m.border}`,borderRadius:"99px",padding:"2px 9px",fontSize:"11px",fontWeight:700}}>{m.label}</span>
                        <span style={{fontSize:"11px",color:m.color,opacity:0.7}}>👥 макс. {boat.maxPax} чел.</span>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <span style={{fontSize:"14px",fontWeight:700,color:m.color}}>от {fmtP(minPrice)}</span>
                      <span style={{fontSize:"11px",color:t.muted,marginLeft:"8px"}}>{boat.tours.length} {boat.tours.length===1?"маршрут":boat.tours.length<5?"маршрута":"маршрутов"}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      {"drive" in boat && boat.drive && (
                        <a href={boat.drive} target="_blank" rel="noreferrer"
                          onClick={e=>e.stopPropagation()}
                          style={{fontSize:"10px",color:t.accent,background:`${t.accent}18`,padding:"2px 7px",borderRadius:"6px",border:`1px solid ${t.accent}44`,textDecoration:"none"}}>
                          📁 Фото
                        </a>
                      )}
                      <span style={{fontSize:"13px",color:m.color,transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0)"}}>▾</span>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div style={{borderTop:`1px solid ${m.border}`,padding:"12px 14px",background:dark?"rgba(0,0,0,0.2)":"rgba(0,0,0,0.02)"}}>
                    {"note" in boat && boat.note && (
                      <div style={{background:dark?"#2d1f00":"#fffbeb",border:"1px solid #d97706",borderRadius:"8px",padding:"8px 11px",fontSize:"11px",color:dark?"#fde68a":"#92400e",marginBottom:"10px",lineHeight:1.5}}>
                        ℹ️ {boat.note}
                      </div>
                    )}
                    <div style={{borderRadius:"8px",overflow:"hidden",border:`1px solid ${m.border}`}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",background:m.bg,padding:"6px 10px",gap:"8px"}}>
                        {["Маршрут","Цена","Экстра/чел","Вкл. чел"].map(h=>(
                          <div key={h} style={{fontSize:"10px",fontWeight:700,color:m.color,textAlign:h==="Маршрут"?"left":"right",textTransform:"uppercase",letterSpacing:"0.5px"}}>{h}</div>
                        ))}
                      </div>
                      {boat.tours.map((tour,i)=>(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto auto",padding:"7px 10px",gap:"8px",alignItems:"center",background:i%2===0?t.row0:t.row1,borderTop:i===0?"none":`1px solid ${dark?"rgba(255,255,255,0.05)":"#f0f0f0"}`}}>
                          <div style={{fontSize:"12px",color:t.text,lineHeight:1.4}}>{tour.name}</div>
                          <div style={{fontSize:"13px",fontWeight:700,color:m.color,textAlign:"right",whiteSpace:"nowrap"}}>{fmtP(tour.price)}</div>
                          <div style={{fontSize:"11px",color:t.muted,textAlign:"right",whiteSpace:"nowrap"}}>
                            {tour.extra===null?"—":typeof tour.extra==="number"?fmtP(tour.extra):String(tour.extra)}
                          </div>
                          <div style={{fontSize:"11px",color:t.muted,textAlign:"right",whiteSpace:"nowrap"}}>{tour.incl}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setWaModal({title:boat.name, short:buildBoatSummerWA(boat), full:buildBoatSummerWA(boat)}) }}
                      style={{marginTop:"6px",width:"100%",background:"#25d366",color:"#fff",border:"none",borderRadius:"8px",padding:"8px",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                      <span>📤</span> Отправить в WhatsApp
                    </button>
                    <button onClick={()=>setOpenId(null)}
                      style={{marginTop:"10px",width:"100%",background:"transparent",border:`1px solid ${m.border}`,borderRadius:"8px",padding:"7px",fontSize:"12px",color:m.color,cursor:"pointer",fontWeight:600}}>
                      Свернуть ▲
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Calculator Modal ── */}
      {calcOpen && (()=>{
        const boat = (liveBoatsSummer as any[]).find((b:any)=>b.id===calcBoat)
        const tour = boat ? boat.tours[calcTour] : null
        const m = boat ? (BS_TYPE_META[String(boat.type)] || BS_TYPE_META["speedboat"]) : null
        const note:string = boat?.note||""

        // Detect available extras from note
        const hasGuide   = true // available for all
        const hasMeal    = note.includes("обед") || note.includes("Lunch") || note.includes("640") || note.includes("500")
        const hasPool    = note.includes("бассейн") || note.includes("Pool") || note.includes("3500")
        const hasSlide   = note.includes("горка") || note.includes("Slide") || note.includes("3600")
        const hasSeafood = note.includes("seafood") || note.includes("Seafood") || note.includes("650")
        const hasBBQ     = note.includes("BBQ") || note.includes("bbq") || note.includes("1500")
        const hasFishing = note.includes("удочки") || note.includes("Fishing") || note.includes("1000")
        const hasCanoe   = note.includes("каноэ") || note.includes("Canoe") || note.includes("canoe")

        // Meal prices per pax
        const mealPrice: Record<string,number> = {none:0, A:640, B:780, C:920}

        // Build breakdown
        const rows: {label:string; amount:number; perPax?:boolean}[] = []
        let total = 0

        if(boat && tour){
          const extra = tour.extra
          const inclStr = String(tour.incl||"")
          const inclMax = parseInt(inclStr.split("–")[1]||inclStr.replace(/\D/g,""))||2
          rows.push({label:`🚤 База (вкл. ${tour.incl} чел.)`, amount:tour.price})
          total += tour.price
          if(calcPax > inclMax){
            if(extra !== null && typeof extra === "number"){
              const ep = calcPax - inclMax
              const et = ep * extra
              rows.push({label:`👤 Доп. ${ep} чел × ${extra.toLocaleString("ru-RU")} ฿`, amount:et})
              total += et
            } else if(extra !== null && typeof extra === "string"){
              rows.push({label:`⚠️ Доп. тариф: ${extra}`, amount:0})
            }
          }
        }

        if(calcGuide){ rows.push({label:"🇷🇺 Русскоговорящий гид", amount:3500}); total+=3500 }

        if(calcMeal !== "none" && hasMeal){
          const mp = mealPrice[calcMeal] * calcPax
          rows.push({label:`🍽️ Питание кат. ${calcMeal} × ${calcPax} чел.`, amount:mp})
          total += mp
        }
        if(calcPool && hasPool){ rows.push({label:"🏊 Бассейн на борту", amount:3500}); total+=3500 }
        if(calcSlide && hasSlide){ rows.push({label:"🎢 Горка", amount:3600}); total+=3600 }
        if(calcSeafood && hasSeafood){
          const sf = 650*calcPax
          rows.push({label:`🦐 Морепродукты × ${calcPax} чел.`, amount:sf})
          total+=sf
        }
        if(calcBBQ && hasBBQ){ rows.push({label:"🍗 BBQ (курица + морепродукты)", amount:1500}); total+=1500 }
        if(calcFishing && hasFishing){ rows.push({label:"🎣 Удочки", amount:1000}); total+=1000 }
        if(calcCanoe && hasCanoe){
          const cn = 500*calcPax
          rows.push({label:`🛶 Каноэ × ${calcPax} чел.`, amount:cn})
          total+=cn
        }

        const inputSt:React.CSSProperties={width:"100%",padding:"10px 12px",borderRadius:"10px",border:`1px solid ${t.inputBdr}`,background:t.inputBg,color:t.text,fontSize:"13px",fontWeight:600,outline:"none",boxSizing:"border-box"}

        function Checkbox({checked,onChange,label,price,available}:{checked:boolean;onChange:(v:boolean)=>void;label:string;price:string;available:boolean}){
          if(!available) return null
          return (
            <label style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 10px",borderRadius:"8px",cursor:"pointer",border:`1px solid ${checked?(m?.border||t.cardBorder):t.cardBorder}`,background:checked?(m?.bg||t.header):t.header,marginBottom:"6px",transition:"all 0.15s"}}>
              <div style={{width:"18px",height:"18px",borderRadius:"6px",border:`2px solid ${checked?(m?.color||t.accent):t.muted}`,background:checked?(m?.color||t.accent):"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}
                onClick={()=>onChange(!checked)}>
                {checked && <span style={{color:"#fff",fontSize:"11px",fontWeight:900}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:"12px",color:t.text,fontWeight:500}}>{label}</span>
              <span style={{fontSize:"11px",color:m?.color||t.accent,fontWeight:700,flexShrink:0}}>{price}</span>
            </label>
          )
        }

        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"12px"}} onClick={()=>setCalcOpen(false)}>
            <div style={{background:t.card,border:`1.5px solid ${t.cardBorder}`,borderRadius:"20px",width:"100%",maxWidth:"420px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",display:"flex",flexDirection:"column",maxHeight:"92vh"}} onClick={(e:React.MouseEvent)=>e.stopPropagation()}>

              {/* Header */}
              <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${t.cardBorder}`,flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:"16px",fontWeight:800,color:t.text}}>🧮 Калькулятор цены</div>
                    <div style={{fontSize:"10px",color:t.muted,marginTop:"1px"}}>Summer Update 1.05.26 · все цены в ฿</div>
                  </div>
                  <button onClick={()=>setCalcOpen(false)} style={{background:t.cardBorder,border:"none",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"14px",color:t.text,flexShrink:0}}>✕</button>
                </div>
              </div>

              {/* Scrollable body */}
              <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}>

                {/* Boat */}
                <div style={{marginBottom:"12px"}}>
                  <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"5px"}}>Лодка</div>
                  <select value={calcBoat} onChange={e=>{setCalcBoat(e.target.value);setCalcTour(0);setCalcPool(false);setCalcSlide(false);setCalcSeafood(false);setCalcBBQ(false);setCalcFishing(false);setCalcCanoe(false);setCalcMeal("none")}} style={inputSt}>
                    <option value="">— Выберите лодку —</option>
                    {([...liveBoatsSummer] as any[]).sort((a:any,b2:any)=>a.name.localeCompare(b2.name)).map((b:any)=>(
                      <option key={b.id} value={b.id}>{b.name} ({b.size}) · {BS_TYPE_META[String(b.type)]?.label||b.type}</option>
                    ))}
                  </select>
                </div>

                {/* Tour */}
                {boat && (
                  <div style={{marginBottom:"12px"}}>
                    <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"5px"}}>Маршрут</div>
                    <select value={calcTour} onChange={e=>setCalcTour(Number(e.target.value))} style={inputSt}>
                      {boat.tours.map((tt:any,i:number)=>(
                        <option key={i} value={i}>{tt.name} — {tt.price.toLocaleString("ru-RU")} ฿</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* PAX */}
                {boat && (
                  <div style={{marginBottom:"16px"}}>
                    <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"5px"}}>
                      Человек: <span style={{color:m?.color||t.accent,fontSize:"13px"}}>{calcPax}</span> <span style={{fontWeight:400}}>/ макс. {boat.maxPax}</span>
                    </div>
                    <div onTouchStart={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}><input type="range" min={1} max={boat.maxPax} value={calcPax} onChange={e=>setCalcPax(Number(e.target.value))} style={{width:"100%",accentColor:m?.color||"#38bdf8",cursor:"pointer"}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:t.muted,marginTop:"1px"}}>
                      <span>1</span><span>{boat.maxPax}</span>
                    </div>
                  </div>
                )}

                {/* Extra services */}
                {boat && tour && (
                  <div style={{marginBottom:"16px"}}>
                    <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"8px"}}>Доп. услуги</div>

                    <Checkbox checked={calcGuide} onChange={setCalcGuide} label="🇷🇺 Русскоговорящий гид" price="+3 500 ฿" available={hasGuide}/>
                    <Checkbox checked={calcPool} onChange={setCalcPool} label="🏊 Бассейн на борту" price="+3 500 ฿" available={hasPool}/>
                    <Checkbox checked={calcSlide} onChange={setCalcSlide} label="🎢 Горка" price="+3 600 ฿" available={hasSlide}/>
                    <Checkbox checked={calcSeafood} onChange={setCalcSeafood} label={`🦐 Морепродукты (×${calcPax} чел.)`} price={`+${(650*calcPax).toLocaleString("ru-RU")} ฿`} available={hasSeafood}/>
                    <Checkbox checked={calcBBQ} onChange={setCalcBBQ} label="🍗 BBQ (курица + морепродукты)" price="+1 500 ฿" available={hasBBQ}/>
                    <Checkbox checked={calcFishing} onChange={setCalcFishing} label="🎣 Удочки" price="+1 000 ฿" available={hasFishing}/>
                    <Checkbox checked={calcCanoe} onChange={setCalcCanoe} label={`🛶 Каноэ (×${calcPax} чел.)`} price={`+${(500*calcPax).toLocaleString("ru-RU")} ฿`} available={hasCanoe}/>

                    {/* Meal selector */}
                    {hasMeal && (
                      <div style={{marginTop:"8px"}}>
                        <div style={{fontSize:"10px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"6px"}}>🍽️ Питание (на {calcPax} чел.)</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px"}}>
                          {(["none","A","B","C"] as const).map(cat=>{
                            const labels:{[k:string]:string} = {none:"Нет",A:`A\n${640*calcPax}฿`,B:`B\n${780*calcPax}฿`,C:`C\n${920*calcPax}฿`}
                            const active = calcMeal===cat
                            return (
                              <button key={cat} onClick={()=>setCalcMeal(cat)}
                                style={{padding:"8px 4px",borderRadius:"8px",border:`1.5px solid ${active?(m?.color||t.accent):t.cardBorder}`,background:active?(m?.bg||t.header):t.header,color:active?(m?.color||t.accent):t.muted,fontSize:"10px",fontWeight:700,cursor:"pointer",lineHeight:1.4,whiteSpace:"pre-wrap" as any,textAlign:"center" as any}}>
                                {labels[cat]}
                              </button>
                            )
                          })}
                        </div>
                        <div style={{fontSize:"10px",color:t.muted,marginTop:"4px"}}>A = 640฿ · B = 780฿ · C = 920฿ за человека</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Result — sticky footer */}
              {boat && tour && (
                <div style={{borderTop:`1.5px solid ${m?.border||t.cardBorder}`,background:m?m.bg:t.header,padding:"14px 20px",flexShrink:0,borderRadius:"0 0 18px 18px"}}>
                  {rows.map((row,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:t.text,marginBottom:"3px",opacity:0.8}}>
                      <span>{row.label}</span>
                      <span style={{fontWeight:600,flexShrink:0,marginLeft:"8px"}}>{row.amount>0?row.amount.toLocaleString("ru-RU")+" ฿":"—"}</span>
                    </div>
                  ))}
                  <div style={{borderTop:`1px solid ${m?.border||t.cardBorder}`,marginTop:"10px",paddingTop:"10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:"10px",color:t.muted}}>ИТОГО за {calcPax} чел.</div>
                      <div style={{fontSize:"26px",fontWeight:900,color:m?.color||t.accent,letterSpacing:"-0.5px"}}>{total.toLocaleString("ru-RU")} ฿</div>
                    </div>
                    <div style={{textAlign:"right" as any}}>
                      <div style={{fontSize:"10px",color:t.muted}}>НА ЧЕЛОВЕКА</div>
                      <div style={{fontSize:"20px",fontWeight:800,color:m?.color||t.accent}}>{Math.round(total/calcPax).toLocaleString("ru-RU")} ฿</div>
                    </div>
                  </div>
                </div>
              )}
              {(!boat||!tour) && (
                <div style={{padding:"20px",textAlign:"center" as any,color:t.muted,fontSize:"13px",borderTop:`1px solid ${t.cardBorder}`}}>
                  👆 Выберите лодку и маршрут для расчёта
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* WA Modal BoatSummer */}
      {waModal && <WAShareModal dark={dark} title={waModal.title} shortText={waModal.short} fullText={waModal.full} onClose={() => setWaModal(null)}/>}
      {aiOpen && <AIUpdatePanel dark={dark} mode="summer" onUpdate={handleAIUpdate} onClose={() => setAiOpen(false)}/>}
    </div>
  )
}

// ═══════════════════════════════════════════
// VIP TOUR CALCULATOR
// ═══════════════════════════════════════════

const VIP_ATTRACTIONS = [
  {id:"tiger_big",    label:"🐯 Тигры Большие/Средние/Маленькие", adultPrice:1050, childPrice:1050, hasChild:false},
  {id:"tiger_white",  label:"🐯 Тигры Белый/Гигант",              adultPrice:1500, childPrice:1500, hasChild:false},
  {id:"cheetah",      label:"🐆 Гепард",                          adultPrice:1500, childPrice:1500, hasChild:false},
  {id:"lion",         label:"🦁 Львы Большие/Средние/Маленькие",  adultPrice:1000, childPrice:1000, hasChild:false},
  {id:"lion_white",   label:"🦁 Лев Белый",                       adultPrice:1500, childPrice:1500, hasChild:false},
  {id:"dolphin_vip",  label:"🐬 Дельфины VIP",                    adultPrice:1200, childPrice:1200, hasChild:false},
  {id:"dolphin_std",  label:"🐬 Дельфины Обычные",                adultPrice:1000, childPrice:1000, hasChild:false},
  {id:"dolphin_swim", label:"🐬 Купание с дельфинами",            adultPrice:6000, childPrice:6000, hasChild:false},
  {id:"elephant",     label:"🐘 Слоны",                           adultPrice:800,  childPrice:800,  hasChild:false},
  {id:"elephant_res", label:"🐘 Заповедник слонов (Sanctuary)",   adultPrice:1500, childPrice:1500, hasChild:false},
  {id:"bird_park",    label:"🦜 Птичий парк (пт–вс)",             adultPrice:500,  childPrice:500,  hasChild:false},
  {id:"crocodile",    label:"🐊 Крокодилы",                       adultPrice:500,  childPrice:300,  hasChild:true},
  {id:"aquarium",     label:"🐠 Океанариум",                       adultPrice:1290, childPrice:700,  hasChild:true},
  {id:"transfer_ap",  label:"✈️ Инд. трансфер в аэропорт",        adultPrice:2400, childPrice:0,    hasChild:false, fixed:true},
]

// ─────────────────────────────────────────────
// CURRENCY STRIP
// ─────────────────────────────────────────────
interface RatesState {
  rates: Record<string,number>
  updated: string
  loading: boolean
  error: boolean
  isVP?: boolean
}

function CurrencyButton({dark}:{dark:boolean}) {
  const [state, setState] = useState<RatesState>({rates:{},updated:"",loading:true,error:false,isVP:false})
  const [open, setOpen] = useState(false)

  useEffect(()=>{
    const cached = localStorage.getItem("nav_fx")
    if (cached) {
      try {
        const obj = JSON.parse(cached)
        const age = Date.now() - obj.ts
        if (age < 30*60*1000) {
          setState({rates:obj.rates, updated:obj.updated, loading:false, error:false, isVP:obj.source?.includes("valueplus")})
          return
        }
      } catch {}
    }
    fetchRates()
  },[])

  function fetchRates() {
    setState(s=>({...s,loading:true,error:false}))
    fetch("/api/fx")
      .then(r=>r.json())
      .then(data=>{
        if (!data.success || !data.rates) throw new Error("no rates")
        const updated = new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})
        const ts = Date.now()
        const isVP = data.source?.includes("valueplus")
        localStorage.setItem("nav_fx", JSON.stringify({rates:data.rates, updated, ts, source:data.source}))
        setState({rates:data.rates, updated, loading:false, error:false, isVP})
      })
      .catch(()=>setState(s=>({...s,loading:false,error:true})))
  }

  const CURRENCIES = [
    {code:"USD", flag:"🇺🇸", label:"Доллар",   full:"USD → THB"},
    {code:"EUR", flag:"🇪🇺", label:"Евро",     full:"EUR → THB"},
    {code:"CNY", flag:"🇨🇳", label:"Юань",     full:"CNY → THB"},
  ]

  const t = {
    bg:   dark?"#0d1929":"#f0f4f8",
    card: dark?"#131d2e":"#ffffff",
    border: dark?"#1e3450":"#c5d5e5",
    text: dark?"#e2eaf4":"#1a2636",
    muted:dark?"#5b7a9a":"#6e8aa8",
    accent:dark?"#38bdf8":"#0369a1",
  }

  return (
    <>
      {/* Combined Weather + Currency pill */}
      <button onClick={()=>setOpen(true)}
        title="Курс валют"
        style={{
          display:"flex",alignItems:"center",gap:"6px",
          height:"36px",padding:"0 12px",
          borderRadius:"10px",border:`1px solid ${t.border}`,
          background:t.card,cursor:"pointer",flexShrink:0,
          boxShadow:state.error?"0 0 0 2px #f87171":open?`0 0 0 2px ${t.accent}`:"none",
          transition:"all 0.2s",
        }}>
        <span style={{fontSize:"16px",lineHeight:1}}>💱</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div onClick={()=>setOpen(false)}
          style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",paddingTop:"70px",paddingRight:"12px"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:t.card,borderRadius:"16px",border:`1px solid ${t.border}`,
              width:"260px",boxShadow:"0 20px 60px rgba(0,0,0,0.4)",overflow:"hidden"}}>

            {/* Modal header */}
            <div style={{background:t.bg,borderBottom:`1px solid ${t.border}`,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:"13px",fontWeight:800,color:t.accent}}>💱 Курс валют к бату</div>
                <div style={{fontSize:"10px",color:t.muted,marginTop:"2px"}}>
                  {state.isVP?"ValuePlus":"Открытый курс"} · курс покупки −1.05%
                  {state.updated && ` · ${state.updated}`}
                </div>
              </div>
              <button onClick={()=>setOpen(false)}
                style={{background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:t.muted,padding:"0",lineHeight:1}}>✕</button>
            </div>

            {/* Rates */}
            <div style={{padding:"8px"}}>
              {state.loading && (
                <div style={{textAlign:"center",padding:"20px",color:t.muted,fontSize:"13px"}}>⏳ Загрузка...</div>
              )}
              {state.error && (
                <div style={{textAlign:"center",padding:"20px",color:"#f87171",fontSize:"13px"}}>⚠️ Нет данных</div>
              )}
              {!state.loading && !state.error && CURRENCIES.map(({code,flag,label})=>{
                const rawRate = state.rates[code]
                if (!rawRate) return null
                const rate = Math.round(rawRate * (1-0.0105) * 10000) / 10000
                return (
                  <div key={code} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                    padding:"10px 10px",borderRadius:"10px",marginBottom:"4px",
                    background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
                    border:`1px solid ${t.border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{fontSize:"22px"}}>{flag}</span>
                      <div>
                        <div style={{fontSize:"12px",fontWeight:700,color:t.text}}>{label}</div>
                        <div style={{fontSize:"10px",color:t.muted}}>{code}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right" as any}}>
                      <div style={{fontSize:"18px",fontWeight:800,color:t.accent}}>{rate.toFixed(2)}</div>
                      <div style={{fontSize:"10px",color:t.muted}}>฿</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Refresh */}
            <div style={{padding:"8px 8px 12px"}}>
              <button onClick={fetchRates} disabled={state.loading}
                style={{width:"100%",padding:"8px",borderRadius:"10px",border:`1px solid ${t.border}`,
                  background:"none",color:t.accent,fontSize:"12px",fontWeight:700,cursor:"pointer",
                  opacity:state.loading?0.5:1}}>
                {state.loading?"⏳ Обновляем...":"🔄 Обновить курс"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// ── WEATHER TAB ──────────────────────────────────────────────────────────
function WeatherButton({dark}:{dark:boolean}) {
  const t = {
    bg: dark?"#09172a":"#f0f5fa", card:dark?"#0e1d31":"#ffffff",
    border:dark?"#1a2e46":"#ccd9e8", text:dark?"#ddeaf7":"#1a2636",
    muted:dark?"#527490":"#6e8aa8", accent:"#06b6d4",
  }
  const [open, setOpen] = useState(false)
  const [weather, setWeather] = useState<any>(null)
  const [marine, setMarine] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [updated, setUpdated] = useState("")

  const WMO: Record<number,{label:string;icon:string}> = {
    0:{label:"Ясно",icon:"☀️"},1:{label:"Почти ясно",icon:"🌤"},2:{label:"Переменная облачность",icon:"⛅"},3:{label:"Пасмурно",icon:"☁️"},
    45:{label:"Туман",icon:"🌫"},48:{label:"Туман",icon:"🌫"},51:{label:"Морось",icon:"🌦"},53:{label:"Морось",icon:"🌦"},55:{label:"Дождь",icon:"🌧"},
    61:{label:"Лёгкий дождь",icon:"🌧"},63:{label:"Дождь",icon:"🌧"},65:{label:"Сильный дождь",icon:"⛈"},
    80:{label:"Ливень",icon:"🌩"},81:{label:"Ливень",icon:"⛈"},82:{label:"Шторм",icon:"⛈"},95:{label:"Гроза",icon:"⛈"},96:{label:"Гроза",icon:"⛈"},99:{label:"Гроза",icon:"⛈"},
  }

  function fetchData() {
    setLoading(true)
    Promise.all([
      fetch("https://api.open-meteo.com/v1/forecast?latitude=7.88&longitude=98.38&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,precipitation&timezone=Asia%2FBangkok"),
      fetch("https://marine-api.open-meteo.com/v1/marine?latitude=7.88&longitude=98.38&current=wave_height,wave_period&timezone=Asia%2FBangkok")
    ]).then(([w,m])=>Promise.all([w.json(),m.json()]))
      .then(([wd,md])=>{
        setWeather(wd.current); setMarine(md.current)
        const now = new Date()
        setUpdated(`${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`)
      }).finally(()=>setLoading(false))
  }

  function handleOpen() { setOpen(true); if(!weather) fetchData() }

  const wInfo = weather ? (WMO[weather.weather_code]??{label:"—",icon:"🌡"}) : null
  const wave = marine?.wave_height ?? null
  const seaSt = wave===null ? null : wave<0.5?{label:"Спокойное",color:"#4ade80"}:wave<1.2?{label:"Умеренное",color:"#fbbf24"}:wave<2.5?{label:"Волнение",color:"#f97316"}:{label:"Шторм",color:"#f87171"}

  return (
    <>
      <button onClick={handleOpen} title="Погода Пхукет"
        style={{height:"36px",padding:"0 10px",borderRadius:"10px",border:`1px solid ${t.border}`,
          background:t.card,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",gap:"5px",
          boxShadow:open?`0 0 0 2px ${t.accent}`:"none",transition:"all 0.2s"}}>
        <span style={{fontSize:"16px",lineHeight:1}}>{wInfo?.icon??"🌤"}</span>
        {weather && <span style={{fontSize:"13px",fontWeight:800,color:dark?"#7dd3fc":"#0369a1",fontFamily:"monospace"}}>{Math.round(weather.temperature_2m)}°</span>}
      </button>

      {open && (
        <div onClick={()=>setOpen(false)}
          style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",paddingTop:"70px",paddingRight:"12px"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:t.card,borderRadius:"16px",border:`1px solid ${t.border}`,width:"280px",boxShadow:"0 20px 60px rgba(0,0,0,0.4)",overflow:"hidden"}}>

            {/* Header */}
            <div style={{background:t.bg,borderBottom:`1px solid ${t.border}`,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"13px",fontWeight:800,color:t.accent}}>🌤 Погода — Пхукет</div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                {updated && <span style={{fontSize:"10px",color:t.muted}}>{updated}</span>}
                <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:t.muted,padding:0,lineHeight:1}}>✕</button>
              </div>
            </div>

            {loading && <div style={{textAlign:"center",padding:"32px",color:t.muted,fontSize:"13px"}}>⏳ Загрузка...</div>}

            {!loading && weather && wInfo && (
              <>
                {/* Main temp */}
                <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"16px 14px 10px"}}>
                  <div style={{fontSize:"52px",lineHeight:1}}>{wInfo.icon}</div>
                  <div>
                    <div style={{fontSize:"42px",fontWeight:900,color:t.text,lineHeight:1,fontFamily:"monospace"}}>{Math.round(weather.temperature_2m)}°</div>
                    <div style={{fontSize:"12px",color:t.muted,marginTop:"2px"}}>{wInfo.label} · ощущается {Math.round(weather.apparent_temperature)}°</div>
                  </div>
                </div>

                {/* Grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",padding:"0 10px 10px"}}>
                  {[
                    {icon:"💧",label:"Влажность",val:`${weather.relative_humidity_2m}%`},
                    {icon:"💨",label:"Ветер",val:`${Math.round(weather.wind_speed_10m)} км/ч`},
                    {icon:"🌧",label:"Осадки",val:`${weather.precipitation} мм`},
                    {icon:"🌊",label:"Волны",val:wave!==null?`${wave.toFixed(1)} м`:"—"},
                  ].map(({icon,label,val})=>(
                    <div key={label} style={{background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",border:`1px solid ${t.border}`,borderRadius:"10px",padding:"8px 10px",display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{fontSize:"18px"}}>{icon}</span>
                      <div>
                        <div style={{fontSize:"14px",fontWeight:800,color:t.text}}>{val}</div>
                        <div style={{fontSize:"10px",color:t.muted}}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sea status */}
                {seaSt && (
                  <div style={{margin:"0 10px 10px",padding:"10px 12px",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${t.border}`,borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{fontSize:"20px"}}>🚢</span>
                      <div>
                        <div style={{fontSize:"10px",color:t.muted,fontWeight:600}}>СОСТОЯНИЕ МОРЯ</div>
                        <div style={{fontSize:"15px",fontWeight:800,color:seaSt.color}}>{seaSt.label}</div>
                      </div>
                    </div>
                    <div style={{width:"10px",height:"10px",borderRadius:"50%",background:seaSt.color,boxShadow:`0 0 8px ${seaSt.color}`}}/>
                  </div>
                )}

                {wave!==null && wave>=1.5 && (
                  <div style={{margin:"0 10px 10px",padding:"10px 12px",background:dark?"#2d1a0e":"#fff7ed",border:"1.5px solid #f97316",borderRadius:"10px",display:"flex",gap:"8px",alignItems:"flex-start"}}>
                    <span style={{fontSize:"18px"}}>⚠️</span>
                    <div style={{fontSize:"11px",color:dark?"#fed7aa":"#92400e",lineHeight:1.5}}>Волны {wave.toFixed(1)} м — уточни статус морских туров у оперейшна</div>
                  </div>
                )}
              </>
            )}

            {/* Refresh */}
            <div style={{padding:"8px 10px 12px"}}>
              <button onClick={fetchData} disabled={loading}
                style={{width:"100%",padding:"8px",borderRadius:"10px",border:`1px solid ${t.border}`,background:"none",color:t.accent,fontSize:"12px",fontWeight:700,cursor:"pointer",opacity:loading?0.5:1}}>
                {loading?"⏳ Загрузка...":"🔄 Обновить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


// ── CONTACTS TAB ─────────────────────────────────────────────────────────
// PRIVATE TOURS TAB
// ─────────────────────────────────────────────

interface PrivateTour {
  id: string
  name: string
  basePrice: number      // за 1–2 человека (гид + трансфер включены)
  extraAdult: number     // доп. взрослый
  extraChild: number     // доп. ребёнок
  maxPax?: number
  note?: string
  duration?: string
}

const PRIVATE_TOURS: PrivateTour[] = [
  { id:"pt1",  name:"Amazing Phang Nga 1-day",            basePrice:19000, extraAdult:1500,  extraChild:1500, duration:"1 день" },
  { id:"pt2",  name:"Cheow Lan Overnight",                basePrice:38000, extraAdult:5000,  extraChild:5000, duration:"2 дня/1 ночь" },
  { id:"pt3",  name:"Rafting Individual",                 basePrice:18000, extraAdult:1500,  extraChild:1500, duration:"1 день" },
  { id:"pt4",  name:"Asia Safari 1-day",                  basePrice:17000, extraAdult:1100,  extraChild:1100, duration:"1 день" },
  { id:"pt5",  name:"Avatar Individual",                  basePrice:20000, extraAdult:3500,  extraChild:3000, duration:"1 день" },
  { id:"pt6",  name:"Mantra Individual",                  basePrice:20000, extraAdult:4200,  extraChild:3800, duration:"1 день" },
  { id:"pt7",  name:"Mantra Forest Spa – Day Pass",       basePrice:10800, extraAdult:1400,  extraChild:1400, maxPax:12, duration:"1 день", note:"Максимум 12 человек" },
  { id:"pt8",  name:"Jungle Escape 2/1",                  basePrice:38500, extraAdult:6000,  extraChild:6000, duration:"2 дня/1 ночь", note:"Single room +1500 ฿" },
  { id:"pt9",  name:"Moonlight",                          basePrice:20000, extraAdult:3900,  extraChild:3500, duration:"1 день" },
]

function PrivateTab({dark}:{dark:boolean}) {
  const t = {
    bg:dark?"#0b1120":"#f0f4f8", card:dark?"#131d2e":"#ffffff",
    cardBorder:dark?"#1e2f45":"#d1dce8", text:dark?"#e2eaf4":"#1a2636",
    muted:dark?"#5b7a9a":"#6e8aa8", accent:dark?"#a78bfa":"#7c3aed",
    header:dark?"#0d1929":"#e2ecf7", inputBg:dark?"#101c2d":"#ffffff",
    inputBdr:dark?"#1e3450":"#c5d5e5", row0:dark?"transparent":"#fafafa",
    row1:dark?"rgba(255,255,255,0.02)":"#f0f4f8",
  }

  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const [copiedId, setCopiedId] = useState<string|null>(null)
  const [search, setSearch] = useState("")

  const selectedTour = PRIVATE_TOURS.find(t=>t.id===selectedId)

  function calcTotal(tour: PrivateTour, ad: number, ch: number) {
    const baseIncludes = 2
    const extraAd = Math.max(0, ad - baseIncludes)
    const totalAdultExtra = extraAd * tour.extraAdult
    const totalChildExtra = ch * tour.extraChild
    return tour.basePrice + totalAdultExtra + totalChildExtra
  }

  function buildWA(tour: PrivateTour, ad: number, ch: number) {
    const total = calcTotal(tour, ad, ch)
    const totalPax = ad + ch
    const lines = [
      `🏝 *${tour.name}*`,
      `${tour.duration ? "⏱ " + tour.duration : ""}`,
      ``,
      `👥 Взрослых: ${ad}${ch>0?" | Детей: "+ch:""}`,
      ``,
      `💰 *Итого: ${total.toLocaleString("ru-RU")} ฿*`,
      totalPax > 0 ? `📊 На человека: ~${Math.round(total/totalPax).toLocaleString("ru-RU")} ฿` : "",
      ``,
      `✅ Гид включён`,
      `✅ Трансфер включён`,
      tour.note ? `ℹ️ ${tour.note}` : "",
    ].filter(Boolean).join("\n")
    return lines
  }

  function copyWA(tour: PrivateTour) {
    navigator.clipboard.writeText(buildWA(tour, adults, children)).then(()=>{
      setCopiedId(tour.id); setTimeout(()=>setCopiedId(null), 1800)
    })
  }

  const filtered = PRIVATE_TOURS.filter(t=>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  const inp: React.CSSProperties = {
    padding:"9px 12px", borderRadius:"10px", border:`1px solid ${t.inputBdr}`,
    background:t.inputBg, color:t.text, fontSize:"13px", fontWeight:600,
    outline:"none", width:"100%", boxSizing:"border-box"
  }

  const totalPax = adults + children
  const accentColor = "#a78bfa"

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 110px)",overflow:"hidden"}}>

      {/* Toolbar */}
      <div style={{background:t.header,borderBottom:`1px solid ${t.cardBorder}`,padding:"10px 12px",flexShrink:0}}>
        <div style={{fontSize:"14px",fontWeight:800,color:accentColor,marginBottom:"2px"}}>🏝 Приватные туры</div>
        <div style={{fontSize:"11px",color:t.muted,marginBottom:"10px"}}>Цена за 1–2 чел. · гид включён · трансфер включён</div>

        {/* PAX counter */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"10px"}}>
          {[
            {label:"👤 Взрослые", value:adults, set:setAdults, min:1},
            {label:"👶 Дети",    value:children, set:setChildren, min:0},
          ].map(({label,value,set,min})=>(
            <div key={label} style={{background:t.card,borderRadius:"10px",border:`1px solid ${t.cardBorder}`,padding:"8px 12px"}}>
              <div style={{fontSize:"11px",color:t.muted,marginBottom:"6px"}}>{label}</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <button onClick={()=>set(Math.max(min,value-1))}
                  style={{width:"30px",height:"30px",borderRadius:"8px",border:"none",background:accentColor+"22",color:accentColor,fontSize:"18px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontSize:"20px",fontWeight:800,color:t.text}}>{value}</span>
                <button onClick={()=>set(value+1)}
                  style={{width:"30px",height:"30px",borderRadius:"8px",border:"none",background:accentColor+"22",color:accentColor,fontSize:"18px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          ))}
        </div>

        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Поиск по туру..."
          style={{...inp}}/>
      </div>

      {/* Tour list */}
      <div style={{overflowY:"auto",flex:1,padding:"12px 14px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {filtered.map(tour=>{
            const total = calcTotal(tour, adults, children)
            const isSelected = selectedId === tour.id
            const extraAd = Math.max(0, adults-2)
            const isCopied = copiedId === tour.id

            return (
              <div key={tour.id}
                style={{background:t.card,borderRadius:"14px",border:`1.5px solid ${isSelected?accentColor:t.cardBorder}`,overflow:"hidden",transition:"border-color 0.2s",boxShadow:isSelected?`0 0 0 2px ${accentColor}33`:"none"}}>

                {/* Card header — always visible */}
                <div onClick={()=>setSelectedId(isSelected?null:tour.id)}
                  style={{cursor:"pointer",padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,paddingRight:"8px"}}>
                    <div style={{fontSize:"14px",fontWeight:800,color:isSelected?accentColor:t.text,lineHeight:1.3}}>{tour.name}</div>
                    <div style={{display:"flex",gap:"8px",marginTop:"4px",flexWrap:"wrap"}}>
                      {tour.duration && <span style={{fontSize:"10px",color:t.muted}}>⏱ {tour.duration}</span>}
                      {tour.maxPax && <span style={{fontSize:"10px",color:"#f59e0b"}}>👥 макс. {tour.maxPax}</span>}
                    </div>
                    {tour.note && (
                      <div style={{fontSize:"10px",color:"#f59e0b",marginTop:"3px"}}>ℹ️ {tour.note}</div>
                    )}
                  </div>
                  <div style={{textAlign:"right" as any,flexShrink:0}}>
                    <div style={{fontSize:"18px",fontWeight:800,color:accentColor}}>{total.toLocaleString("ru-RU")} ฿</div>
                    {totalPax>0 && <div style={{fontSize:"10px",color:t.muted}}>~{Math.round(total/totalPax).toLocaleString("ru-RU")} ฿/чел</div>}
                  </div>
                </div>

                {/* Expanded */}
                {isSelected && (
                  <div style={{borderTop:`1px solid ${t.cardBorder}`,padding:"10px 14px",background:dark?"rgba(0,0,0,0.15)":"rgba(0,0,0,0.02)"}}>

                    {/* Breakdown */}
                    <div style={{borderRadius:"8px",overflow:"hidden",border:`1px solid ${accentColor}33`,marginBottom:"10px"}}>
                      <div style={{background:accentColor+"18",padding:"6px 10px",fontSize:"10px",fontWeight:800,color:accentColor,textTransform:"uppercase" as any,letterSpacing:"0.5px"}}>
                        Расчёт
                      </div>
                      {[
                        {label:`🏝 База (1–2 чел.)`, amount: tour.basePrice},
                        ...(extraAd>0 ? [{label:`👤 Доп. взрослых: ${extraAd} × ${tour.extraAdult.toLocaleString("ru-RU")} ฿`, amount: extraAd*tour.extraAdult}] : []),
                        ...(children>0 ? [{label:`👶 Детей: ${children} × ${tour.extraChild.toLocaleString("ru-RU")} ฿`, amount: children*tour.extraChild}] : []),
                      ].map((row,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",background:i%2===0?t.row0:t.row1,borderTop:i===0?"none":`1px solid ${dark?"rgba(255,255,255,0.05)":"#f0f0f0"}`}}>
                          <span style={{fontSize:"12px",color:t.text}}>{row.label}</span>
                          <span style={{fontSize:"12px",fontWeight:700,color:accentColor}}>{row.amount.toLocaleString("ru-RU")} ฿</span>
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:accentColor+"18",borderTop:`1px solid ${accentColor}44`}}>
                        <span style={{fontSize:"13px",fontWeight:800,color:accentColor}}>ИТОГО</span>
                        <span style={{fontSize:"16px",fontWeight:800,color:accentColor}}>{total.toLocaleString("ru-RU")} ฿</span>
                      </div>
                    </div>

                    {/* Included */}
                    <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"10px"}}>
                      {["✅ Гид включён","✅ Трансфер включён"].map(s=>(
                        <span key={s} style={{fontSize:"11px",color:"#4ade80",background:"#4ade8018",padding:"3px 8px",borderRadius:"6px",border:"1px solid #4ade8044"}}>{s}</span>
                      ))}
                    </div>

                    {/* Extra info */}
                    <div style={{background:t.header,borderRadius:"8px",padding:"8px 10px",marginBottom:"10px",fontSize:"11px",color:t.muted}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
                        <span>👤 Доп. взрослый:</span><span style={{color:t.text,fontWeight:700}}>{tour.extraAdult.toLocaleString("ru-RU")} ฿</span>
                        <span>👶 Доп. ребёнок:</span><span style={{color:t.text,fontWeight:700}}>{tour.extraChild.toLocaleString("ru-RU")} ฿</span>
                      </div>
                    </div>

                    <button onClick={()=>copyWA(tour)}
                      style={{width:"100%",background:isCopied?"#16a34a":"#25d366",color:"#fff",border:"none",borderRadius:"8px",padding:"10px",fontSize:"13px",fontWeight:700,cursor:"pointer",transition:"background 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
                      {isCopied ? "✅ Скопировано!" : <><span>📤</span> Скопировать для WhatsApp</>}
                    </button>

                    <button onClick={()=>setSelectedId(null)}
                      style={{marginTop:"6px",width:"100%",background:"transparent",border:`1px solid ${t.cardBorder}`,borderRadius:"8px",padding:"7px",fontSize:"12px",color:t.muted,cursor:"pointer",fontWeight:600}}>
                      Свернуть ▲
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function VIPCalcTab({dark}: {dark:boolean}) {
  const t = {
    bg:    dark?"#0b1120":"#f0f4f8",
    card:  dark?"#131d2e":"#ffffff",
    cardBorder: dark?"#1e2f45":"#d1dce8",
    text:  dark?"#e2eaf4":"#1a2636",
    muted: dark?"#5b7a9a":"#6e8aa8",
    accent:"#f59e0b",
    gold:  dark?"#fde68a":"#d97706",
    header:dark?"#0d1929":"#fefce8",
    inputBg:  dark?"#101c2d":"#ffffff",
    inputBdr: dark?"#1e3450":"#c5d5e5",
  }

  const [adults,   setAdults]   = useState(2)
  const [children, setChildren] = useState(0)
  const [extraLoc, setExtraLoc] = useState(0)
  const [selected, setSelected] = useState<Record<string,boolean>>({})
  const [waText,   setWaText]   = useState<string|null>(null)

  const totalPax = adults + children

  // Cost calculation
  let base = 5000 + 1000 // минивэн + гид
  base += extraLoc * 1000  // доп. локации сверх 2 бесплатных

  const attrRows: {label:string; amount:number}[] = []
  let attrTotal = 0

  VIP_ATTRACTIONS.forEach(a => {
    if (!selected[a.id]) return
    let amount = 0
    if (a.fixed) {
      amount = a.adultPrice
    } else if (a.hasChild) {
      amount = adults * a.adultPrice + children * a.childPrice
    } else {
      amount = totalPax * a.adultPrice
    }
    attrRows.push({label: a.label, amount})
    attrTotal += amount
  })

  const grandTotal = base + attrTotal

  function toggle(id: string) {
    setSelected(s => ({...s, [id]: !s[id]}))
  }

  function buildWA() {
    const lines: string[] = []
    lines.push("👑 *VIP тур — расчёт стоимости*")
    lines.push(`👥 Взрослых: ${adults} · Детей: ${children}`)
    lines.push("")
    lines.push("💼 *База:*")
    lines.push(`• Минивэн: 5 000 ฿`)
    lines.push(`• Гид: 1 000 ฿`)
    if (extraLoc > 0) lines.push(`• Доп. локации (×${extraLoc}): ${(extraLoc*1000).toLocaleString("ru-RU")} ฿`)
    if (attrRows.length > 0) {
      lines.push("")
      lines.push("🎫 *Аттракционы (оплата на месте):*")
      attrRows.forEach(r => lines.push(`• ${r.label}: ${r.amount.toLocaleString("ru-RU")} ฿`))
    }
    lines.push("")
    lines.push(`💰 *ИТОГО: ${grandTotal.toLocaleString("ru-RU")} ฿*`)
    if (totalPax > 0) lines.push(`👤 На человека: ${Math.round(grandTotal/totalPax).toLocaleString("ru-RU")} ฿`)
    lines.push("")
    lines.push("🌴 Navigator-Sayama Travel")
    setWaText(lines.join("\n"))
  }

  const selStyle: React.CSSProperties = {
    width:"100%", padding:"10px 12px", borderRadius:"10px",
    border:`1px solid ${t.inputBdr}`, background:t.inputBg,
    color:t.text, fontSize:"13px", fontWeight:600, outline:"none", boxSizing:"border-box"
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 110px)",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:dark?"#1a1000":"#fefce8",borderBottom:`1px solid #d9770644`,padding:"12px 16px",flexShrink:0}}>
        <div style={{fontSize:"15px",fontWeight:800,color:"#d97706"}}>👑 VIP Tour Calculator</div>
        <div style={{fontSize:"11px",color:t.muted,marginTop:"1px"}}>
          База: минивэн 5 000 ฿ + гид 1 000 ฿ · 2 локации бесплатно
        </div>
      </div>

      {/* Body */}
      <div style={{overflowY:"auto",flex:1,padding:"12px 14px"}}>

        {/* PAX */}
        <div style={{background:t.card,border:`1px solid ${t.cardBorder}`,borderRadius:"12px",padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"10px"}}>👥 Количество гостей</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            <div>
              <div style={{fontSize:"11px",color:t.muted,marginBottom:"4px"}}>Взрослых</div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <button onClick={()=>setAdults(Math.max(1,adults-1))} style={{width:"30px",height:"30px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:t.inputBg,color:t.text,fontSize:"16px",cursor:"pointer",fontWeight:700}}>−</button>
                <span style={{fontSize:"18px",fontWeight:800,color:t.gold,minWidth:"24px",textAlign:"center" as any}}>{adults}</span>
                <button onClick={()=>setAdults(adults+1)} style={{width:"30px",height:"30px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:t.inputBg,color:t.text,fontSize:"16px",cursor:"pointer",fontWeight:700}}>+</button>
              </div>
            </div>
            <div>
              <div style={{fontSize:"11px",color:t.muted,marginBottom:"4px"}}>Детей</div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <button onClick={()=>setChildren(Math.max(0,children-1))} style={{width:"30px",height:"30px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:t.inputBg,color:t.text,fontSize:"16px",cursor:"pointer",fontWeight:700}}>−</button>
                <span style={{fontSize:"18px",fontWeight:800,color:t.gold,minWidth:"24px",textAlign:"center" as any}}>{children}</span>
                <button onClick={()=>setChildren(children+1)} style={{width:"30px",height:"30px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:t.inputBg,color:t.text,fontSize:"16px",cursor:"pointer",fontWeight:700}}>+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Extra locations */}
        <div style={{background:t.card,border:`1px solid ${t.cardBorder}`,borderRadius:"12px",padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"6px"}}>📍 Доп. локации (сверх 2 бесплатных)</div>
          <div style={{fontSize:"11px",color:t.muted,marginBottom:"8px"}}>+1 000 ฿ за каждую дополнительную</div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <button onClick={()=>setExtraLoc(Math.max(0,extraLoc-1))} style={{width:"34px",height:"34px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:t.inputBg,color:t.text,fontSize:"18px",cursor:"pointer",fontWeight:700}}>−</button>
            <div style={{textAlign:"center" as any}}>
              <div style={{fontSize:"22px",fontWeight:900,color:t.gold}}>{extraLoc}</div>
              {extraLoc>0 && <div style={{fontSize:"10px",color:t.muted}}>+{(extraLoc*1000).toLocaleString("ru-RU")} ฿</div>}
            </div>
            <button onClick={()=>setExtraLoc(extraLoc+1)} style={{width:"34px",height:"34px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:t.inputBg,color:t.text,fontSize:"18px",cursor:"pointer",fontWeight:700}}>+</button>
          </div>
        </div>

        {/* Attractions */}
        <div style={{background:t.card,border:`1px solid ${t.cardBorder}`,borderRadius:"12px",padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",fontWeight:700,color:t.muted,textTransform:"uppercase" as any,letterSpacing:"0.6px",marginBottom:"10px"}}>🎫 Аттракционы (оплата на месте)</div>
          {VIP_ATTRACTIONS.map(a => {
            const active = !!selected[a.id]
            let priceLabel = ""
            if (a.fixed) {
              priceLabel = `${a.adultPrice.toLocaleString("ru-RU")} ฿ (фикс.)`
            } else if (a.hasChild) {
              priceLabel = `взр. ${a.adultPrice}/дет. ${a.childPrice} ฿`
            } else {
              priceLabel = `${a.adultPrice.toLocaleString("ru-RU")} ฿/чел`
            }
            let calcAmount = 0
            if (active) {
              if (a.fixed) calcAmount = a.adultPrice
              else if (a.hasChild) calcAmount = adults*a.adultPrice + children*a.childPrice
              else calcAmount = totalPax * a.adultPrice
            }
            return (
              <div key={a.id} onClick={()=>toggle(a.id)}
                style={{display:"flex",alignItems:"center",gap:"10px",padding:"9px 10px",borderRadius:"9px",cursor:"pointer",marginBottom:"5px",border:`1px solid ${active?"#d97706":t.cardBorder}`,background:active?(dark?"#2d1f00":"#fffbeb"):"transparent",transition:"all 0.15s"}}>
                <div style={{width:"20px",height:"20px",borderRadius:"6px",border:`2px solid ${active?"#d97706":t.muted}`,background:active?"#d97706":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                  {active && <span style={{color:"#fff",fontSize:"11px",fontWeight:900}}>✓</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"12px",color:t.text,fontWeight:500,lineHeight:1.3}}>{a.label}</div>
                  <div style={{fontSize:"10px",color:t.muted,marginTop:"1px"}}>{priceLabel}</div>
                </div>
                {active && calcAmount > 0 && (
                  <div style={{fontSize:"12px",fontWeight:700,color:"#d97706",flexShrink:0}}>{calcAmount.toLocaleString("ru-RU")} ฿</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky total footer */}
      <div style={{background:dark?"#1a1000":"#fffbeb",borderTop:`2px solid #d97706`,padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
          <div style={{fontSize:"11px",color:t.muted}}>База (минивэн + гид{extraLoc>0?` + ${extraLoc} лок.`:""})</div>
          <div style={{fontSize:"12px",fontWeight:700,color:t.muted}}>{base.toLocaleString("ru-RU")} ฿</div>
        </div>
        {attrRows.map((r,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:t.text,marginBottom:"2px"}}>
            <span style={{opacity:0.7,flex:1,marginRight:"8px"}}>{r.label}</span>
            <span style={{fontWeight:600,flexShrink:0}}>{r.amount.toLocaleString("ru-RU")} ฿</span>
          </div>
        ))}
        <div style={{borderTop:`1px solid #d9770644`,marginTop:"8px",paddingTop:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:"10px",color:t.muted}}>ИТОГО за {totalPax} чел.</div>
            <div style={{fontSize:"28px",fontWeight:900,color:"#d97706",letterSpacing:"-0.5px"}}>{grandTotal.toLocaleString("ru-RU")} <span style={{fontSize:"16px"}}>฿</span></div>
          </div>
          <div style={{textAlign:"right" as any}}>
            {totalPax > 0 && <>
              <div style={{fontSize:"10px",color:t.muted}}>НА ЧЕЛОВЕКА</div>
              <div style={{fontSize:"20px",fontWeight:800,color:"#d97706"}}>{Math.round(grandTotal/totalPax).toLocaleString("ru-RU")} ฿</div>
            </>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"10px"}}>
          <button onClick={()=>{setAdults(2);setChildren(0);setExtraLoc(0);setSelected({});setWaText(null)}}
            style={{padding:"9px",borderRadius:"10px",border:`1px solid ${t.cardBorder}`,background:t.inputBg,color:t.muted,fontSize:"12px",fontWeight:700,cursor:"pointer"}}>
            🔄 Сбросить
          </button>
          <button onClick={buildWA}
            style={{padding:"9px",borderRadius:"10px",border:"none",background:"#25d366",color:"#fff",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>
            📤 WhatsApp
          </button>
        </div>
      </div>

      {/* WA Modal */}
      {waText && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={()=>setWaText(null)}>
          <div style={{background:t.card,border:`1px solid ${t.cardBorder}`,borderRadius:"16px",padding:"20px",width:"100%",maxWidth:"400px",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}} onClick={(e:React.MouseEvent)=>e.stopPropagation()}>
            <div style={{fontSize:"15px",fontWeight:800,color:t.text,marginBottom:"12px"}}>📤 Отправить в WhatsApp</div>
            <textarea readOnly value={waText} rows={12}
              style={{width:"100%",padding:"10px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:t.inputBg,color:t.text,fontSize:"11px",resize:"none",outline:"none",boxSizing:"border-box" as any,fontFamily:"monospace",lineHeight:1.5}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"12px"}}>
              <button onClick={()=>{navigator.clipboard?.writeText(waText);setWaText(null)}}
                style={{padding:"10px",borderRadius:"10px",border:"none",background:"#0891b2",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer"}}>
                📋 Скопировать
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer"
                style={{padding:"10px",borderRadius:"10px",background:"#25d366",color:"#fff",fontSize:"13px",fontWeight:700,cursor:"pointer",display:"block",textAlign:"center" as any,textDecoration:"none"}}>
                Открыть WhatsApp →
              </a>
            </div>
            <button onClick={()=>setWaText(null)} style={{marginTop:"8px",width:"100%",padding:"8px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:"transparent",color:t.muted,fontSize:"12px",cursor:"pointer"}}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  const [unlocked, setUnlocked] = useState(false)
  const [pwInput, setPwInput] = useState("")
  const [pwError, setPwError] = useState(false)
  const [tab,setTab]=useState<"transfers"|"excursions"|"log"|"methodichka"|"boats"|"boatsummer"|"vipcalc"|"private">("transfers")
  const [log,setLog]=useState<LogEntry[]>([])
  const [transferData,setTransferData]=useState<Voucher[]>([])
  const [notifiedVouchers,setNotifiedVouchers]=useState<Record<string,boolean>>({})
  const [touristSearch,setTouristSearch]=useState("")
  const [selectedGuide,setSelectedGuide]=useState("")
  const [selectedOperator,setSelectedOperator]=useState("")
  const [collapsedDates,setCollapsedDates]=useState<Record<string,boolean>>({})
  const [transferFileName,setTransferFileName]=useState("")
  const [transferLoadTime,setTransferLoadTime]=useState<number>(()=>{
    try{return Number(localStorage.getItem("navTransferTime"))||0}catch{return 0}
  })
  const [excLoadTime,setExcLoadTime]=useState<number>(()=>{
    try{return Number(localStorage.getItem("navExcTime"))||0}catch{return 0}
  })
  function markTransferLoaded(){const now=Date.now();setTransferLoadTime(now);localStorage.setItem("navTransferTime",String(now))}
  function markExcLoaded(){const now=Date.now();setExcLoadTime(now);localStorage.setItem("navExcTime",String(now))}
  function dataAge(ts:number):{hours:number;stale:boolean}{
    if(!ts)return{hours:0,stale:false}
    const h=(Date.now()-ts)/3600000
    return{hours:Math.floor(h),stale:h>=20}
  }

  const [excursionData,setExcursionData]=useState<Excursion[]>([])
  const [notifiedExcursions,setNotifiedExcursions]=useState<Record<string,boolean>>({})
  const [excSearch,setExcSearch]=useState("")
  const [excGuide,setExcGuide]=useState("")
  const [excFileName,setExcFileName]=useState("")
  const [collapsedTypes,setCollapsedTypes]=useState<Record<string,boolean>>({})

  const [dark,setDark]=useState(true)
  const [showTop,setShowTop]=useState(false)
  const [copiedMsg,setCopiedMsg]=useState("")
  const [logSearch,setLogSearch]=useState("")
  const [logType,setLogType]=useState<"all"|"transfer"|"excursion">("all")
  const [showSettings,setShowSettings]=useState(false)
  const [guideName,setGuideName]=useState<string>(()=>{
    try{return localStorage.getItem("navGuideName")||""}catch{return ""}
  })
  function saveGuideName(name:string){
    setGuideName(name)
    localStorage.setItem("navGuideName",name)
  }
  function copyMessage(text:string,id:string){
    navigator.clipboard?.writeText(decodeURIComponent(text)).then(()=>{
      setCopiedMsg(id);setTimeout(()=>setCopiedMsg(""),1500)
    })
  }
  function exportBackup(){
    const KEYS=["transferData","excursionData","notifiedVouchers","notifiedExcursions","navLog","nav_mtours_data","nav_boats_data","nav_boats_pinned","nav_summer_data","navDark","navTransferTime","navExcTime"]
    const backup:Record<string,any>={_meta:{app:"Navigator",version:1,date:new Date().toISOString()}}
    KEYS.forEach(k=>{const val=localStorage.getItem(k);if(val!==null)backup[k]=val})
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"})
    const url=URL.createObjectURL(blob)
    const a=document.createElement("a")
    const d=new Date()
    a.href=url;a.download=`navigator-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}.json`
    a.click();URL.revokeObjectURL(url)
  }
  function importBackup(ev:React.ChangeEvent<HTMLInputElement>){
    const file=ev.target.files?.[0];if(!file)return
    const reader=new FileReader()
    reader.onload=()=>{
      try{
        const data=JSON.parse(String(reader.result))
        if(!data._meta||data._meta.app!=="Navigator"){alert("Это не файл бэкапа Navigator");return}
        Object.entries(data).forEach(([k,val])=>{
          if(k==="_meta")return
          localStorage.setItem(k,String(val))
        })
        alert("✅ Данные восстановлены! Страница перезагрузится.")
        location.reload()
      }catch{alert("Ошибка чтения файла")}
    }
    reader.readAsText(file)
    ev.target.value=""
  }
  useEffect(()=>{
    const fn=()=>setShowTop(window.scrollY>300)
    window.addEventListener("scroll",fn,{passive:true})
    return()=>window.removeEventListener("scroll",fn)
  },[])

  // Dark mode schedule: auto-switch after 20:00 and before 07:00
  useEffect(()=>{
    const dk=localStorage.getItem("navDark")
    if(dk!==null){ setDark(dk==="1"); return }
    const h=new Date().getHours()
    setDark(h>=20||h<7)
  },[])

  // Swipe gesture between tabs
  const TAB_ORDER: Array<"transfers"|"excursions"|"log"|"methodichka"|"boats"|"boatsummer"|"vipcalc"|"private"> =
    ["transfers","excursions","methodichka","boats","boatsummer","vipcalc","private","log"]
  const swipeRef = useRef<{x:number;y:number}|null>(null)
  function onTouchStart(e:React.TouchEvent){ swipeRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY} }
  function onTouchEnd(e:React.TouchEvent){
    if(!swipeRef.current)return
    const dx=e.changedTouches[0].clientX-swipeRef.current.x
    const dy=e.changedTouches[0].clientY-swipeRef.current.y
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){
      const idx=TAB_ORDER.indexOf(tab)
      if(dx<0&&idx<TAB_ORDER.length-1)setTab(TAB_ORDER[idx+1])
      if(dx>0&&idx>0)setTab(TAB_ORDER[idx-1])
    }
    swipeRef.current=null
  }

  useEffect(() => {
    if (localStorage.getItem("navAuth") === APP_PASSWORD) setUnlocked(true)
  }, [])

  function handleLogin() {
    if (pwInput === APP_PASSWORD) {
      localStorage.setItem("navAuth", APP_PASSWORD)
      setUnlocked(true)
      setPwError(false)
    } else {
      setPwError(true)
      setPwInput("")
    }
  }

  function addLog(type:"transfer"|"excursion", name:string, phone:string, hotel:string, voucherId:string) {
    const now = new Date()
    const entry: LogEntry = {
      id: now.getTime().toString(),
      time: now.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}),
      date: now.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"}),
      type, name, phone, hotel, voucherId
    }
    setLog(prev => {
      const updated = [entry, ...prev]
      localStorage.setItem("navLog", JSON.stringify(updated))
      return updated
    })
  }

  useEffect(()=>{
    const d=localStorage.getItem("transferData"),n=localStorage.getItem("notifiedVouchers")
    const e=localStorage.getItem("excursionData"),ne=localStorage.getItem("notifiedExcursions")
    if(d)setTransferData(JSON.parse(d));if(n)setNotifiedVouchers(JSON.parse(n))
    if(e)setExcursionData(JSON.parse(e));if(ne)setNotifiedExcursions(JSON.parse(ne))
    const lg=localStorage.getItem("navLog");if(lg)setLog(JSON.parse(lg))
  },[])

  useEffect(()=>{localStorage.setItem("notifiedVouchers",JSON.stringify(notifiedVouchers))},[notifiedVouchers])
  useEffect(()=>{localStorage.setItem("notifiedExcursions",JSON.stringify(notifiedExcursions))},[notifiedExcursions])
  useEffect(()=>{localStorage.setItem("navDark",dark?"1":"0")},[dark])

  const t={
    bg:dark?"#0b1120":"#f0f4f8",card:dark?"#131d2e":"#ffffff",
    cardBorder:dark?"#1e2f45":"#d1dce8",text:dark?"#e2eaf4":"#1a2636",
    muted:dark?"#5b7a9a":"#6e8aa8",accent:dark?"#38bdf8":"#0369a1",
    header:dark?"#0d1929":"#e2ecf7",inputBg:dark?"#101c2d":"#ffffff",
    inputBdr:dark?"#1e3450":"#c5d5e5",
  }

  function handleTransferFile(e:any) {
    const file=e.target.files[0];if(!file)return
    setTransferFileName(file.name);markTransferLoaded()
    const reader=new FileReader()
    reader.onload=(evt:any)=>{
      try{
        const bytes=new Uint8Array(evt.target.result)
        const wb=XLSX.read(bytes,{type:"array"})
        const sheet=wb.Sheets[wb.SheetNames[0]]
        const rows:any[][]=XLSX.utils.sheet_to_json(sheet,{header:1,defval:""})

        // ── Умный детектор колонок по заголовкам ──────────────────────────
        // Находим строку заголовков (содержит "Res No") и строку под-заголовков
        let hRow1:any[]=[], hRow2:any[]=[]
        for(let i=0;i<rows.length;i++){
          if(rows[i].some((c:any)=>String(c).trim()==="Res No")){
            hRow1=rows[i]; hRow2=rows[i+1]||[]; break
          }
        }
        // Вспомогательная функция поиска индекса по точному совпадению
        const fc2=(needle:string,inRow:any[],startFrom=0)=>
          inRow.findIndex((c:any,i:number)=>i>=startFrom&&String(c||"").trim().toLowerCase()===needle.toLowerCase())
        // Вспомогательная функция поиска по вхождению
        const fc2inc=(needle:string,inRow:any[],startFrom=0,endAt=999)=>
          inRow.findIndex((c:any,i:number)=>i>=startFrom&&i<endAt&&String(c||"").toLowerCase().includes(needle.toLowerCase()))

        // Колонки из строки 1 заголовков
        const cResNo     = fc2("Res No",   hRow1)            // C ≈ 2
        const cTO        = fc2("TO",       hRow1)            // D ≈ 3
        const cTourist   = fc2inc("Tourist name", hRow1)     // E ≈ 4
        const cPhone1    = fc2inc("Tourist phone", hRow1, 0, 15)  // I ≈ 8
        const cPhone2    = fc2inc("Tourist phone", hRow1, 15)     // Z ≈ 25
        const cGuide     = fc2inc("Guide",  hRow1)           // R ≈ 17

        // Секции в строке 1
        const secDepInfo  = fc2inc("Departure info",          hRow1) // ≈ 19
        const secDepFlt   = fc2inc("Dep. flight",             hRow1) // ≈ 26
        const secBackFlt  = fc2inc("Back international",      hRow1) // ≈ 28

        // Колонки из строки 2 (под-заголовки), привязаны к секциям
        const cDepTransfer= fc2("Transfer", hRow2, secDepInfo>=0?secDepInfo:19) // U ≈ 20
        const cDepDate    = fc2inc("Dep. date",  hRow2, secDepInfo>=0?secDepInfo:19) // V ≈ 21
        const cDepTime    = fc2inc("Dep. time",  hRow2, secDepInfo>=0?secDepInfo:19) // X ≈ 23
        const cDepFltNo   = fc2("No",   hRow2, secDepFlt>=0?secDepFlt:26)       // AA ≈ 26
        const cDepFltTime = fc2("Time", hRow2, cDepFltNo>=0?cDepFltNo+1:27)     // AB ≈ 27
        const cBackFltNo  = fc2("No",   hRow2, secBackFlt>=0?secBackFlt:28)     // AC ≈ 28
        const cBackFltDate= fc2("Date", hRow2, cBackFltNo>=0?cBackFltNo+1:29)   // AD ≈ 29

        // Финальные индексы (с фоллбэком на известные позиции)
        const iResNo   = cResNo>=0       ? cResNo      : 2
        const iTO      = cTO>=0          ? cTO         : 3
        const iTitle   = cTourist>=0     ? cTourist    : 4   // MR/MRS/CHD
        const iName    = cTourist>=0     ? cTourist+1  : 5   // фамилия имя
        const iPhone1  = cPhone1>=0      ? cPhone1     : 8
        const iPhone2  = cPhone2>=0      ? cPhone2     : 25
        const iDepTr   = cDepTransfer>=0 ? cDepTransfer: 20
        const iDepDate = cDepDate>=0     ? cDepDate    : 21
        const iPickup  = cDepTime>=0     ? cDepTime    : 23
        const iFltTime = cDepFltTime>=0  ? cDepFltTime : 27
        const iFltNo   = cBackFltNo>=0   ? cBackFltNo  : 28
        const iFltDate = cBackFltDate>=0 ? cBackFltDate: 29
        // ─────────────────────────────────────────────────────────────────

        const vouchers:Record<string,Voucher>={};let currentHotel="Отель не определен",currentGuide="Гид не указан"
        rows.forEach(row=>{
          if(!row||row.length<5)return
          const fc=String(row[0]||"").trim()
          if(fc.includes("Hotel:")||fc.includes("Check-out:")){
            const rs=row.join(" ")
            const hm=rs.match(/Hotel:\s*(.*?)\s*GUIDE:/i),gm=rs.match(/GUIDE:\s*(.*)/i)
            if(hm)currentHotel=hm[1].trim();if(gm)currentGuide=gm[1].trim();return
          }
          const vId=String(row[iResNo]||"").trim()
          if(!vId||vId.length<5||isNaN(Number(vId)))return
          const pv=formatExcelValue(row[iPickup]),fdv=formatExcelValue(row[iFltDate]),ddv=formatExcelValue(row[iDepDate])
          const toVal=String(row[iTO]||"").trim().toUpperCase()
          const trType=String(row[iDepTr]||"").trim()
          // Составной ключ: ваучер + отель + гид — чтобы один ваучер с разными отелями не терял данные
          const ck=`${vId}||${currentHotel}||${currentGuide}`
          if(!vouchers[ck])vouchers[ck]={vId,hotel:currentHotel,guide:currentGuide,pickup:pv||"—",flightDate:fdv||"—",flightTime:formatExcelValue(row[iFltTime])||"—",flightNo:String(row[iFltNo]||"").trim()||"—",departureDate:ddv||"—",tourists:[],phones:[],touroperator:toVal,transferType:trType}
          if(pv&&vouchers[ck].pickup==="—")vouchers[ck].pickup=pv
          if(fdv&&vouchers[ck].flightDate==="—")vouchers[ck].flightDate=fdv
          if(ddv&&vouchers[ck].departureDate==="—")vouchers[ck].departureDate=ddv
          const fn=`${row[iTitle]} ${row[iName]}`.trim()
          if(fn&&!fn.toLowerCase().includes("tourist")&&!vouchers[ck].tourists.includes(fn))vouchers[ck].tourists.push(fn)
          const phRaw=String(row[iPhone1]||row[iPhone2]||"").replace(/[^\d+]/g,"");const phParts=phRaw.split("+").filter((p:string)=>p.length>=7).map((p:string)=>"+"+p);phParts.forEach((p:string)=>{if(!vouchers[ck].phones.includes(p))vouchers[ck].phones.push(p)})
        })
        const result=Object.values(vouchers).sort((a,b)=>{if(a.pickup==="—"&&b.pickup!=="—")return 1;if(a.pickup!=="—"&&b.pickup==="—")return -1;return a.pickup.localeCompare(b.pickup)})
        setTransferData(result);setNotifiedVouchers({});setCollapsedDates({});setSelectedGuide("")
        localStorage.setItem("transferData",JSON.stringify(result))
      }catch{alert("Ошибка чтения файла трансферов")}
    }
    reader.readAsArrayBuffer(file)
  }

  function handleExcursionFile(e:any) {
    const file=e.target.files[0];if(!file)return
    setExcFileName(file.name);markExcLoaded()
    const reader=new FileReader()
    reader.onload=(evt:any)=>{
      try{
        const bytes=new Uint8Array(evt.target.result)
        const wb=XLSX.read(bytes,{type:"array"})
        const sheet=wb.Sheets[wb.SheetNames[0]]
        const rows:any[][]=XLSX.utils.sheet_to_json(sheet,{header:1,defval:""})
        let headerIdx=-1
        for(let i=0;i<rows.length;i++){const r=rows[i].map((c:any)=>String(c).toLowerCase());if(r.includes("voucher")||r.includes("excursion")){headerIdx=i;break}}
        if(headerIdx<0){alert("Не найдена строка заголовков");return}
        const headers=rows[headerIdx].map((c:any)=>String(c).toLowerCase().trim())
        const col=(name:string)=>headers.findIndex(h=>h.includes(name))
        const cV=col("voucher"),cD=col("date"),cE=col("excursion"),cR=col("room")
        const cN=col("name"),cP=col("phone"),cPu=col("pickup"),cA=col("adl"),cC=col("chd"),cI=col("inf")
        const cH=headers.findIndex(h=>h.includes("hotel")&&!h.includes("guide"))
        const cG=headers.findIndex(h=>h.includes("guide")&&!h.includes("hotel"))
        const cCS=headers.findIndex(h=>h.includes("cooperate")||h.includes("staff"))
        const cTO=headers.findIndex(h=>h.includes("touroperator")||h.includes("tour operator"))
        const map:Record<string,Excursion>={}
        for(let i=headerIdx+1;i<rows.length;i++){
          const row=rows[i]
          const vId=String(row[cV]||"").trim();if(!vId||vId.length<5)continue
          const excName=String(row[cE]||"").trim();if(!excName)continue
          const key=`${vId}_${excName}`
          const phoneRaw=String(row[cP]||"").trim()
          const phone=phoneRaw.replace(/[^\d+]/g,"").split("+").filter((p:string)=>p.length>=7).map((p:string)=>"+"+p).join("|SPLIT|")
          const name=String(row[cN]||"").trim()
          const pickup=String(row[cPu]||"").trim()
          if(!map[key])map[key]={key,vId,date:String(row[cD]||"").trim(),excursionName:excName,excursionType:classifyExcursion(excName),hotel:String(row[cH]||"").trim(),room:String(row[cR]||"").trim(),tourists:[],pickup:pickup||"—",adl:Number(row[cA]||0),chd:Number(row[cC]||0),inf:Number(row[cI]||0),guide:String(row[cG]||"").trim(),cooperateStaff:cCS>=0?String(row[cCS]||"").trim():"",touroperator:cTO>=0?String(row[cTO]||"").trim():""}
          if(pickup&&map[key].pickup==="—")map[key].pickup=pickup
          const phoneParts=phone?phone.split("|SPLIT|").filter((p:string)=>p.length>=7):[]
          const mainPhone=phoneParts[0]||""
          if(name&&!map[key].tourists.find(t=>t.name===name)){
            map[key].tourists.push({name,phone:mainPhone})
            phoneParts.slice(1).forEach((p:string)=>{if(!map[key].tourists.find(t=>t.phone===p))map[key].tourists.push({name:"",phone:p})})
          } else if(name&&mainPhone&&map[key].tourists.find(t=>t.name===name&&!t.phone)){
            const tidx=map[key].tourists.findIndex(t=>t.name===name)
            map[key].tourists[tidx].phone=mainPhone
            phoneParts.slice(1).forEach((p:string)=>{if(!map[key].tourists.find(t=>t.phone===p))map[key].tourists.push({name:"",phone:p})})
          }
        }
        const result=Object.values(map).sort((a,b)=>a.pickup.localeCompare(b.pickup))
        setExcursionData(result);setNotifiedExcursions({});setCollapsedTypes({});setExcGuide("")
        localStorage.setItem("excursionData",JSON.stringify(result))
      }catch{alert("Ошибка чтения файла экскурсий")}
    }
    reader.readAsArrayBuffer(file)
  }

  const guideOptions=useMemo(()=>Array.from(new Set(transferData.map(v=>v.guide).filter(Boolean))).sort(),[transferData])
  const filteredTransfers=useMemo(()=>{
    const q=touristSearch.toLowerCase().trim()
    return transferData.filter(v=>{
      if(selectedGuide&&v.guide!==selectedGuide)return false
      if(selectedOperator==="BIG"&&v.touroperator!=="BIG")return false
      if(selectedOperator==="SAYAMA"&&v.touroperator==="BIG")return false
      if(!q)return true
      return v.vId.toLowerCase().includes(q)||v.tourists.some(t=>t.toLowerCase().includes(q))
    })
  },[transferData,touristSearch,selectedGuide,selectedOperator])

  const groupedTransfers=useMemo(()=>{
    const map:Record<string,Voucher[]>={}
    filteredTransfers.forEach(v=>{const key=v.flightDate==="—"?"📅 Дата не указана":`✈️ ${v.flightDate}`;if(!map[key])map[key]=[];map[key].push(v)})
    return Object.entries(map).sort(([a],[b])=>{
      if(a.includes("не указана"))return 1;if(b.includes("не указана"))return -1
      const pd=(s:string)=>{const m=s.replace("✈️ ","").match(/(\d{2})\.(\d{2})\.(\d{4})/);return m?`${m[3]}${m[2]}${m[1]}`:""}
      return pd(a).localeCompare(pd(b))
    })
  },[filteredTransfers])

  const excGuideOptions=useMemo(()=>Array.from(new Set(excursionData.map(e=>e.guide).filter(Boolean))).sort(),[excursionData])
  const filteredExcursions=useMemo(()=>{
    const q=excSearch.toLowerCase().trim()
    return excursionData.filter(e=>{
      if(excGuide&&e.guide!==excGuide)return false
      if(!q)return true
      return e.vId.toLowerCase().includes(q)||e.tourists.some(t=>t.name.toLowerCase().includes(q))||e.excursionName.toLowerCase().includes(q)
    })
  },[excursionData,excSearch,excGuide])

  const groupedExcursions=useMemo(()=>{
    const map:Partial<Record<ExcursionType,Excursion[]>>={}
    filteredExcursions.forEach(e=>{if(!map[e.excursionType])map[e.excursionType]=[];map[e.excursionType]!.push(e)})
    const order:ExcursionType[]=["sea","dolcevita","evening","jetski","flight","bangkok","twoday","cheolan","land","city","mantra","waterpark","spa","vip","hanuman","fishing","cabaret","elephant","shopping"]
    return order.filter(k=>map[k]).map(k=>[k,map[k]!] as [ExcursionType,Excursion[]])
  },[filteredExcursions])

  function transferBadge(v:Voucher){
    if(v.pickup==="—")return{label:"⚠ УТОЧНИТЬ",bg:"#7f1d1d",color:"#fecaca",border:"#ef4444"}
    if(notifiedVouchers[v.vId])return{label:"✅ Отправлено",bg:dark?"#14532d":"#dcfce7",color:dark?"#4ade80":"#15803d",border:"#16a34a"}
    return{label:"⏳ Ожидает",bg:dark?"#0c2340":"#e0f0ff",color:dark?"#38bdf8":"#0369a1",border:dark?"#1e3f6a":"#93c5fd"}
  }

  const tDone=filteredTransfers.filter(v=>notifiedVouchers[v.vId]).length
  const tPct=filteredTransfers.length?Math.round(tDone/filteredTransfers.length*100):0
  const eDone=filteredExcursions.filter(e=>notifiedExcursions[e.key]).length
  const ePct=filteredExcursions.length?Math.round(eDone/filteredExcursions.length*100):0

  // Password check
  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#060d1a 0%,#0b1829 50%,#060d1a 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif" }}>
        <div style={{ width: "100%", maxWidth: "340px", padding: "0 20px" }}>

          {/* Logo block */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "linear-gradient(135deg,#38bdf8,#0369a1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 32px rgba(56,189,248,0.35)" }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#fff" stroke="none"/>
              </svg>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "#f0f6ff", letterSpacing: "-0.5px" }}>Navigator</div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", letterSpacing: "2px", marginTop: "2px" }}>SAYAMA TRAVEL</div>
          </div>

          {/* Card */}
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "28px 24px", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "13px", color: "#7a9abf", marginBottom: "16px", textAlign: "center" }}>Введите пароль для входа</div>
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false) }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••"
              style={{ width: "100%", padding: "14px 16px", fontSize: "22px", borderRadius: "12px", border: `1.5px solid ${pwError ? "#ef4444" : "rgba(56,189,248,0.25)"}`, background: "rgba(56,189,248,0.06)", color: "#f0f6ff", outline: "none", textAlign: "center", letterSpacing: "8px", boxSizing: "border-box", marginBottom: "8px", transition: "border-color 0.2s" }}
              autoFocus
            />
            {pwError && <div style={{ fontSize: "12px", color: "#f87171", marginBottom: "10px", textAlign: "center" }}>⚠️ Неверный пароль</div>}
            <button onClick={handleLogin} style={{ width: "100%", padding: "14px", fontSize: "15px", fontWeight: 700, borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#38bdf8,#0369a1)", color: "#fff", cursor: "pointer", marginTop: "4px", boxShadow: "0 4px 16px rgba(56,189,248,0.3)", letterSpacing: "0.3px" }}>
              Войти →
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "20px", fontSize: "11px", color: "#3a5a7a", letterSpacing: "0.5px" }}>
            Phuket · Thailand
            <span style={{margin:"0 8px",opacity:0.4}}>|</span>
            v{APP_VERSION}
          </div>
        </div>
      </div>
    )
  }

  const selStyle:React.CSSProperties={flex:1,padding:"9px 12px",fontSize:"13px",borderRadius:"8px",background:t.inputBg,border:`1px solid ${t.inputBdr}`,color:t.text,outline:"none",cursor:"pointer"}
  const inp:React.CSSProperties={flex:1,padding:"9px 12px",fontSize:"13px",borderRadius:"8px",background:t.inputBg,border:`1px solid ${t.inputBdr}`,color:t.text,outline:"none"}

  function exportReport() {
    if (log.length === 0) { alert("Журнал пуст"); return }
    const rows = [
      ["Дата", "Время", "Тип", "Турист", "Телефон", "Отель", "Ваучер"],
      ...log.map(e => [e.date, e.time, e.type==="transfer"?"Трансфер":"Экскурсия", e.name, e.phone, e.hotel, e.voucherId])
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws["!cols"] = [12,8,12,25,16,30,12].map(w=>({wch:w}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Журнал")
    XLSX.writeFile(wb, `navigator_log_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{minHeight:"100vh",background:t.bg,color:t.text,fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif",transition:"background 0.3s,color 0.3s",position:"relative"}}>
      <style>{`
        @keyframes navFadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes navFadeIn { from { opacity:0; } to { opacity:1; } }
        .nav-card { animation: navFadeUp 0.3s ease both; }
        .nav-fade { animation: navFadeIn 0.25s ease both; }
        input:focus, textarea:focus, select:focus { border-color: ${t.accent} !important; box-shadow: 0 0 0 3px ${t.accent}22; }
        button { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${dark?"#1e3450":"#c5d5e5"}; border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
      {showTop&&(
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
          style={{position:"fixed",bottom:"80px",right:"16px",zIndex:200,width:"40px",height:"40px",borderRadius:"50%",background:t.accent,border:"none",cursor:"pointer",fontSize:"20px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.35)",color:"#fff"}}>
          ↑
        </button>
      )}

      {/* ── SETTINGS MODAL ── */}
      {showSettings&&(
        <div className="nav-fade" onClick={()=>setShowSettings(false)}
          style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
          <div onClick={ev=>ev.stopPropagation()}
            style={{background:t.card,borderRadius:"18px",border:`1px solid ${t.cardBorder}`,width:"100%",maxWidth:"380px",maxHeight:"85vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.5)"}}>

            {/* Header */}
            <div style={{padding:"16px 18px",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:t.card,zIndex:2}}>
              <div style={{fontSize:"15px",fontWeight:800,color:t.text}}>Настройки</div>
              <button onClick={()=>setShowSettings(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:t.muted,padding:0,lineHeight:1}}>✕</button>
            </div>

            {/* Guide name */}
            <div style={{padding:"16px 18px",borderBottom:`1px solid ${t.cardBorder}`}}>
              <div style={{fontSize:"11px",fontWeight:700,color:t.muted,letterSpacing:"1px",textTransform:"uppercase" as const,marginBottom:"8px"}}>Имя гида</div>
              <input
                value={guideName}
                onChange={ev=>saveGuideName(ev.target.value)}
                placeholder="Например: Сергей"
                style={{width:"100%",padding:"10px 12px",fontSize:"14px",borderRadius:"10px",border:`1px solid ${t.inputBdr}`,background:t.inputBg,color:t.text,outline:"none",boxSizing:"border-box"}}
              />
              <div style={{fontSize:"11px",color:t.muted,marginTop:"6px",lineHeight:1.5}}>Отображается в шапке приложения</div>
            </div>

            {/* Theme */}
            <div style={{padding:"16px 18px",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:"13px",fontWeight:700,color:t.text}}>Тёмная тема</div>
                <div style={{fontSize:"11px",color:t.muted,marginTop:"2px"}}>Автовключение с 20:00 до 7:00</div>
              </div>
              <button onClick={()=>setDark(d=>!d)}
                style={{width:"48px",height:"28px",borderRadius:"99px",border:"none",cursor:"pointer",background:dark?t.accent:t.cardBorder,position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <span style={{position:"absolute",top:"3px",left:dark?"23px":"3px",width:"22px",height:"22px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
              </button>
            </div>

            {/* Backup */}
            <div style={{padding:"16px 18px",borderBottom:`1px solid ${t.cardBorder}`}}>
              <div style={{fontSize:"11px",fontWeight:700,color:t.muted,letterSpacing:"1px",textTransform:"uppercase" as const,marginBottom:"10px"}}>Данные</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                <button onClick={exportBackup} style={{padding:"10px",fontSize:"12px",fontWeight:700,borderRadius:"10px",border:"none",background:t.accent,color:"#fff",cursor:"pointer"}}>⬇ Резервная копия</button>
                <label style={{padding:"10px",fontSize:"12px",fontWeight:700,borderRadius:"10px",background:t.cardBorder,color:t.text,cursor:"pointer",textAlign:"center"}}>
                  ⬆ Восстановить
                  <input type="file" accept=".json" onChange={importBackup} style={{display:"none"}}/>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div style={{padding:"14px 18px"}}>
              <div style={{textAlign:"center",fontSize:"10px",color:t.muted,letterSpacing:"0.5px"}}>
                NAVIGATOR v{APP_VERSION} · SAYAMA TRAVEL · Phuket
              </div>
            </div>
          </div>
        </div>
      )}

      <header style={{background:dark?"#080f1e":"#ffffff",borderBottom:`1px solid ${t.cardBorder}`,position:"sticky",top:0,zIndex:50,backdropFilter:"blur(12px)",boxShadow:dark?"0 2px 20px rgba(0,0,0,0.4)":"0 2px 12px rgba(0,0,0,0.08)"}}>
        <div style={{maxWidth:"1200px",margin:"0 auto"}}>

          {/* ── Top bar ── */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 0"}}>
            {/* Logo */}
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{width:"36px",height:"36px",borderRadius:"10px",background:"linear-gradient(135deg,#38bdf8,#0369a1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(56,189,248,0.4)"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="#fff" stroke="none"/>
                </svg>
              </div>
              <div>
                <div style={{fontSize:"15px",fontWeight:800,letterSpacing:"-0.3px",color:t.text,lineHeight:1.1}}>Navigator</div>
                <div style={{fontSize:"10px",fontWeight:600,color:t.muted,letterSpacing:"0.3px"}}>{guideName?`${guideName} · SAYAMA`:"SAYAMA TRAVEL"}</div>
              </div>
            </div>

            {/* Right controls */}
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              {tab==="transfers"&&(
                <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",background:t.accent,color:"#fff",padding:"7px 12px",borderRadius:"10px",cursor:"pointer",fontWeight:700,boxShadow:"0 2px 8px rgba(56,189,248,0.3)"}}>
                  📂 <span>{transferFileName ? transferFileName.slice(0,12)+"…" : "Загрузить"}</span>
                  <input type="file" onChange={handleTransferFile} accept=".xlsx,.xls" style={{display:"none"}}/>
                </label>
              )}
              {tab==="excursions"&&(
                <label style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"12px",background:"#7c3aed",color:"#fff",padding:"7px 12px",borderRadius:"10px",cursor:"pointer",fontWeight:700,boxShadow:"0 2px 8px rgba(124,58,237,0.3)"}}>
                  📂 <span>{excFileName ? excFileName.slice(0,12)+"…" : "Загрузить"}</span>
                  <input type="file" onChange={handleExcursionFile} accept=".xlsx,.xls" style={{display:"none"}}/>
                </label>
              )}
              <button onClick={()=>setDark(d=>!d)} title={dark?"Светлая тема":"Тёмная тема"}
                style={{width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",background:t.cardBorder,border:"none",borderRadius:"10px",cursor:"pointer",flexShrink:0}}>
                {dark?"◑":"◐"}
              </button>
              <button onClick={()=>setShowSettings(true)} title="Настройки"
                style={{width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",background:t.cardBorder,border:"none",borderRadius:"10px",cursor:"pointer",flexShrink:0}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={dark?"#7a9abf":"#5a7a9a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
              <WeatherButton dark={dark}/>
              <CurrencyButton dark={dark}/>
            </div>
          </div>

          {/* ── Progress bar (transfers / excursions) ── */}
          {tab==="transfers"&&filteredTransfers.length>0&&(
            <div style={{padding:"8px 16px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:t.muted,marginBottom:"3px"}}>
                <span>✉️ Уведомлено: {tDone} / {filteredTransfers.length}</span>
                <span style={{fontWeight:700,color:tPct===100?"#22c55e":t.muted}}>{tPct}%</span>
              </div>
              <div style={{height:"4px",borderRadius:"99px",background:t.cardBorder,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${tPct}%`,background:"linear-gradient(90deg,#22c55e,#16a34a)",borderRadius:"99px",transition:"width 0.4s ease"}}/>
              </div>
            </div>
          )}
          {tab==="excursions"&&filteredExcursions.length>0&&(
            <div style={{padding:"8px 16px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:t.muted,marginBottom:"3px"}}>
                <span>✉️ Уведомлено: {eDone} / {filteredExcursions.length}</span>
                <span style={{fontWeight:700,color:ePct===100?"#a855f7":t.muted}}>{ePct}%</span>
              </div>
              <div style={{height:"4px",borderRadius:"99px",background:t.cardBorder,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${ePct}%`,background:"linear-gradient(90deg,#a855f7,#7c3aed)",borderRadius:"99px",transition:"width 0.4s ease"}}/>
              </div>
            </div>
          )}

          {/* ── Tab bar ── */}
          <div style={{padding:"6px 12px 10px",overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
            <div style={{display:"flex",gap:"4px",minWidth:"max-content"}}>
            {[
              {key:"transfers",    label:"Трансферы", icon:"✈️", color:"#06b6d4"},
              {key:"excursions",   label:"Экскурсии",  icon:"🗺️", color:"#a855f7"},
              {key:"methodichka",  label:"Методичка",  icon:"📚", color:"#0d9488"},
              {key:"boats",        label:"Лодки",      icon:"🚢", color:"#0891b2"},
              {key:"boatsummer",   label:"Summer",     icon:"🚤", color:"#0e7490"},
              {key:"vipcalc",      label:"VIP",        icon:"👑", color:"#d97706"},
              {key:"private",      label:"Приватные",  icon:"🏝", color:"#7c3aed"},
              {key:"log",          label:"Журнал",     icon:"📋", color:"#64748b"},
            ].map(({key,label,icon,color})=>{
              const active = tab===key
              const badge = key==="transfers"
                ? (transferData.length>0 ? filteredTransfers.length-tDone : 0)
                : key==="excursions"
                ? (excursionData.length>0 ? filteredExcursions.length-eDone : 0)
                : key==="log" ? log.length : 0
              return (
                <button key={key} onClick={()=>setTab(key as any)}
                  style={{
                    display:"flex",alignItems:"center",gap:"5px",position:"relative",
                    padding:"6px 11px",fontSize:"11px",fontWeight:700,
                    borderRadius:"99px",border:"none",cursor:"pointer",flexShrink:0,
                    whiteSpace:"nowrap",transition:"all 0.2s",
                    background:active?`linear-gradient(135deg,${color},${color}cc)`:"transparent",
                    color:active?"#fff":t.muted,
                    boxShadow:active?`0 2px 10px ${color}55`:"none",
                    outline:"none",
                  }}>
                  <span style={{fontSize:"14px",lineHeight:1}}>{icon}</span>
                  <span>{label}</span>
                  {badge>0 && (
                    <span style={{position:"absolute",top:"-4px",right:"-2px",minWidth:"16px",height:"16px",borderRadius:"99px",background:key==="log"?"#64748b":"#f87171",color:"#fff",fontSize:"9px",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",lineHeight:1,boxShadow:`0 0 0 2px ${active?color:(dark?"#080f1e":"#fff")}`}}>
                      {badge>99?"99+":badge}
                    </span>
                  )}
                </button>
              )
            })}
            </div>
          </div>
        </div>
      </header>

      {/* swipe dots */}
      <div style={{display:"flex",justifyContent:"center",gap:"5px",padding:"4px 0",background:t.header,borderBottom:`1px solid ${t.cardBorder}`}}>
        {TAB_ORDER.map(key=>(
          <div key={key} onClick={()=>setTab(key)}
            style={{width:tab===key?"18px":"6px",height:"6px",borderRadius:"99px",background:tab===key?t.accent:t.muted,opacity:tab===key?1:0.4,cursor:"pointer",transition:"all 0.25s"}}/>
        ))}
      </div>

      {tab==="transfers"&&(
        <>
          <div style={{maxWidth:"1200px",margin:"0 auto",padding:"12px 16px 0"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              <input placeholder="🔍 Поиск по туристу, фамилии или ваучеру..." value={touristSearch} onChange={e=>setTouristSearch(e.target.value)} style={inp}/>
              <div style={{display:"flex",gap:"6px"}}>
                {(["","BIG","SAYAMA"] as string[]).map(op=>(
                  <button key={op} onClick={()=>setSelectedOperator(op)} style={{
                    flex:1,padding:"9px 4px",fontSize:"12px",fontWeight:700,borderRadius:"8px",border:"none",cursor:"pointer",
                    background:selectedOperator===op?(op==="BIG"?t.accent:op==="SAYAMA"?"#f97316":t.accent):t.cardBorder,
                    color:selectedOperator===op?"#fff":t.muted,transition:"all 0.2s"
                  }}>{op||"🌐 Все"}</button>
                ))}
              </div>
              <div style={{position:"relative",width:"100%"}}>
                <select value={selectedGuide} onChange={e=>setSelectedGuide(e.target.value)} style={{...selStyle,width:"100%"}}>
                  <option value="">👤 Все гиды</option>
                  {guideOptions.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
                <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:t.muted,fontSize:"11px"}}>▼</span>
                {selectedGuide&&<button onClick={()=>setSelectedGuide("")} style={{position:"absolute",right:"28px",top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:t.muted,cursor:"pointer",fontSize:"14px"}}>✕</button>}
              </div>
            </div>
          </div>
          {transferData.length===0&&<div style={{textAlign:"center",padding:"80px 20px",color:t.muted}}><div style={{width:"80px",height:"80px",borderRadius:"24px",background:dark?"rgba(56,189,248,0.08)":"rgba(3,105,161,0.06)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:"36px"}}>✈️</div><div style={{fontSize:"17px",fontWeight:700,marginBottom:"6px",color:t.text}}>Начните рабочий день</div><div style={{fontSize:"13px",lineHeight:1.6,maxWidth:"280px",margin:"0 auto"}}>Загрузите Excel-файл с депарами от операционного отдела — кнопка «Загрузить» в шапке</div></div>}
          {transferData.length>0&&dataAge(transferLoadTime).stale&&(
            <div style={{margin:"0 16px 12px",padding:"10px 14px",borderRadius:"12px",background:dark?"#2d2408":"#fefce8",border:"1.5px solid #eab308",display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontSize:"20px"}}>⏰</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:800,color:"#eab308"}}>Данные загружены {dataAge(transferLoadTime).hours} ч назад</div>
                <div style={{fontSize:"11px",color:dark?"#fde68a":"#92400e"}}>Проверь, нет ли свежего файла от оперейшна</div>
              </div>
            </div>
          )}
          {filteredTransfers.length>0&&(()=>{
            const totalTourists=filteredTransfers.reduce((s,v)=>s+v.tourists.length,0)
            const problems=filteredTransfers.filter(v=>v.pickup==="—").length
            const allDone=tPct===100
            return(
              <div style={{margin:"0 16px 16px",padding:"14px 16px",borderRadius:"16px",background:allDone?"linear-gradient(135deg,rgba(34,197,94,0.12),rgba(16,185,129,0.08))":dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1.5px solid ${allDone?"rgba(34,197,94,0.4)":t.cardBorder}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:allDone?0:"10px"}}>
                  <div style={{fontSize:"13px",fontWeight:800,color:allDone?"#22c55e":t.text}}>
                    {allDone?"🎉 Все уведомлены!":"📊 Сводка дня"}
                  </div>
                  {allDone&&<span style={{fontSize:"12px",color:"#22c55e",fontWeight:700}}>Отличная работа ✓</span>}
                </div>
                {!allDone&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"}}>
                  {[
                    {icon:"👥",val:totalTourists,lbl:"Туристов"},
                    {icon:"✈️",val:filteredTransfers.length,lbl:"Ваучеров"},
                    {icon:"✅",val:tDone,lbl:"Готово"},
                    {icon:"⚠️",val:problems,lbl:"Проблемы",red:problems>0},
                  ].map(({icon,val,lbl,red})=>(
                    <div key={lbl} style={{textAlign:"center",padding:"8px 4px",borderRadius:"10px",background:dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)"}}>
                      <div style={{fontSize:"18px",marginBottom:"2px"}}>{icon}</div>
                      <div style={{fontSize:"18px",fontWeight:900,color:red?"#f87171":t.text,lineHeight:1}}>{val}</div>
                      <div style={{fontSize:"9px",color:t.muted,marginTop:"2px"}}>{lbl}</div>
                    </div>
                  ))}
                </div>}
              </div>
            )
          })()}
          <main style={{maxWidth:"1200px",margin:"0 auto",padding:"16px"}}>
            {groupedTransfers.map(([dateLabel,vouchers])=>{
              const isCollapsed=collapsedDates[dateLabel]
              const groupDone=vouchers.filter(v=>notifiedVouchers[v.vId]).length
              return(
                <div key={dateLabel} style={{marginBottom:"24px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
                    <button onClick={()=>setCollapsedDates(prev=>({...prev,[dateLabel]:!prev[dateLabel]}))} style={{display:"flex",alignItems:"center",gap:"10px",flex:1,background:"transparent",border:"none",cursor:"pointer",padding:"4px 0",color:t.text,minWidth:0}}>
                      <span style={{fontSize:"15px",fontWeight:700,whiteSpace:"nowrap"}}>{dateLabel}</span>
                      <span style={{fontSize:"12px",color:groupDone===vouchers.length?"#4ade80":t.muted,background:t.cardBorder,borderRadius:"99px",padding:"2px 8px",flexShrink:0}}>
                        {groupDone===vouchers.length?"✓ Все":groupDone}/{vouchers.length}
                      </span>
                      <span style={{marginLeft:"auto",fontSize:"12px",color:t.muted,transform:isCollapsed?"rotate(-90deg)":"rotate(0)",transition:"transform 0.2s",flexShrink:0}}>▼</span>
                    </button>
                    {groupDone<vouchers.length&&(
                      <button onClick={()=>setNotifiedVouchers(prev=>{const n={...prev};vouchers.forEach(v=>{n[v.vId]=true});return n})}
                        style={{fontSize:"10px",fontWeight:800,background:"rgba(74,222,128,0.12)",color:"#4ade80",border:"1px solid rgba(74,222,128,0.3)",borderRadius:"8px",padding:"5px 10px",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                        ✓ Все
                      </button>
                    )}
                  </div>
                  {!isCollapsed&&(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"10px"}}>
                      {vouchers.map((v,i)=>{
                        const isDone=!!notifiedVouchers[v.vId],isProblem=v.pickup==="—",b=transferBadge(v)
                        return(
                          <div key={i} className="nav-card" style={{background:t.card,borderRadius:"18px",border:`1.5px solid ${b.border}`,overflow:"hidden",opacity:isDone?0.6:1,transition:"all 0.3s",display:"flex",flexDirection:"column",boxShadow:dark?"0 4px 24px rgba(0,0,0,0.35)":"0 4px 16px rgba(0,0,0,0.08)",animationDelay:`${Math.min(i*40,300)}ms`}}>
                            {/* ── BOARDING PASS TOP ── */}
                            <div style={{background:`linear-gradient(135deg,${b.bg},${b.bg}ee)`,padding:"14px 14px 0"}}>
                              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px",marginBottom:"10px"}}>
                                {/* Left: time */}
                                <div>
                                  <div style={{fontSize:"9px",fontWeight:800,color:b.color,letterSpacing:"2.5px",textTransform:"uppercase",opacity:0.7,marginBottom:"2px"}}>{isProblem?"⚠ УТОЧНИТЬ":"PICK UP"}</div>
                                  {!isProblem&&<div style={{fontSize:"40px",fontWeight:900,color:b.color,lineHeight:1,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"-2px"}}>{v.pickup}</div>}
                                  {isProblem&&<div style={{fontSize:"15px",fontWeight:800,color:"#f87171",marginTop:"4px"}}>Уточнить</div>}
                                </div>
                                {/* Right: flight + status */}
                                <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:"4px",alignItems:"flex-end"}}>
                                  <span style={{fontSize:"10px",fontWeight:800,background:isDone?"rgba(74,222,128,0.12)":"rgba(251,191,36,0.12)",color:isDone?"#4ade80":"#fbbf24",border:`1px solid ${isDone?"rgba(74,222,128,0.4)":"rgba(251,191,36,0.4)"}`,borderRadius:"6px",padding:"2px 8px",whiteSpace:"nowrap"}}>{isDone?"✓ Отправлено":"⏳ Ожидает"}</span>
                                  <div style={{fontSize:"9px",color:b.color,opacity:0.6,fontWeight:700,letterSpacing:"1.5px"}}>FLIGHT</div>
                                  <div style={{fontSize:"14px",fontWeight:800,color:b.color,fontFamily:"monospace",letterSpacing:"0.5px"}}>{v.flightNo}</div>
                                  <div style={{fontSize:"10px",color:b.color,opacity:0.55,fontFamily:"monospace"}}>{v.flightDate} {v.flightTime}</div>
                                </div>
                              </div>
                              {/* Badges row */}
                              <div style={{display:"flex",alignItems:"center",gap:"5px",paddingBottom:"10px",flexWrap:"wrap"}}>
                                {v.touroperator&&<span style={{fontSize:"9px",fontWeight:800,background:v.touroperator==="BIG"?"#1e3f6a":"#2d1b0e",color:v.touroperator==="BIG"?"#38bdf8":"#fb923c",borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.5px"}}>{v.touroperator}</span>}
                                {v.transferType&&<span style={{fontSize:"9px",fontWeight:700,background:v.transferType.startsWith("G")?"#0d2010":"#1e1040",color:v.transferType.startsWith("G")?"#4ade80":"#c084fc",borderRadius:"6px",padding:"2px 7px"}}>{v.transferType.startsWith("G")?"🚌 Группа":"👤 Инд."}</span>}
                                <span style={{marginLeft:"auto",fontSize:"9px",color:b.color,opacity:0.55,fontFamily:"monospace",fontWeight:700}}>{v.vId}</span>
                                {!isProblem&&<input type="checkbox" checked={isDone} onChange={()=>setNotifiedVouchers(prev=>({...prev,[v.vId]:!prev[v.vId]}))} style={{width:"18px",height:"18px",cursor:"pointer",accentColor:b.color,flexShrink:0}}/>}
                              </div>
                            </div>
                            {/* ── PERFORATION ── */}
                            <div style={{display:"flex",alignItems:"center",margin:"0"}}>
                              <div style={{width:"12px",height:"12px",borderRadius:"50%",background:dark?"#07101f":"#f0f5fa",flexShrink:0,marginLeft:"-6px"}}/>
                              <div style={{flex:1,height:"1px",background:`repeating-linear-gradient(90deg,${b.border} 0,${b.border} 5px,transparent 5px,transparent 10px)`}}/>
                              <div style={{width:"12px",height:"12px",borderRadius:"50%",background:dark?"#07101f":"#f0f5fa",flexShrink:0,marginRight:"-6px"}}/>
                            </div>
                            {/* ── PASSENGER INFO ── */}
                            <div style={{padding:"12px 14px",flex:1}}>
                              <div style={{display:"flex",alignItems:"flex-start",gap:"10px",marginBottom:"10px"}}>
                                <div style={{fontSize:"28px",lineHeight:1,flexShrink:0}}>🏨</div>
                                <div>
                                  <div style={{fontSize:"15px",fontWeight:800,color:t.text,lineHeight:1.2}}>{v.hotel}</div>
                                  <div style={{fontSize:"11px",color:t.muted,marginTop:"3px"}}>👤 {v.guide} · 🗓 Выезд: {v.departureDate}</div>
                                </div>
                              </div>
                              <div style={{display:"flex",flexDirection:"column",gap:"3px",marginBottom:"8px"}}>
                                {v.tourists.map((tt,idx)=>(
                                  <div key={idx} style={{fontSize:"13px",color:t.text,display:"flex",alignItems:"center",gap:"7px"}}>
                                    <span style={{width:"5px",height:"5px",borderRadius:"50%",background:b.color,flexShrink:0,display:"inline-block"}}/>
                                    {tt}
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* ── ACTION BUTTONS ── */}
                            <div style={{padding:"10px 14px 14px",borderTop:`1px solid ${t.cardBorder}`}}>
                              {v.phones.length===0&&<div style={{fontSize:"12px",color:t.muted,textAlign:"center",padding:"6px 0"}}>📵 Телефон не указан</div>}
                              {v.phones.map((ph,idx)=>(
                                <div key={idx} style={{marginBottom:idx<v.phones.length-1?"10px":0}}>
                                  <div style={{fontSize:"11px",color:t.muted,marginBottom:"7px",fontFamily:"monospace",fontWeight:600,letterSpacing:"0.3px"}}>📱 {ph}</div>
                                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 44px 44px",gap:"6px"}}>
                                    <a href={isProblem?undefined:`https://wa.me/${ph.replace(/\D/g,"")}?text=${generateTransferMessage(v)}`} target="_blank" rel="noreferrer" onClick={()=>{if(!isProblem){if(!isDone)setNotifiedVouchers(prev=>({...prev,[v.vId]:true}));addLog("transfer",v.tourists[0]||"",ph,v.hotel,v.vId)}}} style={{background:isProblem?t.cardBorder:"linear-gradient(135deg,#16a34a,#15803d)",color:isProblem?t.muted:"#fff",textAlign:"center",padding:"10px 4px",borderRadius:"10px",textDecoration:"none",fontSize:"12px",fontWeight:800,pointerEvents:isProblem?"none":"auto",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>💬 WA</a>
                                    <a href={isProblem?undefined:`https://t.me/+${ph.replace(/[^\d]/g,"")}`} target="_blank" rel="noreferrer" style={{background:isProblem?t.cardBorder:"linear-gradient(135deg,#0088cc,#006aaa)",color:isProblem?t.muted:"#fff",textAlign:"center",padding:"10px 4px",borderRadius:"10px",textDecoration:"none",fontSize:"12px",fontWeight:800,pointerEvents:isProblem?"none":"auto",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>✈ TG</a>
                                    <a href={`tel:${ph}`} style={{background:t.cardBorder,color:t.text,textAlign:"center",padding:"10px 4px",borderRadius:"10px",textDecoration:"none",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}>📞</a>
                                    <button onClick={()=>copyMessage(generateTransferMessage(v),v.vId+ph)} title="Скопировать текст сообщения" style={{background:copiedMsg===v.vId+ph?"#16a34a":t.cardBorder,color:copiedMsg===v.vId+ph?"#fff":t.text,border:"none",padding:"10px 4px",borderRadius:"10px",fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>{copiedMsg===v.vId+ph?"✓":"📋"}</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </main>
        </>
      )}

      {tab==="excursions"&&(
        <>
          <div style={{maxWidth:"1200px",margin:"0 auto",padding:"12px 16px 0"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              <input placeholder="🔍 Поиск по туристу, ваучеру или экскурсии..." value={excSearch} onChange={e=>setExcSearch(e.target.value)} style={inp}/>
              <div style={{position:"relative",width:"100%"}}>
                <select value={excGuide} onChange={e=>setExcGuide(e.target.value)} style={{...selStyle,width:"100%"}}>
                  <option value="">👤 Все гиды</option>
                  {excGuideOptions.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
                <span style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:t.muted,fontSize:"11px"}}>▼</span>
                {excGuide&&<button onClick={()=>setExcGuide("")} style={{position:"absolute",right:"28px",top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:t.muted,cursor:"pointer",fontSize:"14px"}}>✕</button>}
              </div>
            </div>
          </div>
          {excursionData.length>0&&dataAge(excLoadTime).stale&&(
            <div style={{margin:"0 16px 12px",padding:"10px 14px",borderRadius:"12px",background:dark?"#2d2408":"#fefce8",border:"1.5px solid #eab308",display:"flex",alignItems:"center",gap:"10px"}}>
              <span style={{fontSize:"20px"}}>⏰</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:800,color:"#eab308"}}>Данные загружены {dataAge(excLoadTime).hours} ч назад</div>
                <div style={{fontSize:"11px",color:dark?"#fde68a":"#92400e"}}>Проверь, нет ли свежего файла от оперейшна</div>
              </div>
            </div>
          )}
          {excursionData.length===0&&<div style={{textAlign:"center",padding:"80px 20px",color:t.muted}}><div style={{width:"80px",height:"80px",borderRadius:"24px",background:dark?"rgba(168,85,247,0.08)":"rgba(124,58,237,0.06)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:"36px"}}>🗺️</div><div style={{fontSize:"17px",fontWeight:700,marginBottom:"6px",color:t.text}}>Экскурсии не загружены</div><div style={{fontSize:"13px",lineHeight:1.6,maxWidth:"280px",margin:"0 auto"}}>Загрузите файл экскурсионной программы от оперейшна — кнопка «Загрузить» в шапке</div></div>}
          <main style={{maxWidth:"1200px",margin:"0 auto",padding:"16px"}}>
            {groupedExcursions.map(([type,excursions])=>{
              const meta=TYPE_META[type],isCollapsed=collapsedTypes[type]
              const groupDone=excursions.filter(e=>notifiedExcursions[e.key]).length
              return(
                <div key={type} style={{marginBottom:"24px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
                    <button onClick={()=>setCollapsedTypes(prev=>({...prev,[type]:!prev[type]}))} style={{display:"flex",alignItems:"center",gap:"10px",flex:1,background:"transparent",border:"none",cursor:"pointer",padding:"4px 0",color:t.text,minWidth:0}}>
                      <span style={{fontSize:"15px",fontWeight:700,whiteSpace:"nowrap"}}>{meta.icon} {meta.label}</span>
                      <span style={{fontSize:"12px",color:groupDone===excursions.length?"#a855f7":t.muted,background:t.cardBorder,borderRadius:"99px",padding:"2px 8px",flexShrink:0}}>
                        {groupDone===excursions.length?"✓ Все":groupDone}/{excursions.length}
                      </span>
                      <span style={{marginLeft:"auto",fontSize:"12px",color:t.muted,transform:isCollapsed?"rotate(-90deg)":"rotate(0)",transition:"transform 0.2s",flexShrink:0}}>▼</span>
                    </button>
                    {groupDone<excursions.length&&(
                      <button onClick={()=>setNotifiedExcursions(prev=>{const n={...prev};excursions.forEach(e=>{n[e.key]=true});return n})}
                        style={{fontSize:"10px",fontWeight:800,background:"rgba(168,85,247,0.12)",color:"#a855f7",border:"1px solid rgba(168,85,247,0.3)",borderRadius:"8px",padding:"5px 10px",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                        ✓ Все
                      </button>
                    )}
                  </div>
                  {!isCollapsed&&(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"10px"}}>
                      {excursions.map(e=>{
                        const isDone=!!notifiedExcursions[e.key],hasPhones=e.tourists.some(tt=>tt.phone)
                        return(
                          <div key={e.key} className="nav-card" style={{background:t.card,borderRadius:"18px",border:`1.5px solid ${meta.border}`,overflow:"hidden",opacity:isDone?0.6:1,transition:"all 0.3s",display:"flex",flexDirection:"column",boxShadow:dark?"0 4px 24px rgba(0,0,0,0.35)":"0 4px 16px rgba(0,0,0,0.08)"}}>
                            <div style={{background:`linear-gradient(135deg,${meta.bg},${meta.bg}ee)`,padding:"14px 14px 0"}}>
                              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"8px",marginBottom:"10px"}}>
                                <div>
                                  <div style={{fontSize:"9px",fontWeight:800,color:meta.color,letterSpacing:"2.5px",textTransform:"uppercase",opacity:0.7,marginBottom:"2px"}}>{meta.noTransfer?"САМОВЫВОЗ":"PICK UP"}</div>
                                  {!meta.noTransfer&&<div style={{fontSize:"40px",fontWeight:900,color:meta.color,lineHeight:1,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"-2px"}}>{e.pickup}</div>}
                                  {meta.noTransfer&&<div style={{fontSize:"14px",fontWeight:800,color:meta.color,marginTop:"4px"}}>🚖 Самостоятельно</div>}
                                </div>
                                <div style={{textAlign:"right",display:"flex",flexDirection:"column",gap:"4px",alignItems:"flex-end"}}>
                                  <span style={{fontSize:"10px",fontWeight:800,background:isDone?"rgba(74,222,128,0.12)":"rgba(251,191,36,0.12)",color:isDone?"#4ade80":"#fbbf24",border:`1px solid ${isDone?"rgba(74,222,128,0.4)":"rgba(251,191,36,0.4)"}`,borderRadius:"6px",padding:"2px 8px",whiteSpace:"nowrap"}}>{isDone?"✓ Отправлено":"⏳ Ожидает"}</span>
                                  <div style={{fontSize:"9px",color:meta.color,opacity:0.6,fontWeight:700,letterSpacing:"1.5px"}}>EXCURSION</div>
                                  <div style={{fontSize:"11px",fontWeight:800,color:meta.color}}>{meta.icon} {meta.label}</div>
                                  <div style={{fontSize:"10px",color:meta.color,opacity:0.55}}>{e.date} · {e.adl}взр{e.chd>0?`+${e.chd}д`:""}{ e.inf>0?`+${e.inf}мл`:""}</div>
                                </div>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:"5px",paddingBottom:"10px",flexWrap:"wrap"}}>
                                {e.touroperator&&<span style={{fontSize:"9px",fontWeight:800,background:(e.touroperator||"").toLowerCase().includes("bg asia")?"#1e3f6a":"#2d1b0e",color:(e.touroperator||"").toLowerCase().includes("bg asia")?"#38bdf8":"#fb923c",borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.5px"}}>{(e.touroperator||"").toLowerCase().includes("bg asia")?"BIG":e.touroperator.split(" ")[0]}</span>}
                                {e.cooperateStaff&&<span style={{fontSize:"9px",fontWeight:700,background:"#1a2e0a",color:"#a3e635",borderRadius:"6px",padding:"2px 7px"}}>🤝 {e.cooperateStaff}</span>}
                                <span style={{marginLeft:"auto",fontSize:"9px",color:meta.color,opacity:0.55,fontFamily:"monospace",fontWeight:700}}>{e.vId}</span>
                                <input type="checkbox" checked={isDone} onChange={()=>setNotifiedExcursions(prev=>({...prev,[e.key]:!prev[e.key]}))} style={{width:"18px",height:"18px",cursor:"pointer",accentColor:meta.color,flexShrink:0}}/>
                              </div>
                            </div>
                            <div style={{display:"flex",alignItems:"center"}}>
                              <div style={{width:"12px",height:"12px",borderRadius:"50%",background:dark?"#07101f":"#f0f5fa",flexShrink:0,marginLeft:"-6px"}}/>
                              <div style={{flex:1,height:"1px",background:`repeating-linear-gradient(90deg,${meta.border} 0,${meta.border} 5px,transparent 5px,transparent 10px)`}}/>
                              <div style={{width:"12px",height:"12px",borderRadius:"50%",background:dark?"#07101f":"#f0f5fa",flexShrink:0,marginRight:"-6px"}}/>
                            </div>
                            <div style={{padding:"12px 14px",flex:1}}>
                              <div style={{fontSize:"14px",fontWeight:800,color:meta.color,marginBottom:"8px",lineHeight:1.3}}>{e.excursionName}</div>
                              <div style={{display:"flex",alignItems:"flex-start",gap:"10px",marginBottom:"8px"}}>
                                <div style={{fontSize:"24px",lineHeight:1,flexShrink:0}}>🏨</div>
                                <div>
                                  <div style={{fontSize:"14px",fontWeight:800,color:t.text,lineHeight:1.2}}>{e.hotel}{e.room?` · №${e.room}`:""}</div>
                                  <div style={{fontSize:"11px",color:"#fbbf24",fontWeight:600,marginTop:"2px"}}>👤 {e.guide}</div>
                                </div>
                              </div>
                              <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                                {e.tourists.map((tt,idx)=>(
                                  <div key={idx} style={{fontSize:"13px",color:t.text,display:"flex",alignItems:"center",gap:"7px"}}>
                                    <span style={{width:"5px",height:"5px",borderRadius:"50%",background:meta.color,flexShrink:0,display:"inline-block"}}/>
                                    {tt.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div style={{padding:"10px 14px 14px",borderTop:`1px solid ${t.cardBorder}`}}>
                              {!hasPhones&&<div style={{fontSize:"12px",color:t.muted,textAlign:"center",padding:"6px 0"}}>📵 Телефон не указан</div>}
                              {e.tourists.filter(tt=>tt.phone).map((tt,idx)=>(
                                <div key={idx} style={{marginBottom:"8px"}}>
                                  <div style={{fontSize:"11px",color:t.muted,marginBottom:"7px",fontFamily:"monospace",fontWeight:600}}>📱 {tt.phone}</div>
                                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 44px 44px",gap:"6px"}}>
                                    <a href={`https://wa.me/${tt.phone.replace(/\D/g,"")}?text=${generateExcursionMessage(e)}`} target="_blank" rel="noreferrer" onClick={()=>{if(!isDone)setNotifiedExcursions(prev=>({...prev,[e.key]:true}));addLog("excursion",tt.name,tt.phone,e.hotel,e.vId)}} style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",textAlign:"center",padding:"10px 4px",borderRadius:"10px",textDecoration:"none",fontSize:"12px",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>💬 WA</a>
                                    <a href={`https://t.me/+${tt.phone.replace(/[^\d]/g,"")}`} target="_blank" rel="noreferrer" style={{background:"linear-gradient(135deg,#0088cc,#006aaa)",color:"#fff",textAlign:"center",padding:"10px 4px",borderRadius:"10px",textDecoration:"none",fontSize:"12px",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"}}>✈ TG</a>
                                    <a href={`tel:${tt.phone}`} style={{background:t.cardBorder,color:t.text,textAlign:"center",padding:"10px 4px",borderRadius:"10px",textDecoration:"none",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}>📞</a>
                                    <button onClick={()=>copyMessage(generateExcursionMessage(e),e.key+tt.phone)} title="Скопировать текст сообщения" style={{background:copiedMsg===e.key+tt.phone?"#16a34a":t.cardBorder,color:copiedMsg===e.key+tt.phone?"#fff":t.text,border:"none",padding:"10px 4px",borderRadius:"10px",fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>{copiedMsg===e.key+tt.phone?"✓":"📋"}</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </main>
        </>
      )}



      {/* ── BOATS TAB ── */}
      {tab==="boats" && <BoatsTab dark={dark}/>}

      {/* ── BOAT SUMMER 1.05.26 TAB ── */}
      {tab==="boatsummer" && <BoatSummerTab dark={dark}/>}

      {/* ── VIP CALCULATOR TAB ── */}
      {tab==="vipcalc" && <VIPCalcTab dark={dark}/>}

      {/* ── PRIVATE TOURS TAB ── */}
      {tab==="private" && <PrivateTab dark={dark}/>}

      {/* ── CONTACTS TAB ── */}

      {/* ── WEATHER TAB ── */}

      {/* ── METHODICHKA TAB ── */}
      {tab==="methodichka" && <MethodichkaTab dark={dark}/>}


      {/* ── LOG TAB ──────────────────────────────────────────────────────────── */}
      {tab==="log" && (
        <>
          {(()=>{
            const logFiltered=log.filter(e=>{
              if(logType!=="all"&&e.type!==logType)return false
              if(!logSearch.trim())return true
              const q=logSearch.toLowerCase()
              return (e.name||"").toLowerCase().includes(q)||(e.hotel||"").toLowerCase().includes(q)||(e.voucherId||"").toLowerCase().includes(q)||(e.phone||"").includes(q)
            })
            const inp2:React.CSSProperties={fontSize:"12px",padding:"7px 10px",borderRadius:"8px",border:`1px solid ${t.cardBorder}`,background:t.card,color:t.text,outline:"none",width:"100%"}
            return(<>
          <div style={{maxWidth:"1200px",margin:"0 auto",padding:"12px 16px 8px",display:"flex",flexDirection:"column",gap:"8px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}}>
              <div style={{fontSize:"13px",color:t.muted,fontWeight:600}}>{log.length > 0 ? `Записей: ${log.length}${logFiltered.length!==log.length?` · показано: ${logFiltered.length}`:""}` : "Журнал пуст"}</div>
              <div style={{display:"flex",gap:"6px"}}>
                {log.length > 0 && <button onClick={exportReport} style={{fontSize:"12px",background:"#16a34a",color:"#fff",padding:"7px 12px",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:600}}>⬇ Экспорт</button>}
                {log.length > 0 && <button onClick={()=>{if(confirm("Очистить журнал?")){setLog([]);localStorage.removeItem("navLog")}}} style={{fontSize:"12px",background:t.cardBorder,color:t.muted,padding:"7px 12px",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:600}}>🗑</button>}
              </div>
            </div>
            {/* Backup / Restore */}
            <div style={{display:"flex",gap:"6px",alignItems:"center",background:dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",border:`1px solid ${t.cardBorder}`,borderRadius:"10px",padding:"8px 12px"}}>
              <span style={{fontSize:"16px"}}>💾</span>
              <div style={{flex:1,fontSize:"11px",color:t.muted,lineHeight:1.4}}>
                <b style={{color:t.text}}>Резервная копия</b> — все данные, заметки, журнал
              </div>
              <button onClick={exportBackup} style={{fontSize:"11px",fontWeight:700,background:t.accent,color:"#fff",padding:"6px 12px",border:"none",borderRadius:"8px",cursor:"pointer",whiteSpace:"nowrap"}}>⬇ Сохранить</button>
              <label style={{fontSize:"11px",fontWeight:700,background:t.cardBorder,color:t.text,padding:"6px 12px",borderRadius:"8px",cursor:"pointer",whiteSpace:"nowrap"}}>
                ⬆ Восстановить
                <input type="file" accept=".json" onChange={importBackup} style={{display:"none"}}/>
              </label>
            </div>
            {log.length>0&&<div style={{display:"flex",gap:"6px",alignItems:"center"}}>
              <input placeholder="🔍 Турист, отель, ваучер, телефон..." value={logSearch} onChange={e=>setLogSearch(e.target.value)} style={{...inp2,flex:1}}/>
              <div style={{display:"flex",gap:"4px",flexShrink:0}}>
                {(["all","transfer","excursion"] as const).map(tp=>(
                  <button key={tp} onClick={()=>setLogType(tp)} style={{fontSize:"10px",fontWeight:700,padding:"6px 10px",borderRadius:"8px",border:"none",cursor:"pointer",
                    background:logType===tp?(tp==="transfer"?"#0369a1":tp==="excursion"?"#7c3aed":t.accent):t.cardBorder,
                    color:logType===tp?"#fff":t.muted,whiteSpace:"nowrap"}}>
                    {tp==="all"?"Все":tp==="transfer"?"✈ Трансфер":"🗺 Экскурсия"}
                  </button>
                ))}
              </div>
            </div>}
          </div>

          {log.length === 0 && (
            <div style={{textAlign:"center",padding:"80px 20px",color:t.muted}}>
              <div style={{fontSize:"48px",marginBottom:"12px"}}>📋</div>
              <div style={{fontSize:"16px",fontWeight:600,marginBottom:"4px"}}>Журнал пуст</div>
              <div style={{fontSize:"13px"}}>Записи появятся после отправки сообщений через WhatsApp</div>
            </div>
          )}

          <main style={{maxWidth:"1200px",margin:"0 auto",padding:"16px"}}>
            {logFiltered.length===0&&log.length>0&&<div style={{textAlign:"center",padding:"40px 20px",color:t.muted,fontSize:"13px"}}>🔍 Ничего не найдено</div>}
            {logFiltered.map((entry) => (
              <div key={entry.id} style={{background:t.card,borderRadius:"12px",border:`1px solid ${t.cardBorder}`,padding:"12px",marginBottom:"8px",display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{background:entry.type==="transfer"?"#0c2340":"#1e1040",borderRadius:"8px",padding:"8px 10px",textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:"18px"}}>{entry.type==="transfer"?"✈️":"🗺️"}</div>
                  <div style={{fontSize:"10px",color:t.muted,marginTop:"2px"}}>{entry.time}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"13px",fontWeight:700,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.name||"—"}</div>
                  <div style={{fontSize:"12px",color:t.accent,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🏨 {entry.hotel}</div>
                  <div style={{fontSize:"11px",color:t.muted}}>📱 {entry.phone} · 🎫 {entry.voucherId}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:"11px",color:t.muted}}>{entry.date}</div>
                  <div style={{fontSize:"11px",background:entry.type==="transfer"?t.accent:"#a855f7",color:"#fff",borderRadius:"4px",padding:"2px 6px",marginTop:"4px"}}>{entry.type==="transfer"?"Трансфер":"Экскурсия"}</div>
                </div>
              </div>
            ))}
          </main>
          </>)
          })()}
        </>
      )}



    </div>
  )
}
