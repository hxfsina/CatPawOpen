import * as HLS from 'hls-parser';
import req from '../../util/req.js';

let url = 'https://www.mtyy5.com';
let categories = [];
const sourceMap = {
    "NBY": "高清NB源",
    "1080zyk": "超清YZ源", 
    "ffm3u8": "极速FF源",
    "lzm3u8": "稳定LZ源",
    "yzzy": "YZ源"
};
const DEFAULT_PIC = "https://pic.rmb.bdstatic.com/bjh/1d0b02d0f57f0a4212da8865de018520.jpeg";

// 文本清理工具函数
function cleanText(text) {
    if (!text) return "";
    try {
        let result = String(text);
        if (/\\u/.test(result)) {
            result = result.replace(/\\u([\d\w]{4})/gi, (match, grp) => 
                String.fromCharCode(parseInt(grp, 16))
            );
        }
        return result.replace(/[\x00-\x1f\x7f]/g, '').trim();
    } catch (e) {
        return String(text);
    }
}

// 检查是否为视频URL
function isVideoUrl(url) {
    return /\.(mp4|m3u8|flv)/i.test(url);
}

async function request(reqUrl, headers = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; MI 11) AppleWebKit/537.36 TVBox/1.0',
        'Accept': 'text/html,application/xml;q=0.9,*/*;q=0.8',
        'Referer': url,
        'Connection': 'keep-alive'
    };
    
    let res = await req(reqUrl, {
        method: 'get',
        headers: {...defaultHeaders, ...headers},
        timeout: 15000
    });
    return res.data;
}

async function init(inReq, _outResp) {
    if (inReq.server.config.mtyy5) {
        url = inReq.server.config.mtyy5.url || url;
        categories = inReq.server.config.mtyy5.categories || [];
    }
    return {};
}

async function home(_inReq, _outResp) {
    const html = await request(url);
    let classes = [];
    const list = [];

    // 提取分类
    const categoryRegex = /<div class="head-nav">([\s\S]*?)<\/div>/;
    const categoryMatch = html.match(categoryRegex);
    if (categoryMatch) {
        const categoryHtml = categoryMatch[1];
        const categoryLinks = categoryHtml.match(/<a href="\/vodtype\/(\d+)\.html"[^>]*>([^<]+)<\/a>/g) || [];
        
        for (const link of categoryLinks) {
            const match = link.match(/\/vodtype\/(\d+)\.html[^>]*>([^<]+)</);
            if (match) {
                const typeId = match[1];
                const typeName = cleanText(match[2]);
                
                if (categories.length === 0 || categories.includes(typeName)) {
                    classes.push({
                        type_id: typeId,
                        type_name: typeName
                    });
                }
            }
        }
    }

    // 提取首页影片
    const listRegex = /<div class="public-list-box public-pic-b"[\s\S]*?<\/div><\/div>/g;
    const listMatches = html.match(listRegex) || [];
    
    for (const item of listMatches) {
        const linkMatch = item.match(/<a class="public-list-exp" href="\/voddetail\/(\d+)\.html"[^>]*title="([^"]*)"[^>]*>/);
        const imgMatch = item.match(/<img[^>]*data-src="([^"]*)"[^>]*alt="([^"]*)"/) || 
                        item.match(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"/);
        const remarksMatch = item.match(/<span class="public-prt">([^<]*)<\/span>/);
        
        if (linkMatch) {
            list.push({
                vod_id: linkMatch[1],
                vod_name: cleanText(linkMatch[2] || (imgMatch ? imgMatch[2] : '')),
                vod_pic: imgMatch ? new URL(imgMatch[1], url).toString() : DEFAULT_PIC,
                vod_remarks: cleanText(remarksMatch ? remarksMatch[1] : '')
            });
        }
    }

    // 分类排序
    if (categories.length > 0) {
        classes = classes.sort((a, b) => 
            categories.indexOf(a.type_name) - categories.indexOf(b.type_name)
        );
    }

    return {
        class: classes,
        list: list
    };
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page || 1;
    const pageUrl = pg > 1 ? `${url}/vodtype/${tid}-${pg}.html` : `${url}/vodtype/${tid}.html`;
    
    const html = await request(pageUrl);
    const videos = [];

    const listRegex = /<div class="public-list-box public-pic-b"[\s\S]*?<\/div><\/div>/g;
    const listMatches = html.match(listRegex) || [];
    
    for (const item of listMatches) {
        const linkMatch = item.match(/<a href="\/voddetail\/(\d+)\.html"[^>]*title="([^"]*)"[^>]*>/);
        const imgMatch = item.match(/<img[^>]*data-src="([^"]*)"[^>]*alt="([^"]*)"/) || 
                        item.match(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"/);
        const remarksMatch = item.match(/<span class="public-prt">([^<]*)<\/span>/);
        
        if (linkMatch) {
            videos.push({
                vod_id: linkMatch[1],
                vod_name: cleanText(linkMatch[2] || (imgMatch ? imgMatch[2] : '')),
                vod_pic: imgMatch ? new URL(imgMatch[1], url).toString() : DEFAULT_PIC,
                vod_remarks: cleanText(remarksMatch ? remarksMatch[1] : '')
            });
        }
    }

    return {
        page: parseInt(pg),
        pagecount: 999,
        limit: 20,
        total: 9999,
        list: videos
    };
}

