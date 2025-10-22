import req from '../../util/req.js';
import * as cheerio from 'cheerio';

// 直接从JS规则中提取配置
const config = {
    host: 'https://v.qq.com',
    homeUrl: '/x/bu/pagesheet/list?_all=1&append=1&channel=cartoon&listpage=1&offset=0&pagesize=21&iarea=-1&sort=18',
    detailUrl: 'https://node.video.qq.com/x/api/float_vinfo2?cid=fyid',
    searchUrl: 'https://pbaccess.video.qq.com/trpc.videosearch.smartboxServer.HttpRountRecall/Smartbox?query=**&appID=3172&appKey=lGhFIPeD3HsO9xEp&pageNum=(fypage-1)&pageSize=10'
};

// 直接从JS规则中提取headers
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.139 Safari/537.36',
    'Content-Type': 'application/json',
    'origin': 'https://v.qq.com',
    'referer': 'https://v.qq.com/'
};

// 直接从JS规则中提取的请求函数
async function request(url, options = {}) {
    const defaultOptions = {
        method: 'get',
        headers: headers
    };
    
    if (options.method?.toLowerCase() === 'post') {
        defaultOptions.headers['Content-Type'] = 'application/json';
        if (options.body) {
            defaultOptions.body = JSON.stringify(options.body);
        }
    }
    
    const finalOptions = { ...defaultOptions, ...options };
    let res = await req(url, finalOptions);
    return res.data;
}

// 直接从JS规则中提取的vod1函数
async function vod1(ids) {
    let html1 = await request('https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.MultiTerminalSearch/MbSearch?vplatform=2', {
        method: 'POST',
        body: {
            "version": "25042201",
            "clientType": 1,
            "filterValue": "",
            "uuid": "B1E50847-D25F-4C4B-BBA0-36F0093487F6",
            "retry": 0,
            "query": ids,
            "pagenum": 0,
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
        }
    });
    return html1;
}

async function init(inReq, _outResp) {
    return {
        host: config.host,
        searchUrl: config.searchUrl,
        detailUrl: config.detailUrl
    };
}

