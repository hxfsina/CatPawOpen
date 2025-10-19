import req from '../../util/req.js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const config = {
    host: 'https://v.qq.com',
    homeUrl: '/x/bu/pagesheet/list?_all=1&append=1&channel=cartoon&listpage=1&offset=0&pagesize=21&iarea=-1&sort=18',
    searchUrl: 'https://pbaccess.video.qq.com/trpc.videosearch.smartboxServer.HttpRountRecall/Smartbox?query=**&appID=3172&appKey=lGhFIPeD3HsO9xEp&pageNum=(fypage-1)&pageSize=10',
    detailUrl: 'https://node.video.qq.com/x/api/float_vinfo2?cid=fyid',
    // 外部解析配置
    parseUrl: 'https://jx.hls.one/?url='
};

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.139 Safari/537.36",
    "Content-Type": "application/json",
    "origin": "https://v.qq.com",
    "referer": "https://v.qq.com/"
};

// 解析器配置 - 对应你的 parses 配置
const parsers = [
    {
        name: "ikun",
        type: 0,
        url: "https://jx.hls.one/?url="
    }
    // 可以添加更多解析器
];

async function request(url, options = {}) {
    const defaultOptions = {
        method: 'get',
        headers: headers
    };
    
    if (options.method?.toLowerCase() === 'post' && !options.headers?.['Content-Type']) {
        defaultOptions.headers['Content-Type'] = 'application/json';
    }
    
    const finalOptions = { ...defaultOptions, ...options };
    let res = await req(url, finalOptions);
    return res.data;
}

// 新增：通过外部解析器获取真实播放地址
async function parseVideoUrl(originalUrl) {
    try {
        // 使用配置的第一个解析器
        const parser = parsers[0];
        const parseApi = `${parser.url}${encodeURIComponent(originalUrl)}`;
        
        console.log(`使用解析器: ${parser.name}, 解析URL: ${originalUrl}`);
        
        // 调用解析接口
        const response = await request(parseApi, {
            headers: {
                "User-Agent": "okhttp/3.14.9",
                "Referer": originalUrl
            }
        });
        
        // 解析响应，获取真实播放地址
        // 这里需要根据具体解析器的返回格式进行调整
        let realUrl = originalUrl; // 默认返回原URL
        
        if (typeof response === 'string') {
            // 如果是字符串响应，尝试提取播放地址
            const $ = cheerio.load(response);
            
            // 尝试多种选择器获取播放地址
            const iframeSrc = $('iframe').attr('src');
            const videoSrc = $('video source').attr('src');
            const scriptContent = $('script').html();
            
            if (iframeSrc && iframeSrc.includes('http')) {
                realUrl = iframeSrc;
            } else if (videoSrc && videoSrc.includes('http')) {
                realUrl = videoSrc;
            } else if (scriptContent) {
                // 从JavaScript代码中提取URL
                const urlMatch = scriptContent.match(/http[^"']*\.(m3u8|mp4)[^"']*/);
                if (urlMatch) {
                    realUrl = urlMatch[0];
                }
            }
        } else if (response && response.url) {
            // 如果是JSON响应，包含url字段
            realUrl = response.url;
        }
        
        console.log(`解析结果: ${realUrl}`);
        return realUrl;
        
    } catch (error) {
        console.error('解析播放地址失败:', error);
        return originalUrl; // 解析失败返回原URL
    }
}

// 新增：检测是否为直接播放的URL
function isDirectPlayUrl(url) {
    return url.includes('.m3u8') || 
           url.includes('.mp4') || 
           url.includes('.flv') || 
           url.includes('.avi') || 
           url.includes('.mkv');
}

async function init(inReq, _outResp) {
    return {
        host: config.host,
        searchUrl: config.searchUrl,
        detailUrl: config.detailUrl,
        parsers: parsers.map(p => p.name) // 返回可用的解析器
    };
}

async function home(_inReq, _outResp) {
    try {
        // 获取首页数据
        const homeUrl = `${config.host}${config.homeUrl}`;
        const html = await request(homeUrl);
        const $ = cheerio.load(html);
        
        // 解析分类
        const classes = [
            { type_id: 'choice', type_name: '精选' },
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'tv', type_name: '电视剧' },
            { type_id: 'variety', type_name: '综艺' },
            { type_id: 'cartoon', type_name: '动漫' },
            { type_id: 'child', type_name: '少儿' },
            { type_id: 'doco', type_name: '纪录片' }
        ];

        // 解析首页推荐视频
        const videos = [];
        $('.list_item').each((index, element) => {
            const $el = $(element);
            const title = $el.find('img').attr('alt') || '';
            const pic = $el.find('img').attr('src') || '';
            const desc = $el.find('a').text() || '';
            const url = $el.find('a').attr('data-float') || '';
            
            if (title && pic) {
                videos.push({
                    vod_id: url || `video_${index}`,
                    vod_name: title,
                    vod_pic: pic.startsWith('http') ? pic : `${config.host}${pic}`,
                    vod_remarks: desc
                });
            }
        });

        return {
            class: classes,
            list: videos
        };
    } catch (error) {
        console.error('首页数据获取失败:', error);
        return {
            class: [],
            list: []
        };
    }
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page || 1;
    const extend = inReq.body.extend || {};
    
    try {
        // 构建分类URL
        let url = `${config.host}/x/bu/pagesheet/list?_all=1&append=1&channel=${tid}&listpage=1&offset=${(pg-1)*21}&pagesize=21&iarea=-1`;
        
        // 添加过滤参数
        if (extend.sort) {
            url += `&sort=${extend.sort}`;
        }
        if (extend.iyear && extend.iyear !== '-1') {
            url += `&iyear=${extend.iyear}`;
        }
        if (extend.year && extend.year !== '-1') {
            url += `&year=${extend.year}`;
        }
        
        const html = await request(url);
        const $ = cheerio.load(html);
        
        const videos = [];
        $('.list_item').each((index, element) => {
            const $el = $(element);
            const title = $el.find('img').attr('alt') || '';
            const pic = $el.find('img').attr('src') || '';
            const desc = $el.find('a').text() || '';
            const url = $el.find('a').attr('data-float') || '';
            
            if (title && pic) {
                videos.push({
                    vod_id: url || `${tid}_${index}`,
                    vod_name: title,
                    vod_pic: pic.startsWith('http') ? pic : `${config.host}${pic}`,
                    vod_remarks: desc
                });
            }
        });

        return {
            page: parseInt(pg),
            pagecount: 999,
            limit: 20,
            total: 9999,
            list: videos
        };
    } catch (error) {
        console.error('分类数据获取失败:', error);
        return {
            page: parseInt(pg),
            pagecount: 1,
            limit: 20,
            total: 0,
            list: []
        };
    }
}

async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];
    
    try {
        for (const id of ids) {
            let videoId = id;
            let category = '';
            
            if (id.includes('$')) {
                [category, videoId] = id.split('$');
            }
            
            const detailUrl = config.detailUrl.replace('fyid', videoId);
            const data = await request(detailUrl);
            
            if (data && data.c) {
                const v = data.c;
                let vod = {
                    vod_id: videoId,
                    vod_name: v.title || '未知标题',
                    vod_pic: v.pic || '',
                    vod_year: v.year || '',
                    vod_area: v.area || '',
                    type_name: data.typ ? data.typ.join(',') : '',
                    vod_actor: data.nam ? data.nam.join(',') : '',
                    vod_director: v.director || '',
                    vod_content: v.description || '',
                    vod_remarks: data.rec || '',
                    vod_play_from: '腾讯视频',
                    vod_play_url: ''
                };
                
                // 处理播放列表 - 生成需要解析的原始URL
                if (data.c.video_ids && data.c.video_ids.length > 0) {
                    const playList = [];
                    
                    if (data.c.video_ids.length === 1) {
                        const vid = data.c.video_ids[0];
                        const playUrl = `https://v.qq.com/x/cover/${videoId}/${vid}.html`;
                        playList.push(`正片$${playUrl}`);
                    } else {
                        data.c.video_ids.forEach((vid, index) => {
                            const playUrl = `https://v.qq.com/x/cover/${videoId}/${vid}.html`;
                            playList.push(`第${index + 1}集$${playUrl}`);
                        });
                    }
                    
                    vod.vod_play_url = playList.join('#');
                }
                
                videos.push(vod);
            }
        }
        
        return { list: videos };
    } catch (error) {
        console.error('详情数据获取失败:', error);
        return { list: [] };
    }
}

