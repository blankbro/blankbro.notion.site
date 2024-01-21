/* CONFIGURATION STARTS HERE */

/* Step 1: enter your domain name like fruitionsite.com */
const MY_DOMAIN = 'blankbro.site';
const MY_NOTION_DOMAIN = 'blankbro.notion.site';

/*
 * Step 2: enter your URL slug to page ID mapping
 * The key on the left is the slug (without the slash)
 * The value on the right is the Notion page ID
 */
const SLUG_TO_PAGE = {
    '': '7112413b135d454d8bee06a2cf202688',
};

/* Step 3: enter your page title and description for SEO purposes */
const PAGE_TITLE = '';
const PAGE_DESCRIPTION = '';

/* Step 4: enter a Google Font name, you can choose from https://fonts.google.com */
const GOOGLE_FONT = '';

/* Step 5: enter any custom scripts you'd like */
const CUSTOM_SCRIPT = ``;

/* CONFIGURATION ENDS HERE */

const PAGE_TO_SLUG = {};
const slugs = [];
const pages = [];
Object.keys(SLUG_TO_PAGE).forEach(slug => {
    const page = SLUG_TO_PAGE[slug];
    slugs.push(slug);
    pages.push(page);
    PAGE_TO_SLUG[page] = slug;
});

addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request));
});

function generateSitemap() {
    let sitemap = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    slugs.forEach((slug) => (
        sitemap += '<url><loc>https://' + MY_DOMAIN + '/' + slug + '</loc></url>'
    ));
    sitemap += '</urlset>';
    return sitemap;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function handleOptions(request) {
    if (request.headers.get('Origin') !== null &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        request.headers.get('Access-Control-Request-Headers') !== null) {
        // Handle CORS pre-flight request.
        return new Response(null, {
            headers: corsHeaders
        });
    } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
            headers: {
                'Allow': 'GET, HEAD, POST, PUT, OPTIONS',
            }
        });
    }
}

async function fetchAndApply(request) {
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }
    let url = new URL(request.url);
    url.hostname = MY_NOTION_DOMAIN;
    if (url.pathname === '/robots.txt') {
        return new Response('Sitemap: https://' + MY_DOMAIN + '/sitemap.xml');
    }
    if (url.pathname === '/sitemap.xml') {
        let response = new Response(generateSitemap());
        response.headers.set('content-type', 'application/xml');
        return response;
    }
    let response;
    if (url.pathname.startsWith('/app') && url.pathname.endsWith('js')) {
        response = await fetch(url.toString());
        let body = await response.text();
        response = new Response(body.replace(/${MY_NOTION_DOMAIN}/g, MY_DOMAIN).replace(/www.notion.so/g, MY_DOMAIN).replace(/notion.so/g, MY_DOMAIN), response);
        response.headers.set('Content-Type', 'application/x-javascript');
        return response;
    } else if ((url.pathname.startsWith('/api'))) {
        // Forward API
        response = await fetch(url.toString(), {
            body: url.pathname.startsWith('/api/v3/getPublicPageData') ? null : request.body,
            headers: {
                'content-type': 'application/json;charset=UTF-8',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'
            },
            method: 'POST',
        });
        response = new Response(response.body, response);
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
    } else if (slugs.indexOf(url.pathname.slice(1)) > -1) {
        const pageId = SLUG_TO_PAGE[url.pathname.slice(1)];
        return Response.redirect('https://' + MY_DOMAIN + '/' + pageId, 301);
    } else if (pages.indexOf(url.pathname.slice(1)) === -1 && url.pathname.slice(1).match(/[0-9a-f]{32}/)) {
        return Response.redirect('https://' + MY_NOTION_DOMAIN + url.pathname, 302);
    } else {
        response = await fetch(url.toString(), {
            body: request.body,
            headers: request.headers,
            method: request.method,
        });
        response = new Response(response.body, response);
        response.headers.delete('Content-Security-Policy');
        response.headers.delete('X-Content-Security-Policy');
    }

    return appendJavascript(response, SLUG_TO_PAGE);
}

class MetaRewriter {
    element(element) {
        if (PAGE_TITLE !== '') {
            if (element.getAttribute('property') === 'og:title'
                || element.getAttribute('name') === 'twitter:title') {
                element.setAttribute('content', PAGE_TITLE);
            }
            if (element.tagName === 'title') {
                element.setInnerContent(PAGE_TITLE);
            }
        }
        if (PAGE_DESCRIPTION !== '') {
            if (element.getAttribute('name') === 'description'
                || element.getAttribute('property') === 'og:description'
                || element.getAttribute('name') === 'twitter:description') {
                element.setAttribute('content', PAGE_DESCRIPTION);
            }
        }
        if (element.getAttribute('property') === 'og:url'
            || element.getAttribute('name') === 'twitter:url') {
            element.setAttribute('content', MY_DOMAIN);
        }
        if (element.getAttribute('name') === 'apple-itunes-app') {
            element.remove();
        }
    }
}

class HeadRewriter {
    element(element) {
        if (GOOGLE_FONT !== '') {
            element.append(`<link href="https://fonts.googleapis.com/css?family=${GOOGLE_FONT.replace(' ', '+')}:Regular,Bold,Italic&display=swap" rel="stylesheet">
                <style>* { font-family: "${GOOGLE_FONT}" !important; }</style>`, {
                html: true
            });
        }
        element.append(`<style>
            div.notion-topbar > div > div:nth-child(3) { display: none !important; }
            div.notion-topbar > div > div:nth-child(4) { display: none !important; }
            div.notion-topbar > div > div:nth-child(5) { display: none !important; }
            div.notion-topbar > div > div:nth-child(6) { display: none !important; }
            div.notion-topbar-mobile > div:nth-child(3) { display: none !important; }
            div.notion-topbar-mobile > div:nth-child(4) { display: none !important; }
            div.notion-topbar > div > div:nth-child(1n).toggle-mode { display: block !important; }
            div.notion-topbar-mobile > div:nth-child(1n).toggle-mode { display: block !important; }
            </style>`, {
            html: true
        })
    }
}

