import req from '../../util/req.js';

let url = 'http://asp.xpgtv.com';
let categories = [];

const headers = {
    "User-Agent": "okhttp/3.12.11"
};

const playHeaders = {
    'user_id': 'XPGBOX',
    'token2': 'XFxIummRrngadHB4TCzeUaleebTX10Vl/ftCvGLPeI5tN2Y/liZ5tY5e4t8=',
    'version': 'XPGBOX com.phoenix.tv1.5.5',
    'hash': '524f',
    'screenx': '2331',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
    'token': 'VkxTyy6Krh4hd3lrQySUCJlsDYzzxxBbttphr3DiQNhmJkwoyEEm2YEu8qcOFGz2SmxGbIaSC91pa+8+VE9+SPQjGWY/wnqwKk1McYhsGyVVvHRAF0B1mD7922ara1o3k/EwZ1xyManr90EeUSxI7rPOLBwX5zeOri31MeyDfBnIdhckWld4V1k2ZfZ3QKbN',
    'timestamp': '1749174636',
    'screeny': '1121',
};

async function request(reqUrl, params = {}, customHeaders = {}) {
    const options = {
        method: 'get',
        headers: {...headers, ...customHeaders},
        timeout: 15000
    };
    
    if (Object.keys(params).length > 0) {
        options.params = params;
    }
    
    let res = await req(reqUrl, options);
    return res.data;
}

async function init(inReq, _outResp) {
    if (inReq.server.config.xpgtv) {
        url = inReq.server.config.xpgtv.url || url;
        categories = inReq.server.config.xpgtv.categories || [];
    }
    return {};
}

async function home(_inReq, _outResp) {
    // 获取分类数据
    const data = await request(`${url}/api.php/v2.vod/androidtypes`);
    const dy = {
        "classes": "类型",
        "areas": "地区", 
        "years": "年份",
        "sortby": "排序",
    };
    
    const filters = {};
    let classes = []; // 改为 let 声明
    const list = [];

    // 处理分类和过滤器
    for (const item of data.data) {
        let hasNonEmptyField = false;
        item.sortby = ['updatetime', 'hits', 'score'];
        const demos = ['时间', '人气', '评分'];
        
        classes.push({
            type_name: item.type_name,
            type_id: String(item.type_id)
        });

        // 检查是否有非空字段
        for (const key in dy) {
            if (item[key] && item[key].length > 1) {
                hasNonEmptyField = true;
                break;
            }
        }

        if (hasNonEmptyField) {
            filters[String(item.type_id)] = [];
            for (const dkey in item) {
                if (dy[dkey] && item[dkey] && item[dkey].length > 1) {
                    const values = item[dkey];
                    const valueArray = [];
                    
                    for (let idx = 0; idx < values.length; idx++) {
                        const value = values[idx].trim();
                        if (value !== "") {
                            valueArray.push({
                                n: dkey === "sortby" ? demos[idx] : value,
                                v: value
                            });
                        }
                    }
                    
                    filters[String(item.type_id)].push({
                        key: dkey,
                        name: dy[dkey],
                        value: valueArray
                    });
                }
            }
        }
    }

    // 获取首页视频内容
    try {
        const rsp = await request(`${url}/api.php/v2.main/androidhome`);
        for (const i of rsp.data.list) {
            list.push(...getList(i.list));
        }
    } catch (e) {
        console.error('Get home video error:', e);
    }

    // 修复：使用新变量进行过滤和排序
    if (categories.length > 0) {
        const filteredClasses = classes.filter(cls => categories.includes(cls.type_name));
        classes = filteredClasses.sort((a, b) => categories.indexOf(a.type_name) - categories.indexOf(b.type_name));
    }

    return {
        class: classes,
        list: list,
        filters: filters
    };
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page || 1;
    const extend = inReq.body.extend || {};
    
    const params = {
        page: pg,
        type: tid,
        area: extend.areaes || '',
        year: extend.yeares || '',
        sortby: extend.sortby || '',
        class: extend.classes || ''
    };
    
    // 过滤空参数
    const filteredParams = {};
    for (const key in params) {
        if (params[key]) {
            filteredParams[key] = params[key];
        }
    }
    
    const rsp = await request(`${url}/api.php/v2.vod/androidfilter10086`, filteredParams);
    
    return {
        list: getList(rsp.data),
        page: parseInt(pg),
        pagecount: 9999,
        limit: 90,
        total: 999999
    };
}

async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];
    
    for (const id of ids) {
        const rsp = await request(`${url}/api.php/v3.vod/androiddetail2?vod_id=${id}`);
        const v = rsp.data;
        
        // 构建播放列表
        const playUrls = [];
        if (v.urls && Array.isArray(v.urls)) {
            for (const item of v.urls) {
                playUrls.push(`${item.key}$${item.url}`);
            }
        }
        
        const vod = {
            vod_id: id,
            vod_name: v.name || '',
            vod_pic: v.pic || '',
            vod_year: v.year || '',
            vod_area: v.area || '',
            vod_lang: v.lang || '',
            type_name: v.className || '',
            vod_actor: v.actor || '',
            vod_director: v.director || '',
            vod_content: v.content || '',
            vod_play_from: '小苹果＇',
            vod_play_url: playUrls.join('#'),
            vod_remarks: v.updateInfo ? `更新至${v.updateInfo}` : v.score || ''
        };
        
        videos.push(vod);
    }
    
    return {
        list: videos
    };
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page || 1;
    
    const rsp = await request(`${url}/api.php/v2.vod/androidsearch10086?page=${pg}&wd=${encodeURIComponent(wd)}`);
    
    return {
        list: getList(rsp.data),
        page: parseInt(pg),
        pagecount: 9999,
        limit: 90,
        total: 999999
    };
}

async function play(inReq, _outResp) {
    let playUrl = inReq.body.id;
    
    // 如果URL不是http开头，构建m3u8地址
    if (!playUrl.startsWith('http')) {
        playUrl = `http://c.xpgtv.net/m3u8/${playUrl}.m3u8`;
    }
    
    return {
        parse: 0,
        url: playUrl,
        header: playHeaders
    };
}

// 辅助函数：处理视频列表
function getList(data) {
    const videos = [];
    
    if (!data || !Array.isArray(data)) {
        return videos;
    }
    
    for (const vod of data) {
        let remarks = '';
        if (vod.updateInfo) {
            remarks = `更新至${vod.updateInfo}`;
        } else if (vod.score) {
            remarks = vod.score;
        }
        
        videos.push({
            vod_id: vod.id,
            vod_name: vod.name || '',
            vod_pic: vod.pic || '',
            vod_remarks: remarks
        });
    }
    
    return videos;
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
                    const vod = dataResult.detail.list[0];
                    if (vod.vod_play_url) {
                        const urls = vod.vod_play_url.split('#');
                        for (let i = 0; i < urls.length && i < 2; i++) {
                            const playUrl = urls[i].split('$')[1];
                            if (playUrl) {
                                resp = await inReq.server
                                    .inject()
                                    .post(`${prefix}/play`)
                                    .payload({
                                        flag: vod.vod_play_from,
                                        id: playUrl,
                                    });
                                dataResult.play.push(resp.json());
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
        key: 'xpgtv',
        name: 'XPGGTV',
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
