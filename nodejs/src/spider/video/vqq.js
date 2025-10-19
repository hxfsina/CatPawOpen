import req from '../../util/req.js';
import * as cheerio from 'cheerio';

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
    const id = inReq.body.id; // 这是原始视频地址，例如：https://v.qq.com/x/cover/xxx/xxx.html
    const flag = inReq.body.flag;

    try {
        console.log(`播放请求 - 原始地址: ${id}`);

        // 核心修复：直接返回原始地址，并标记为需要解析 (jx: 1)
        // 这样OK影视APP会接管后续的解析工作
        return {
            jx: 1,  // 关键参数：告知APP此地址需要它进行解析
            url: id, // 关键参数：返回未经处理的原始URL
            // 下面这些字段APP可能忽略，但可以保留
            header: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.139 Safari/537.36",
                "Referer": new URL(id).origin,
            }
        };

    } catch (error) {
        console.error('播放处理失败:', error);
        // 即使出错，也返回原始地址和 jx: 1
        return {
            jx: 1,
            url: id,
            header: {}
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