class BodyRewriter {
    constructor(SLUG_TO_PAGE) {
        this.SLUG_TO_PAGE = SLUG_TO_PAGE;
    }
    element(element) {
        element.append(
            `<script>
            // 设置基础域名
            window.CONFIG.domainBaseUrl = 'https://${MY_DOMAIN}';
            
            // 页面 Slug 到页面名称的映射
            const SLUG_TO_PAGE = ${JSON.stringify(this.SLUG_TO_PAGE)};
            
            // 页面名称到 Slug 的映射
            const PAGE_TO_SLUG = {};
            
            // 存储所有的 Slug 和页面名称
            const slugs = [];
            const pages = [];
            
            // 创建一个虚拟元素
            const el = document.createElement('div');
            
            // 标记是否已经重定向
            let redirected = false;
        
            // 遍历 SLUG_TO_PAGE 对象，构建 Slug 和页面名称的映射关系
            Object.keys(SLUG_TO_PAGE).forEach(slug => {
                const page = SLUG_TO_PAGE[slug];
                slugs.push(slug);
                pages.push(page);
                PAGE_TO_SLUG[page] = slug;
            });
        
            // 获取当前页面名称
            function getPage() {
                return location.pathname.slice(-32);
            }
        
            // 获取当前 Slug
            function getSlug() {
                return location.pathname.slice(1);
            }
        
            // 更新 Slug
            function updateSlug() {
                const slug = PAGE_TO_SLUG[getPage()];
                if (slug != null) {
                    // 使用 history.replaceState 更新 URL
                    history.replaceState(history.state, '', '/' + slug);
                }
            }
        
            // 使用 MutationObserver 监听页面变化
            const observer = new MutationObserver(function() {
                if (redirected) return;
                const nav = document.querySelector('.notion-topbar');
                const mobileNav = document.querySelector('.notion-topbar-mobile');
                if (nav && nav.firstChild && nav.firstChild.firstChild || mobileNav && mobileNav.firstChild) {
                    redirected = true;
                    updateSlug();
                    // window.onpopstate 是一个事件处理函数，它代表了浏览器的历史记录发生变化时触发的事件处理函数。
                    const onpopstate = window.onpopstate;
                    window.onpopstate = function() {
                        if (slugs.includes(getSlug())) {
                            const page = SLUG_TO_PAGE[getSlug()];
                            if (page) {
                                // 使用 history.replaceState 更新 URL
                                history.replaceState(history.state, 'bypass', '/' + page);
                            }
                        }
                        console.log("observer arguments", arguments);
                        // this 表示当前的执行上下文，这里是指当前事件处理函数所在的上下文。
                        // arguments 是一个类数组对象，包含了函数被调用时传递的所有参数。
                        // [].slice.call(arguments) 将 arguments 对象转换为一个真正的数组。
                        onpopstate.apply(this, [].slice.call(arguments));
                        updateSlug();
                    };
                }
            });
        
            // 监听 #notion-app 下的子节点变化
            observer.observe(document.querySelector('#notion-app'), {
                childList: true,
                subtree: true,
            });
        
            // 重写 history.replaceState，防止重复更新
            const replaceState = window.history.replaceState;
            window.history.replaceState = function(state) {
                console.log("replaceState arguments", arguments);
                if (arguments[1] !== 'bypass' && slugs.includes(getSlug())) return;
                // 调用原始的 replaceState 方法，使用 apply 方法传递当前上下文和原始的参数
                return replaceState.apply(window.history, arguments);
            };
        
            // 重写 history.pushState，处理页面名称和 Slug 的映射
            const pushState = window.history.pushState;
            window.history.pushState = function(state) {
                console.log("pushState arguments", arguments);
                const dest = new URL(location.protocol + location.host + arguments[2]);
                const id = dest.pathname.slice(-32);
                if (pages.includes(id)) {
                    arguments[2] = '/' + PAGE_TO_SLUG[id];
                }
                // 调用原始的 pushState 方法，使用 apply 方法传递当前上下文和修改后的参数
                return pushState.apply(window.history, arguments);
            };
        
            // fix 237: https://github.com/stephenou/fruitionsite/issues/237#issuecomment-1902644851
            // 重写 XMLHttpRequest.prototype.open，替换域名
            // 用于处理打开新连接时的逻辑。
            // const open = window.XMLHttpRequest.prototype.open;
            // window.XMLHttpRequest.prototype.open = function() {
            //     console.log("open arguments", arguments);
            //     arguments[1] = arguments[1].replace('${MY_DOMAIN}', '${MY_NOTION_DOMAIN}');
            //     // 调用原始的 XMLHttpRequest.prototype.open 方法，使用 apply 方法传递当前上下文和修改后的参数
            //     return open.apply(this, [].slice.call(arguments));
            // };
        </script>
        ${CUSTOM_SCRIPT}`, { 
            html: true 
        });
    }
}

async function appendJavascript(res, SLUG_TO_PAGE) {
    return new HTMLRewriter()
        .on('title', new MetaRewriter())
        // .on('meta', new MetaRewriter())
        // .on('head', new HeadRewriter())
        .on('body', new BodyRewriter(SLUG_TO_PAGE))
        .transform(res);
}