async function home(_inReq, _outResp) {
    try {
        // 使用规则中的分类配置，但按照猫影视格式重新组织
        const classes = [
            { type_id: 'choice', type_name: '精选' },
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'tv', type_name: '电视剧' },
            { type_id: 'variety', type_name: '综艺' },
            { type_id: 'cartoon', type_name: '动漫' },
            { type_id: 'child', type_name: '少儿' },
            { type_id: 'doco', type_name: '纪录片' }
        ];

        // 构建过滤器 - 按照猫影视格式
        const filters = {
            "movie": [
                {
                    "key": "sort",
                    "name": "排序",
                    "value": [
                        {"n": "最热", "v": "75"},
                        {"n": "最新", "v": "83"},
                        {"n": "好评", "v": "81"}
                    ]
                },
                {
                    "key": "type", 
                    "name": "类型",
                    "value": [
                        {"n": "全部", "v": "-1"},
                        {"n": "犯罪", "v": "4"},
                        {"n": "励志", "v": "2"},
                        {"n": "喜剧", "v": "100004"},
                        {"n": "热血", "v": "100061"},
                        {"n": "悬疑", "v": "100009"},
                        {"n": "爱情", "v": "100005"},
                        {"n": "科幻", "v": "100012"},
                        {"n": "恐怖", "v": "100010"},
                        {"n": "动画", "v": "100015"}
                    ]
                },
                {
                    "key": "year",
                    "name": "年代",
                    "value": [
                        {"n": "全部", "v": "-1"},
                        {"n": "2025", "v": "2025"},
                        {"n": "2024", "v": "2024"},
                        {"n": "2023", "v": "2023"},
                        {"n": "2022", "v": "2022"},
                        {"n": "2021", "v": "2021"}
                    ]
                }
            ],
            "tv": [
                {
                    "key": "sort",
                    "name": "排序",
                    "value": [
                        {"n": "最热", "v": "75"},
                        {"n": "最新", "v": "79"},
                        {"n": "好评", "v": "16"}
                    ]
                },
                {
                    "key": "feature",
                    "name": "类型",
                    "value": [
                        {"n": "全部", "v": "-1"},
                        {"n": "爱情", "v": "1"},
                        {"n": "古装", "v": "2"},
                        {"n": "悬疑", "v": "3"},
                        {"n": "都市", "v": "4"},
                        {"n": "家庭", "v": "5"},
                        {"n": "喜剧", "v": "6"},
                        {"n": "传奇", "v": "7"},
                        {"n": "武侠", "v": "8"},
                        {"n": "军旅", "v": "9"}
                    ]
                },
                {
                    "key": "iyear",
                    "name": "年代",
                    "value": [
                        {"n": "全部", "v": "-1"},
                        {"n": "2025", "v": "2025"},
                        {"n": "2024", "v": "2024"},
                        {"n": "2023", "v": "2023"},
                        {"n": "2022", "v": "2022"},
                        {"n": "2021", "v": "2021"}
                    ]
                }
            ],
            "cartoon": [
                {
                    "key": "sort",
                    "name": "排序",
                    "value": [
                        {"n": "最热", "v": "75"},
                        {"n": "最新", "v": "83"},
                        {"n": "好评", "v": "81"}
                    ]
                },
                {
                    "key": "area",
                    "name": "地区",
                    "value": [
                        {"n": "全部", "v": "-1"},
                        {"n": "内地", "v": "1"},
                        {"n": "日本", "v": "2"},
                        {"n": "欧美", "v": "3"},
                        {"n": "其他", "v": "4"}
                    ]
                },
                {
                    "key": "type",
                    "name": "类型",
                    "value": [
                        {"n": "全部", "v": "-1"},
                        {"n": "玄幻", "v": "9"},
                        {"n": "科幻", "v": "4"},
                        {"n": "武侠", "v": "13"},
                        {"n": "冒险", "v": "3"},
                        {"n": "战斗", "v": "5"}
                    ]
                }
            ]
        };

        // 为其他分类添加基本过滤器
        ["choice", "variety", "child", "doco"].forEach(type => {
            if (!filters[type]) {
                filters[type] = [
                    {
                        "key": "sort",
                        "name": "排序",
                        "value": [
                            {"n": "最热", "v": "75"},
                            {"n": "最新", "v": "83"}
                        ]
                    }
                ];
            }
        });

        // 获取首页推荐视频
        const homeUrl = `${config.host}${config.homeUrl}`;
        const html = await request(homeUrl);
        const $ = cheerio.load(html);
        
        const videos = [];
        $('.list_item').each((index, element) => {
            const $el = $(element);
            
            // 按照规则中的解析逻辑：img&&alt; img&&src; a&&Text; a&&data-float
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
            filters: filters,
            list: videos
        };
    } catch (error) {
        console.error('首页数据获取失败:', error);
        return {
            class: [],
            filters: {},
            list: []
        };
    }
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page || 1;
    const extend = inReq.body.extend || {};
    
    try {
        // 使用规则中的URL模板
        let url = `${config.host}/x/bu/pagesheet/list?_all=1&append=1&channel=${tid}&listpage=1&offset=${(pg-1)*21}&pagesize=21&iarea=-1`;
        
        // 根据extend参数添加过滤条件
        Object.keys(extend).forEach(key => {
            if (extend[key] && extend[key] !== '-1') {
                url += `&${key}=${extend[key]}`;
            }
        });
        
        const html = await request(url);
        const $ = cheerio.load(html);
        
        // 使用规则中的一级解析逻辑
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

// detail, play, search 函数保持不变...
async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];
    
    try {
        for (const id of ids) {
            let videoId = id;
            
            // 处理可能的分隔符（从规则中的播放URL逻辑推断）
            if (id.includes('$')) {
                const parts = id.split('$');
                videoId = parts[parts.length - 1];
            }
            
            // 使用规则中的detailUrl
            const detailUrl = config.detailUrl.replace('fyid', videoId);
            const data = JSON.parse(await request(detailUrl));
            
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
                
                // 使用规则中的播放列表处理逻辑
                if (data.c.video_ids && data.c.video_ids.length > 0) {
                    const playList = [];
                    
                    if (data.c.video_ids.length === 1) {
                        // 单视频
                        const vid = data.c.video_ids[0];
                        const playUrl = `https://v.qq.com/x/cover/${videoId}/${vid}.html`;
                        playList.push(`正片$${playUrl}`);
                    } else {
                        // 多视频 - 使用规则中的分批处理逻辑
                        const video_list = [];
                        for (let i = 0; i < data.c.video_ids.length; i += 30) {
                            video_list.push(data.c.video_ids.slice(i, i + 30));
                        }
                        
                        for (const batch of video_list) {
                            try {
                                // 使用规则中的Union API获取详细信息
                                const o_url = `https://union.video.qq.com/fcgi-bin/data?otype=json&tid=1804&appid=20001238&appkey=6c03bbe9658448a4&union_platform=1&idlist=${batch.join(',')}`;
                                const o_html = await request(o_url);
                                // 处理JSONP响应
                                const jsonStr = o_html.replace('QZOutputJson=', '').replace(/;$/, '');
                                const episodeData = JSON.parse(jsonStr);
                                
                                episodeData.results.forEach((it1) => {
                                    const fields = it1.fields;
                                    const url = `https://v.qq.com/x/cover/${videoId}/${fields.vid}.html`;
                                    const episodeTitle = fields.title || `第${playList.length + 1}集`;
                                    playList.push(`${episodeTitle}$${url}`);
                                });
                            } catch (episodeError) {
                                // 降级处理：使用简单标题
                                batch.forEach((vid) => {
                                    const playUrl = `https://v.qq.com/x/cover/${videoId}/${vid}.html`;
                                    playList.push(`第${playList.length + 1}集$${playUrl}`);
                                });
                            }
                        }
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
    const id = inReq.body.id; // 原始视频地址
    const flag = inReq.body.flag;

    try {
        console.log(`播放请求 - 原始地址: ${id}`);
        
        // 构建解析API URL
        const parseApiUrl = `http://nas.hxfkof.top:3051/?url=${encodeURIComponent(id)}`;
        
        // 调用解析API获取真实地址（不加请求头）
        console.log(`调用解析API: ${parseApiUrl}`);
        const response = await req(parseApiUrl, {
            method: 'GET'
        });
        
        const result = response.data;
        console.log('解析API返回:', result);
        
        if (result && result.url) {
            // 成功获取到真实地址
            const realUrl = result.url;
            console.log(`获取到真实地址: ${realUrl}`);
            
            return {
                parse: 0, // 0表示不解析，直接播放
                jx: 0,    // 0表示不解析
                url: realUrl, // 返回真实的m3u8地址
                header: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
                    "Accept": "*/*",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                    "Origin": "https://jx.hls.one"
                }
            };
        } else {
            throw new Error('解析API返回格式错误');
        }

    } catch (error) {
        console.error('播放处理失败:', error);
        
        // 直接抛出错误，不降级到Webview
        throw error;
    }
}


async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page || 1;
    
    try {
        // 使用规则中的vod1函数进行搜索
        const html = await vod1(wd);
        const json = JSON.parse(html);
        
        const videos = [];
        
        // 使用规则中的搜索解析逻辑
        if (json.data) {
            // 普通搜索结果
            if (json.data.normalList && json.data.normalList.itemList) {
                json.data.normalList.itemList.forEach(item => {
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
            if (json.data.areaBoxList && json.data.areaBoxList.length > 0) {
                json.data.areaBoxList[0].itemList.forEach(item => {
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
            total: videos.length,
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

// test函数保持不变...
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
        fastify.get('/test', test);
    },
};