async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];

    for (const id of ids) {
        const html = await request(`${url}/voddetail/${id}.html`);
        
        // 提取基本信息
        const titleMatch = html.match(/<h1 class="player-title-link"[^>]*>([^<]*)<\/h1>/);
        const imgMatch = html.match(/<div class="role-card"[^>]*>[\s\S]*?<img[^>]*data-src="([^"]*)"/);
        const contentMatch = html.match(/<div class="card-text"[^>]*>([\s\S]*?)<\/div>/);
        
        // 获取播放页URL
        const playLinkMatch = html.match(/<a class="anthology-list-play"[^>]*href="([^"]*)"/);
        const playUrl = playLinkMatch ? new URL(playLinkMatch[1], url).toString() : `${url}/vodplay/${id}-1-1.html`;
        
        const playHtml = await request(playUrl);
        
        // 提取播放源
        const sources = {};
        
        // 提取播放源选项卡
        const tabRegex = /<a class="vod-playerUrl"[^>]*data-form="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
        let tabMatch;
        const tabs = [];
        
        while ((tabMatch = tabRegex.exec(playHtml)) !== null) {
            tabs.push({
                form: tabMatch[1],
                name: cleanText(tabMatch[2])
            });
        }
        
        // 提取剧集列表
        const episodeBoxRegex = /<div class="anthology-list-box"[\s\S]*?<\/div><\/div>/g;
        const episodeBoxes = playHtml.match(episodeBoxRegex) || [];
        
        for (let i = 0; i < tabs.length && i < episodeBoxes.length; i++) {
            const tab = tabs[i];
            const sname = sourceMap[tab.form] || cleanText(tab.name);
            const episodeBox = episodeBoxes[i];
            
            const episodeRegex = /<a href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
            let episodeMatch;
            const episodes = [];
            
            while ((episodeMatch = episodeRegex.exec(episodeBox)) !== null) {
                if (episodeMatch[1] && episodeMatch[2]) {
                    episodes.push(`${cleanText(episodeMatch[2])}$${new URL(episodeMatch[1], url).toString()}`);
                }
            }
            
            if (episodes.length > 0) {
                sources[sname] = episodes.join('#');
            }
        }
        
        // 排序播放源
        const finalFrom = [];
        const finalUrl = [];
        
        if (sources["高清NB源"]) {
            finalFrom.push("高清NB源");
            finalUrl.push(sources["高清NB源"]);
            delete sources["高清NB源"];
        }
        
        finalFrom.push(...Object.keys(sources));
        finalUrl.push(...Object.values(sources));
        
        const vod = {
            vod_id: id,
            vod_name: cleanText(titleMatch ? titleMatch[1] : ''),
            vod_pic: imgMatch ? new URL(imgMatch[1], url).toString() : DEFAULT_PIC,
            vod_content: cleanText(contentMatch ? contentMatch[1].replace(/<[^>]*>/g, '') : ''),
            vod_play_from: finalFrom.join('$$$'),
            vod_play_url: finalUrl.join('$$$'),
            vod_remarks: '',
            type_name: '',
            vod_year: '',
            vod_area: '',
            vod_actor: '',
            vod_director: ''
        };
        
        videos.push(vod);
    }

    return {
        list: videos
    };
}

