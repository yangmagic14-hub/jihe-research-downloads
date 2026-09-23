// 仅作用于页面上已渲染的官方检索界面；如籍合网改版，可在设置中调整这些选择器。
module.exports = {
  jihe: {
    id: "jihe",
    name: "籍合网（通用网页检索）",
    startUrl: "https://www.ancientbooks.cn/",
    searchInput: "input[type='search'], input[placeholder*='关键字'], input[placeholder*='查找'], input[name*='keyword'], input[name*='search']",
    searchSubmit: "button[type='submit'], button[aria-label*='搜索'], .search button, input[type='submit']",
    resultItem: "article, .search-result, .result-item, .result-list > li",
    resultTitle: "h1, h2, h3, h4, a",
    resultSnippet: "p, .summary, .desc, .content",
    resultLink: "a[href]"
  },
  fjlibJihe: {
    id: "fjlibJihe",
    name: "福建省图书馆馆外访问 → 中华经典古籍库",
    startUrl: "https://s.fjlib.net:6443/interlibSSO/goto/314",
    searchInput: "input[type='search'], input[placeholder*='关键字'], input[placeholder*='查找'], input[name*='keyword'], input[name*='search']",
    searchSubmit: "button[type='submit'], button[aria-label*='搜索'], .search button, input[type='submit']",
    resultItem: "article, .search-result, .result-item, .result-list > li",
    resultTitle: "h1, h2, h3, h4, a",
    resultSnippet: "p, .summary, .desc, .content",
    resultLink: "a[href]"
  }
};
