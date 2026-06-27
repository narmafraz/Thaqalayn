export const environment = {
  production: true,
  apiBaseUrl: 'https://thaqalayndata.netlify.app/',
  wordsApiBaseUrl: 'https://thaqalaynwords.netlify.app/',
  tafsirBaseUrl: 'https://thaqalayntafsir.netlify.app/',
  searchBaseUrl: 'https://thaqalaynsearch.netlify.app/', // meta: manifest.json + qref.json
  searchLangUrl: 'https://thaqalaynsearch-{lang}.netlify.app/', // per-language Pagefind bundle
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
};