async function play(inReq, _outResp) {
    const playUrl = inReq.body.id;
    const fullUrl = playUrl.startsWith('http') ? playUrl : new URL(playUrl, url).toString();
    
    try {
        const html = await request(fullUrl);
        const playerMatch = html.match(/var player_aaaa\s*=\s*({[^}]+?url:[^}]+})/);
        
        if (playerMatch) {
            let playerData = playerMatch[1];
            // 简单清理JSON字符串
            playerData = playerData.replace(/,\s*([}\]])/g, '$1');
            
            try {
                const data = JSON.parse(playerData);
                const mainUrl = decodeURIComponent(data.url || '').trim();
                const backupUrl = decodeURIComponent(data.url_next || '').trim();
                
                let playAddr = mainUrl;
                if (!isVideoUrl(mainUrl) && isVideoUrl(backupUrl)) {
                    playAddr = backupUrl;
                }
                
                if (isVideoUrl(playAddr)) {
                    return {
                        parse: 0,
                        url: playAddr,
                        header: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': fullUrl
                        }
                    };
                }
            } catch (e) {
                console.error('Parse player data error:', e);
            }
        }
        
        // 如果是m3u8文件，使用代理
        if (playUrl.includes('.m3u8')) {
            return {
                parse: 0,
                url: inReq.server.address().dynamic + inReq.server.prefix + '/proxy/hls/' + encodeURIComponent(fullUrl) + '/.m3u8'
            };
        }
        
        return {
            parse: 1,
            url: fullUrl
        };
    } catch (error) {
        console.error('Play error:', error);
        return {
            parse: 1,
            url: fullUrl
        };
    }
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page || 1;
    const videos = [];
    const seen = new Set();

    // 尝试RSS搜索
    try {
        const rssUrl = `${url}/rss.xml?wd=${encodeURIComponent(wd)}`;
        const rssXml = await request(rssUrl, {
            'Accept': 'application/xml'
        });
        
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let itemMatch;
        
        while ((itemMatch = itemRegex.exec(rssXml)) !== null) {
            const item = itemMatch[1];
            const linkMatch = item.match(/<link>([^<]*)<\/link>/);
            const titleMatch = item.match(/<title>([^<]*)<\/title>/);
            const authorMatch = item.match(/<author>([^<]*)<\/author>/);
            
            if (linkMatch) {
                const idMatch = linkMatch[1].match(/\/voddetail\/(\d+)\.html/);
                if (idMatch && !seen.has(idMatch[1])) {
                    seen.add(idMatch[1]);
                    videos.push({
                        vod_id: idMatch[1],
                        vod_name: cleanText(titleMatch ? titleMatch[1] : ''),
                        vod_pic: DEFAULT_PIC,
                        vod_remarks: authorMatch ? `主演: ${cleanText(authorMatch[1]).substring(0, 15)}...` : ''
                    });
                }
            }
        }
    } catch (e) {
        console.error('RSS search error:', e);
    }

    // 如果RSS搜索无结果，使用网页搜索
    if (videos.length === 0) {
        try {
            const searchUrl = `${url}/vodsearch/${encodeURIComponent(wd)}---${pg}---.html`;
            const html = await request(searchUrl);
            
            const listRegex = /<div class="public-list-box public-pic-b"[\s\S]*?<\/div><\/div>/g;
            const listMatches = html.match(listRegex) || [];
            
            for (const item of listMatches) {
                const linkMatch = item.match(/<a href="\/voddetail\/(\d+)\.html"[^>]*title="([^"]*)"[^>]*>/);
                const imgMatch = item.match(/<img[^>]*data-src="([^"]*)"[^>]*alt="([^"]*)"/) || 
                                item.match(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"/);
                const remarksMatch = item.match(/<span class="public-prt">([^<]*)<\/span>/);
                
                if (linkMatch && !seen.has(linkMatch[1])) {
                    seen.add(linkMatch[1]);
                    videos.push({
                        vod_id: linkMatch[1],
                        vod_name: cleanText(linkMatch[2] || (imgMatch ? imgMatch[2] : '')),
                        vod_pic: imgMatch ? new URL(imgMatch[1], url).toString() : DEFAULT_PIC,
                        vod_remarks: cleanText(remarksMatch ? remarksMatch[1] : '')
                    });
                }
            }
        } catch (e) {
            console.error('Web search error:', e);
        }
    }

    return {
        page: parseInt(pg),
        pagecount: 999,
        total: 9999,
        list: videos
    };
}

