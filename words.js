// Messages the manager sends, in English, Hindi and Telugu.

export const LANGS = { en: 'English', hi: 'हिंदी', te: 'తెలుగు' };

export function shortlistMessage(lang, { tenant, count, link, manager }) {
  const name = tenant || '';
  const me = manager || 'TrustKeyper';
  if (lang === 'hi')
    return `नमस्ते ${name}, मैं TrustKeyper से ${me} हूँ।\nआपकी ज़रूरत के हिसाब से ${count} घर चुने हैं। फ़ोटो, किराया और पूरी जानकारी यहाँ देखें:\n${link}\n\nजो घर पसंद आए, उसी पेज पर विज़िट बुक कर सकते हैं।`;
  if (lang === 'te')
    return `నమస్తే ${name}, నేను TrustKeyper నుండి ${me}.\nమీ అవసరానికి తగిన ${count} ఇళ్లు ఎంచుకున్నాను. అద్దె మరియు పూర్తి వివరాలు ఇక్కడ చూడండి:\n${link}\n\nనచ్చిన ఇంటికి అదే పేజీలో విజిట్ బుక్ చేసుకోవచ్చు.`;
  return `Hi ${name}, this is ${me} from TrustKeyper.\nI have picked ${count} ${count === 1 ? 'home' : 'homes'} that suit what you are looking for. See rent and all details here:\n${link}\n\nIf you like one, you can book a visit on the same page.`;
}

export function firstCallMessage(lang, { tenant, manager, ask }) {
  const me = manager || 'TrustKeyper';
  if (lang === 'hi') return `नमस्ते ${tenant || ''}, मैं TrustKeyper से ${me} हूँ। आपने ${ask} के लिए पोस्ट किया था। हमारे पास कुछ अच्छे घर हैं। क्या अभी भी ढूँढ रहे हैं?`;
  if (lang === 'te') return `నమస్తే ${tenant || ''}, నేను TrustKeyper నుండి ${me}. మీరు ${ask} కోసం పోస్ట్ చేశారు. మా దగ్గర మంచి ఇళ్లు ఉన్నాయి. ఇంకా వెతుకుతున్నారా?`;
  return `Hi ${tenant || ''}, this is ${me} from TrustKeyper. You posted that you are looking for ${ask}. We have some good homes for you. Are you still looking?`;
}

export function ownerMessage(lang, { owner, manager, home }) {
  const me = manager || 'TrustKeyper';
  if (lang === 'hi') return `नमस्ते ${owner || ''}, मैं TrustKeyper से ${me} हूँ। आपके ${home} के लिए हमारे पास किरायेदार हैं। क्या घर अभी उपलब्ध है?`;
  if (lang === 'te') return `నమస్తే ${owner || ''}, నేను TrustKeyper నుండి ${me}. మీ ${home} కోసం మా దగ్గర అద్దెదారులు ఉన్నారు. ఇల్లు ఇంకా ఖాళీగా ఉందా?`;
  return `Hi ${owner || ''}, this is ${me} from TrustKeyper. We have tenants for your ${home}. Is it still available?`;
}