async function play(inReq, _outResp) {
    const id = inReq.body.id; // 原始视频详情页URL
    try {
        console.log(`播放请求: ${id}`);

        // 1. 启动 Puppeteer 浏览器
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // 2. 设置 User-Agent
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
        );

        // 3. 拦截请求，抓取 m3u8
        let m3u8Url = null;
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const url = req.url();
            if (url.endsWith('.m3u8')) {
                m3u8Url = url;
            }
            req.continue();
        });

        // 4. 打开解析器页面
        const parseUrl = `https://jx.hls.one/?url=${encodeURIComponent(id)}`;
        await page.goto(parseUrl, { waitUntil: 'networkidle2', timeout: 15000 });

        // 5. 等待 video 标签加载
        try {
            await page.waitForSelector('video', { timeout: 5000 });
            const videoSrc = await page.$eval('video', el => el.src);
            if (videoSrc && videoSrc.includes('.m3u8')) {
                m3u8Url = videoSrc;
            }
        } catch (e) {
            // video 标签可能不存在
        }

        await browser.close();

        let finalUrl = id;
        let parse = 1;

        if (m3u8Url) {
            finalUrl = m3u8Url;
            parse = 0;
            console.log('成功获取 m3u8 地址:', m3u8Url);
        } else {
            console.log('未获取到 m3u8 地址，使用原始URL');
        }

        return {
            parse: parse,
            url: finalUrl,
            header: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
                "Referer": "https://jx.hls.one/",
                "Origin": "https://jx.hls.one",
                "Accept": "*/*"
            }
        };
    } catch (error) {
        console.error('播放处理失败:', error);
        return {
            parse: 1,
            url: id,
            header: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
                "Referer": "https://jx.hls.one/",
                "Origin": "https://jx.hls.one",
                "Accept": "*/*"
            }
        };
    }
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page || 1;
    
    try {
        // 构建搜索URL
        const searchUrl = config.searchUrl
            .replace('**', encodeURIComponent(wd))
            .replace('(fypage-1)', (pg - 1));
        
        const data = await request(searchUrl, {
            method: 'POST',
            body: JSON.stringify({
                "version": "25042201",
                "clientType": 1,
                "filterValue": "",
                "uuid": "B1E50847-D25F-4C4B-BBA0-36F0093487F6",
                "retry": 0,
                "query": wd,
                "pagenum": pg - 1,
                "isPrefetch": true,
                "pagesize": 30,
                "queryFrom": 0,
                "searchDatakey": "",
                "transInfo": "",
                "isneedQc": true,
                "preQid": "",
                "adClientInfo": "",
                "extraInfo": {
                    "isNewMarkLabel": "1",
                    "multi_terminal_pc": "1",
                    "themeType": "1",
                    "sugRelatedIds": "{}",
                    "appVersion": ""
                }
            })
        });
        
        const videos = [];
        
        // 解析搜索结果
        if (data && data.data) {
            // 普通搜索结果
            if (data.data.normalList && data.data.normalList.itemList) {
                data.data.normalList.itemList.forEach(item => {
                    if (item.videoInfo && item.doc && item.doc.id.length > 11) {
                        videos.push({
                            vod_id: item.doc.id,
                            vod_name: item.videoInfo.title,
                            vod_pic: item.videoInfo.imgUrl,
                            vod_remarks: item.videoInfo.desc || ''
                        });
                    }
                });
            }
            
            // 区域搜索结果
            if (data.data.areaBoxList && data.data.areaBoxList.length > 0) {
                data.data.areaBoxList[0].itemList.forEach(item => {
                    if (item.videoInfo && item.videoInfo.title.includes(wd) && 
                        item.doc && item.doc.id.length > 11) {
                        videos.push({
                            vod_id: item.doc.id,
                            vod_name: item.videoInfo.title,
                            vod_pic: item.videoInfo.imgUrl,
                            vod_remarks: item.videoInfo.desc || ''
                        });
                    }
                });
            }
        }
        
        return {
            page: parseInt(pg),
            pagecount: 10,
            limit: 20,
            total: 100,
            list: videos
        };
    } catch (error) {
        console.error('搜索失败:', error);
        return {
            page: parseInt(pg),
            pagecount: 1,
            limit: 20,
            total: 0,
            list: []
        };
    }
}