async function proxy(inReq, outResp) {
    const what = inReq.params.what;
    const purl = decodeURIComponent(inReq.params.ids);
    
    if (what === 'hls') {
        const resp = await req(purl, {
            method: 'get',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': url
            }
        });
        
        const plist = HLS.parse(resp.data);
        
        if (plist.variants) {
            for (const v of plist.variants) {
                if (!v.uri.startsWith('http')) {
                    v.uri = new URL(v.uri, purl).toString();
                }
                v.uri = inReq.server.prefix + '/proxy/hls/' + encodeURIComponent(v.uri) + '/.m3u8';
            }
        }
        
        if (plist.segments) {
            for (const s of plist.segments) {
                if (!s.uri.startsWith('http')) {
                    s.uri = new URL(s.uri, purl).toString();
                }
                if (s.key && s.key.uri && !s.key.uri.startsWith('http')) {
                    s.key.uri = new URL(s.key.uri, purl).toString();
                }
                s.uri = inReq.server.prefix + '/proxy/ts/' + encodeURIComponent(s.uri) + '/.ts';
            }
        }
        
        const hls = HLS.stringify(plist);
        let hlsHeaders = {...resp.headers};
        
        if (resp.headers['content-length']) {
            hlsHeaders['content-length'] = hls.length.toString();
        }
        
        delete hlsHeaders['transfer-encoding'];
        delete hlsHeaders['cache-control'];
        
        if (hlsHeaders['content-encoding'] === 'gzip') {
            delete hlsHeaders['content-encoding'];
        }
        
        outResp.code(resp.status).headers(hlsHeaders);
        return hls;
    } else {
        outResp.redirect(purl);
        return;
    }
}

async function test(inReq, outResp) {
    try {
        const printErr = function (json) {
            if (json.statusCode && json.statusCode == 500) {
                console.error(json);
            }
        };
        const prefix = inReq.server.prefix;
        const dataResult = {};
        
        let resp = await inReq.server.inject().post(`${prefix}/init`);
        dataResult.init = resp.json();
        printErr(resp.json());
        
        resp = await inReq.server.inject().post(`${prefix}/home`);
        dataResult.home = resp.json();
        printErr(resp.json());
        
        if (dataResult.home.class && dataResult.home.class.length > 0) {
            resp = await inReq.server.inject().post(`${prefix}/category`).payload({
                id: dataResult.home.class[0].type_id,
                page: 1,
                filter: true,
                filters: {},
            });
            dataResult.category = resp.json();
            printErr(resp.json());
            
            if (dataResult.category.list && dataResult.category.list.length > 0) {
                resp = await inReq.server.inject().post(`${prefix}/detail`).payload({
                    id: dataResult.category.list[0].vod_id,
                });
                dataResult.detail = resp.json();
                printErr(resp.json());
                
                if (dataResult.detail.list && dataResult.detail.list.length > 0) {
                    dataResult.play = [];
                    for (const vod of dataResult.detail.list) {
                        const flags = vod.vod_play_from.split('$$$');
                        const ids = vod.vod_play_url.split('$$$');
                        for (let j = 0; j < flags.length; j++) {
                            const flag = flags[j];
                            const urls = ids[j].split('#');
                            for (let i = 0; i < urls.length && i < 2; i++) {
                                const playUrl = urls[i].split('$')[1];
                                if (playUrl) {
                                    resp = await inReq.server
                                        .inject()
                                        .post(`${prefix}/play`)
                                        .payload({
                                            flag: flag,
                                            id: playUrl,
                                        });
                                    dataResult.play.push(resp.json());
                                }
                            }
                        }
                    }
                }
            }
        }
        
        resp = await inReq.server.inject().post(`${prefix}/search`).payload({
            wd: '爱',
            page: 1,
        });
        dataResult.search = resp.json();
        printErr(resp.json());
        
        return dataResult;
    } catch (err) {
        console.error(err);
        outResp.code(500);
        return { err: err.message, tip: 'check debug console output' };
    }
}

export default {
    meta: {
        key: 'mtyy5',
        name: '麦田影院',
        type: 3,
    },
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/home', home);
        fastify.post('/category', category);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/search', search);
        fastify.get('/proxy/:what/:ids/:end', proxy);
        fastify.get('/test', test);
    },
};
