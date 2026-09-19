export const TRANSLATIONS = {
  te: {
    langName: "తెలుగు",
    flag: "🇮🇳",
    appName: "కిరాణా మిత్ర",
    appSubtitle: "వాయిస్ & కెమెరా ఇన్వెంటరీ మేనేజ్‌మెంట్",
    engineBadge: "⚡ జెమిని లైవ్ + డిఫ్యూజన్ గెమ్మ",
    engineTooltip: "జెమిని లైవ్ (విజన్ & ట్రాన్స్‌లేషన్) + డిఫ్యూజన్ గెమ్మ (రీజనింగ్ & స్టాక్) కలిసి పనిచేస్తున్నాయి",
    lowStockAlert: "తక్కువ స్టాక్",
    scanItemBtn: "వస్తువు స్కాన్ చేయి",
    recommendationBtn: "ఏం కొనాలి (₹ సలహా)",
    resetBtnTitle: "స్టోర్ కేటలాగ్ రీసెట్ చేయి",
    resetConfirm: "కేటలాగ్‌ను రీసెట్ చేయాలనుకుంటున్నారా?",
    
    // Voice controller
    voiceTitle: "వాయిస్ కమాండ్ మైక్రోఫోన్",
    voiceSubtitle: "మాట్లాడటానికి మైక్రోఫోన్ పై నొక్కండి లేదా కింద ఉన్న ప్రాంప్ట్ ఎంచుకోండి",
    micListening: "వినబడుతోంది... మాట్లాడండి",
    micIdle: "మాట్లాడటానికి నొక్కండి",
    inputPlaceholder: "ఉదా: బియ్యం 10 బస్తాలు వేయి, ఏం కొనాలి...",
    sendBtn: "పంపు",
    quickPromptsTitle: "త్వరిత వాయిస్ ప్రాంప్ట్‌లు (పరీక్ష కోసం నొక్కండి):",
    chips: [
      { label: "ఏం కొనాలి", desc: "బడ్జెట్ అడుగుతుంది", icon: "💰" },
      { label: "బియ్యం 10 బస్తాలు వేయి", desc: "స్టాక్ జోడించు", icon: "🌾" },
      { label: "కోకోకోలా జీరో 5 క్యాన్లు వేయి", desc: "డి-డూప్ పరీక్ష", icon: "🥤" },
      { label: "నా దగ్గర 5000 రూపాయలు ఉన్నాయి ఏం కొనాలి", desc: "నేరుగా బడ్జెట్", icon: "💵" },
      { label: "నూనె 5 బాటిళ్లు వేయి", desc: "ఆయిల్ స్టాక్", icon: "🧈" },
      { label: "చక్కెర 5 కేజీలు తీసివేయి", desc: "అమ్మకం నమోదు", icon: "🍬" },
      { label: "బోర్బన్ బిస్కెట్లు 10 ప్యాకెట్లు వేయి", desc: "బిస్కెట్ స్టాక్", icon: "🍪" }
    ],

    // Inventory
    catalogTitle: "దుకాణం ఇన్వెంటరీ స్టాక్",
    itemsCount: "వస్తువులు",
    searchPlaceholder: "వస్తువు పేరు వెతకండి...",
    filterAll: "అన్నీ",
    filterLowStock: "తక్కువ స్టాక్ (<5 రోజులు)",
    filterCritical: "అత్యవసరం (<3 రోజులు)",
    daysRemaining: "రోజుల స్టాక్",
    currentStock: "ప్రస్తుత స్టాక్",
    costPrice: "ధర",
    sellingPrice: "అమ్మకం ధర",
    statusHealthy: "బాగుంది",
    statusLow: "తక్కువ",
    statusCritical: "అత్యవసరం",
    units: {
      bags: "బస్తాలు",
      kg: "కేజీలు",
      bottles: "బాటిళ్లు",
      packets: "ప్యాకెట్లు",
      bars: "సబ్బులు",
      cans: "క్యాన్లు"
    },

    // Clarification
    clarificationTitle: "పరిమాణం క్లారిఫికేషన్",
    clarificationPrompt: "ఎన్ని యూనిట్లు వేయాలో చెప్పండి లేదా కింద ఎంచుకోండి:",
    clarificationSubmit: "నిర్ధారించు",
    cancel: "రద్దు",

    // Recommendation Flow
    recModalTitle: "ఏం కొనాలి — కొనుగోలు రీఆర్డర్ సలహా",
    askBudgetTitle: "మీ కొనుగోలు బడ్జెట్ ఎంత?",
    askBudgetSubtitle: "ముందుగా బడ్జెట్ నమోదు చేయండి, ఆపై AI ఆలోచించి అత్యవసర సరుకుల రీఆర్డర్ సలహా ఇస్తుంది.",
    enterBudgetPrompt: "కొనుగోలు బడ్జెట్ మొత్తం (₹):",
    thinkAndRecommendBtn: "ఆలోచించి సలహా ఇవ్వండి (Think & Recommend)",
    thinkingReorder: "⚡ AI ఆలోచిస్తోంది... స్టాక్ తరుగుదల & బడ్జెట్ లెక్కిస్తున్నాము...",
    changeBudgetBtn: "← బడ్జెట్ మార్చండి",
    presetBudgetTitle: "త్వరిత బడ్జెట్ ఎంపిక:",
    narrationCardTitle: "కిరాణా మిత్ర స్టాక్ సలహా",
    budgetLabel: "బడ్జెట్ పరిమితి (₹):",
    totalAllocated: "మొత్తం కేటాయింపు",
    remainingBudget: "మిగిలిన బడ్జెట్",
    reorderUnits: "ఆర్డర్ చేయవలసినవి",
    voiceNarrationTitle: "కిరాణా మిత్ర సలహా",
    closeBtn: "మూసివేయి"
  },

  hi: {
    langName: "हिन्दी",
    flag: "🇮🇳",
    appName: "किराना मित्र",
    appSubtitle: "वॉइस और कैमरा इन्वेंटरी मैनेजमेंट",
    engineBadge: "⚡ जेमिनी लाइव + डिफ्यूजन गेम्मा",
    engineTooltip: "जेमिनी लाइव (विज़न व अनुवाद) + डिफ्यूजन गेम्मा (रीज़निंग व स्टॉक) मिलकर काम कर रहे हैं",
    lowStockAlert: "कम स्टॉक",
    scanItemBtn: "सामान स्कैन करें",
    recommendationBtn: "क्या खरीदें (₹ सलाह)",
    resetBtnTitle: "स्टोर कैटलॉग रीसेट करें",
    resetConfirm: "क्या आप कैटलॉग रीसेट करना चाहते हैं?",

    // Voice controller
    voiceTitle: "वॉइस कमांड माइक्रोफ़ोन",
    voiceSubtitle: "बोलने के लिए माइक दबाएं या नीचे दिए सुझाव पर क्लिक करें",
    micListening: "सुन रहा हूँ... बोलिए",
    micIdle: "बोलने के लिए दबाएं",
    inputPlaceholder: "उदा: चावल 10 बोरी जोड़ो, क्या खरीदें...",
    sendBtn: "भेजें",
    quickPromptsTitle: "त्वरित वॉइस प्रॉम्प्ट (परीक्षण के लिए क्लिक करें):",
    chips: [
      { label: "क्या खरीदें", desc: "पहले बजट पूछेगा", icon: "💰" },
      { label: "चावल 10 बोरी जोड़ो", desc: "स्टॉक जोड़ें", icon: "🌾" },
      { label: "कोका-कोला ज़ीरो 5 कैन जोड़ो", desc: "डुप्लीकेट टेस्ट", icon: "🥤" },
      { label: "मेरे पास 5000 रुपये हैं क्या खरीदना चाहिए", desc: "सीधे बजट के साथ", icon: "💵" },
      { label: "तेल 5 बोतल जोड़ो", desc: "ऑयल स्टॉक", icon: "🧈" },
      { label: "चीनी 5 किलो निकालो", desc: "बिक्री दर्ज करें", icon: "🍬" },
      { label: "बोर्बन बिस्कुट 10 पैकेट जोड़ो", desc: "बिस्कुट स्टॉक", icon: "🍪" }
    ],

    // Inventory
    catalogTitle: "दुकान इन्वेंटरी स्टॉक",
    itemsCount: "सामान",
    searchPlaceholder: "सामान का नाम खोजें...",
    filterAll: "सभी",
    filterLowStock: "कम स्टॉक (<5 दिन)",
    filterCritical: "अति आवश्यक (<3 दिन)",
    daysRemaining: "दिनों का स्टॉक",
    currentStock: "वर्तमान स्टॉक",
    costPrice: "लागत",
    sellingPrice: "बिक्री मूल्य",
    statusHealthy: "पर्याप्त",
    statusLow: "कम",
    statusCritical: "अति आवश्यक",
    units: {
      bags: "बोरी",
      kg: "किलो",
      bottles: "बोतल",
      packets: "पैकेट",
      bars: "टुकड़े",
      cans: "कैन"
    },

    // Clarification
    clarificationTitle: "मात्रा स्पष्टीकरण",
    clarificationPrompt: "कृपया मात्रा बताएं या नीचे दिए गए बटन चुनें:",
    clarificationSubmit: "पुष्टि करें",
    cancel: "रद्द करें",

    // Recommendation Flow
    recModalTitle: "क्या खरीदें — पुनर्खरीद बजट सलाह",
    askBudgetTitle: "आपका खरीद बजट कितना है?",
    askBudgetSubtitle: "पहले बजट राशि दर्ज करें या चुनें, फिर AI सोचकर सबसे जरूरी सामान की पुनर्खरीद सलाह देगा।",
    enterBudgetPrompt: "खरीद बजट राशि (₹):",
    thinkAndRecommendBtn: "सोचकर सलाह दें (Think & Recommend)",
    thinkingReorder: "⚡ AI सोच रहा है... इन्वेंटरी और बजट का विश्लेषण हो रहा है...",
    changeBudgetBtn: "← बजट बदलें",
    presetBudgetTitle: "त्वरित बजट विकल्प:",
    narrationCardTitle: "किराना मित्र स्टॉक सलाह",
    budgetLabel: "बजट राशि (₹):",
    totalAllocated: "कुल आवंटित",
    remainingBudget: "शेष बजट",
    reorderUnits: "ऑर्डर मात्रा",
    voiceNarrationTitle: "किराना मित्र सलाह",
    closeBtn: "बंद करें"
  },

  en: {
    langName: "English",
    flag: "🇬🇧",
    appName: "Kirana Mitra",
    appSubtitle: "Voice & Camera-Driven Indian Kirana Store",
    engineBadge: "⚡ Gemini Live + DiffusionGemma Active",
    engineTooltip: "Gemini Live (Vision & Entity Resolution) + DiffusionGemma (Stock Logic & Reordering) collaborating",
    lowStockAlert: "Low Stock",
    scanItemBtn: "Scan Item",
    recommendationBtn: "Em Konali (₹ Advice)",
    resetBtnTitle: "Reset to Initial Kirana Catalog",
    resetConfirm: "Are you sure you want to reset the store inventory?",

    // Voice controller
    voiceTitle: "Voice Command Microphone",
    voiceSubtitle: "Click the mic to speak or select a quick voice chip below",
    micListening: "Listening... Speak now",
    micIdle: "Click to speak",
    inputPlaceholder: "e.g. Add 10 bags of Rice, What should I buy...",
    sendBtn: "Send",
    quickPromptsTitle: "Quick Voice Chips (Click to test):",
    chips: [
      { label: "What should I buy", desc: "Asks budget first", icon: "💰" },
      { label: "Rice 10 bags add cheyyi", desc: "Stock update", icon: "🌾" },
      { label: "Add 5 cans of Coca-Cola Zero", desc: "Deduplication Test", icon: "🥤" },
      { label: "Naa daggara 5000 rupees undi em konali", desc: "With explicit budget", icon: "💵" },
      { label: "Add 5 bottles of Oil", desc: "Oil Stock", icon: "🧈" },
      { label: "Remove 5 kg Sugar", desc: "Sale deduction", icon: "🍬" },
      { label: "Add 10 packets Bourbon Biscuits", desc: "Biscuits Stock", icon: "🍪" }
    ],

    // Inventory
    catalogTitle: "Store Inventory Catalog",
    itemsCount: "items",
    searchPlaceholder: "Search products by name...",
    filterAll: "All",
    filterLowStock: "Low Stock (<5 days)",
    filterCritical: "Critical (<3 days)",
    daysRemaining: "Days Remaining",
    currentStock: "Current Stock",
    costPrice: "Cost",
    sellingPrice: "Sell",
    statusHealthy: "Healthy",
    statusLow: "Low Stock",
    statusCritical: "Critical",
    units: {
      bags: "bags",
      kg: "kg",
      bottles: "bottles",
      packets: "packets",
      bars: "bars",
      cans: "cans"
    },

    // Clarification
    clarificationTitle: "Quantity Clarification",
    clarificationPrompt: "Please specify the quantity or pick an option below:",
    clarificationSubmit: "Confirm Quantity",
    cancel: "Cancel",

    // Recommendation Flow
    recModalTitle: "Em Konali — Intelligent Purchase Reorder Advice",
    askBudgetTitle: "What is your purchase budget?",
    askBudgetSubtitle: "First enter or select your budget, then AI will think and optimize your stock reordering.",
    enterBudgetPrompt: "Purchase Budget Amount (₹):",
    thinkAndRecommendBtn: "Think & Recommend",
    thinkingReorder: "⚡ Collaborative AI Thinking... Optimizing inventory allocation...",
    changeBudgetBtn: "← Change Budget",
    presetBudgetTitle: "Quick Budget Presets:",
    narrationCardTitle: "Kirana Mitra Stock Advice",
    budgetLabel: "Budget Limit (₹):",
    totalAllocated: "Total Allocated",
    remainingBudget: "Remaining Budget",
    reorderUnits: "Reorder Qty",
    voiceNarrationTitle: "Kirana Mitra Advice",
    closeBtn: "Close"
  }
};