// 新增：测试解析器的函数
async function testParser(inReq, _outResp) {
    const testUrl = inReq.body.url || 'https://v.qq.com/x/cover/mzc00200g36s4qd.html';
    
    try {
        const result = await parseVideoUrl(testUrl);
        return {
            success: true,
            originalUrl: testUrl,
            parsedUrl: result,
            isDirectPlay: isDirectPlayUrl(result),
            parser: parsers[0].name
        };
    } catch (error) {
        return {
            success: false,
            originalUrl: testUrl,
            error: error.message,
            parser: parsers[0].name
        };
    }
}

async function test(inReq, outResp) {
    try {
        const printErr = function (json) {
            if (json.statusCode && json.statusCode === 500) {
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
                filter: false,
                extend: {}
            });
            dataResult.category = resp.json();
            printErr(resp.json());
            
            if (dataResult.category.list && dataResult.category.list.length > 0) {
                resp = await inReq.server.inject().post(`${prefix}/detail`).payload({
                    id: dataResult.category.list[0].vod_id
                });
                dataResult.detail = resp.json();
                printErr(resp.json());
                
                if (dataResult.detail.list && dataResult.detail.list.length > 0) {
                    dataResult.play = [];
                    const vod = dataResult.detail.list[0];
                    if (vod.vod_play_url) {
                        const playUrls = vod.vod_play_url.split('#');
                        for (let i = 0; i < Math.min(playUrls.length, 2); i++) {
                            const parts = playUrls[i].split('$');
                            if (parts.length === 2) {
                                resp = await inReq.server.inject()
                                    .post(`${prefix}/play`)
                                    .payload({
                                        flag: vod.vod_play_from,
                                        id: parts[1]
                                    });
                                dataResult.play.push(resp.json());
                            }
                        }
                    }
                }
            }
        }
        
        resp = await inReq.server.inject().post(`${prefix}/search`).payload({
            wd: '测试',
            page: 1
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
        key: 'tencent',
        name: '🐧『腾讯视频』',
        type: 3,
    },
    api: async (fastify) => {
        fastify.post('/init', init);
        fastify.post('/home', home);
        fastify.post('/category', category);
        fastify.post('/detail', detail);
        fastify.post('/play', play);
        fastify.post('/search', search);
        fastify.post('/test-parser', testParser); // 新增测试接口
        fastify.get('/test', test);
    },
};
