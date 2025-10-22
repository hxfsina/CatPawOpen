import req from '../../util/req.js';

const config = {
    host: 'https://pianku.api.mgtv.com',
    homeUrl: '',
    searchUrl: 'https://mobileso.bz.mgtv.com/msite/search/v2?q=**&pn=fypage&pc=10',
    detailUrl: 'https://pcweb.api.mgtv.com/episode/list?page=1&size=50&video_id=fyid',
    categoryUrl: '/rider/list/pcweb/v3?platform=pcweb&channelId=fyclass&pn=fypage&pc=80&hudong=1&_support=10000000&kind=a1&area=a1'
};

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.139 Safari/537.36",
    "Content-Type": "application/json",
    "origin": "https://www.mgtv.com",
    "referer": "https://www.mgtv.com/"
};

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
        parsers: parsers.map(p => p.name)
    };
}

async function home(_inReq, _outResp) {
    try {
        const classes = [
            { type_id: '2', type_name: '电视剧' },
            { type_id: '3', type_name: '电影' },
            { type_id: '1', type_name: '综艺' },
            { type_id: '50', type_name: '动漫' },
            { type_id: '51', type_name: '纪录片' },
            { type_id: '115', type_name: '教育' },
            { type_id: '10', type_name: '少儿' }
        ];

        // 构建过滤器
        const filters = {
            "2": [
                {
                    "key": "chargeInfo",
                    "name": "付费类型",
                    "value": [
                        {"n": "全部", "v": "all"},
                        {"n": "免费", "v": "b1"},
                        {"n": "vip", "v": "b2"},
                        {"n": "VIP用券", "v": "b3"},
                        {"n": "付费点播", "v": "b4"}
                    ]
                },
                {
                    "key": "sort",
                    "name": "排序",
                    "value": [
                        {"n": "最新", "v": "c1"},
                        {"n": "最热", "v": "c2"},
                        {"n": "知乎高分", "v": "c4"}
                    ]
                },
                {
                    "key": "year",
                    "name": "年代",
                    "value": [
                        {"n": "全部", "v": "all"},
                        {"n": "2025", "v": "2025"},
                        {"n": "2024", "v": "2024"},
                        {"n": "2023", "v": "2023"},
                        {"n": "2022", "v": "2022"},
                        {"n": "2021", "v": "2021"},
                        {"n": "2020", "v": "2020"},
                        {"n": "2019", "v": "2019"},
                        {"n": "2018", "v": "2018"},
                        {"n": "2017", "v": "2017"},
                        {"n": "2016", "v": "2016"},
                        {"n": "2015", "v": "2015"},
                        {"n": "2014", "v": "2014"},
                        {"n": "2013", "v": "2013"},
                        {"n": "2012", "v": "2012"},
                        {"n": "2011", "v": "2011"},
                        {"n": "2010", "v": "2010"},
                        {"n": "2009", "v": "2009"},
                        {"n": "2008", "v": "2008"},
                        {"n": "2007", "v": "2007"},
                        {"n": "2006", "v": "2006"},
                        {"n": "2005", "v": "2005"},
                        {"n": "2004", "v": "2004"}
                    ]
                }
            ]
        };

        // 为所有分类添加相同的过滤器
        ['3', '1', '50', '51', '115', '10'].forEach(tid => {
            filters[tid] = JSON.parse(JSON.stringify(filters['2']));
        });

        return {
            class: classes,
            filters: filters,
            list: [] // 首页推荐视频可以为空
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

async function homeVideoContent(_inReq, _outResp) {
    // 首页推荐视频，可以返回空或调用某个接口获取
    return { list: [] };
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page || 1;
    const extend = inReq.body.filters || {}; // 修改这里：使用filters而不是extend
    
    try {
        // 构建分类URL
        let url = `${config.host}${config.categoryUrl}`
            .replace('fyclass', tid)
            .replace('fypage', pg);
        
        // 添加过滤参数
        if (extend.year && extend.year !== 'all') {
            url += `&year=${extend.year}`;
        }
        if (extend.sort && extend.sort !== 'all') {
            url += `&sort=${extend.sort}`;
        }
        if (extend.chargeInfo && extend.chargeInfo !== 'all') {
            url += `&chargeInfo=${extend.chargeInfo}`;
        }
        
        const data = await request(url);
        
        const videos = [];
        if (data && data.data && data.data.hitDocs) {
            data.data.hitDocs.forEach(item => {
                if (item.title && item.img) {
                    // 构建详细信息字符串：title|subtitle|year|story
                    const infoStr = `${item.title}|${item.subtitle || ''}|${item.year || ''}|${item.story || ''}`;
                    videos.push({
                        vod_id: `${infoStr}$${item.playPartId || `mgtv_${item.id}`}`,
                        vod_name: item.title,
                        vod_pic: item.img,
                        vod_remarks: item.updateInfo || item.rightCorner?.text || item.year
                    });
                }
            });
        }

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
            let title = '';
            let subtitle = '';
            let year = '';
            let story = '';
            let isFromCategory = false;
            
            // 处理分类列表的ID格式（信息$视频ID）
            if (id.includes('$') && id.includes('|')) {
                const parts = id.split('$');
                if (parts.length === 2) {
                    // 解析详细信息：title|subtitle|year|story
                    const infoParts = parts[0].split('|');
                    title = infoParts[0] || '';
                    subtitle = infoParts[1] || '';
                    year = infoParts[2] || '';
                    story = infoParts[3] || '';
                    videoId = parts[1];
                    isFromCategory = true;
                }
            } else if (id.includes('$')) {
                // 处理搜索结果的ID格式（分类$视频ID）
                const parts = id.split('$');
                if (parts.length === 2) {
                    videoId = parts[1];
                }
            }
            
            const detailUrl = config.detailUrl.replace('fyid', videoId);
            const data = await request(detailUrl);
            
            if (data && data.data && data.data.list) {
                const episodes = data.data.list;
                
                // 获取视频基本信息
                const mainInfo = episodes[0] || {};
                let vod = {
                    vod_id: videoId,
                    vod_pic: mainInfo.img || '',
                    vod_area: mainInfo.area || '',
                    type_name: mainInfo.category || '',
                    vod_director: mainInfo.director || '',
                    vod_play_from: '芒果TV',
                    vod_play_url: ''
                };
                
                // 区分来源设置不同的字段
                if (isFromCategory) {
                    // 来自分类列表，使用传递的信息
                    vod.vod_name = title || (mainInfo.t3 ? mainInfo.t3.replace(/第\d+集/, '').trim() : '未知标题');
                    vod.vod_actor = subtitle || mainInfo.actor || '';
                    vod.vod_year = year || mainInfo.year || '';
                    vod.vod_content = story || mainInfo.t2 || '';
                    vod.vod_remarks = mainInfo.t2 || '';
                } else {
                    // 来自搜索列表，使用详情API的信息
                    vod.vod_name = (mainInfo.t3 ? mainInfo.t3.replace(/第\d+集/, '').trim() : '未知标题');
                    vod.vod_actor = mainInfo.actor || '';
                    vod.vod_year = mainInfo.year || '';
                    vod.vod_content = mainInfo.t2 || '';
                    vod.vod_remarks = mainInfo.t2 || '';
                }
                
                // 处理播放列表
                const playList = [];
                episodes.forEach((episode, index) => {
                    if (episode.isIntact === "1") {
                        const playUrl = `https://www.mgtv.com${episode.url}`;
                        
                        // 根据剧集数量决定标题
                        let title;
                        if (episodes.length > 1) {
                            // 多集情况：使用t1字段或默认集数
                            title = episode.t1 || `第${index + 1}集`;
                        } else {
                            // 单集情况：使用"正片"
                            title = '正片';
                        }
                        
                        playList.push(`${title}$${playUrl}`);
                    }
                });
                
                vod.vod_play_url = playList.join('#');
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
        const parseApiUrl = `http://nas.hxfkof.top:3057/?url=${encodeURIComponent(id)}`;
        
        // 调用解析API获取真实地址
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
            // 从真实URL中提取host
            let hostHeader = '';
            try {
                const urlObj = new URL(realUrl);
                hostHeader = urlObj.host;
            } catch (e) {
                console.log('解析URL失败，使用默认host');
                hostHeader = 'pcvideoaliyun.titan.mgtv.com';
            }
            return {
                parse: 0, // 0表示不解析，直接播放
                jx: 0,    // 0表示不解析
                url: realUrl, // 返回真实的m3u8地址
                header: {
                    "Accept": "*/*",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                    "Connection": "keep-alive",
                    "Host": hostHeader,
                    "Origin": "https://www.mgtv.com",
                    "Referer": "https://www.mgtv.com/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0"
                }
            };
        } else {
            throw new Error('解析API返回格式错误');
        }

    } catch (error) {
        console.error('播放处理失败:', error);
        throw error;
    }
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page || 1;
    
    try {
        // 构建搜索URL
        const searchUrl = config.searchUrl
            .replace('**', encodeURIComponent(wd))
            .replace('fypage', pg);
        
        const data = await request(searchUrl);
        
        const videos = [];
        
        if (data && data.data && data.data.contents) {
            data.data.contents.forEach(item => {
                if (item.type && item.type === 'media' && item.data && item.data.length > 0) {
                    const mediaItem = item.data[0];
                    if (mediaItem.source === "imgo") {
                        const desc = mediaItem.desc ? mediaItem.desc.join(',') : '';
                        let fyclass = '';
                        
                        try {
                            fyclass = mediaItem.rpt ? mediaItem.rpt.match(/idx=(.*?)&/)[1] + '$' : '';
                        } catch (e) {
                            console.log('解析分类失败:', e.message);
                        }
                        
                        const videoId = fyclass + mediaItem.url.match(/.*\/(.*?)\.html/)[1];
                        
                        videos.push({
                            vod_id: videoId,
                            vod_name: mediaItem.title.replace(/<B>|<\/B>/g, ''),
                            vod_pic: mediaItem.img || '',
                            vod_remarks: desc
                        });
                    }
                }
            });
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
        key: 'mgtv',
        name: '🥭『芒果TV』',
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
