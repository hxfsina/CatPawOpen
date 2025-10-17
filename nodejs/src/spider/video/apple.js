import * as HLS from 'hls-parser';
import req from '../../util/req.js';

let host = 'http://asp.xpgtv.com';
let headers = {
    "User-Agent": "okhttp/3.12.11"
};

async function request(reqUrl, options = {}) {
    const defaultOptions = {
        method: 'get',
        headers: headers
    };
    const finalOptions = { ...defaultOptions, ...options };
    let res = await req(reqUrl, finalOptions);
    return res.data;
}

async function init(inReq, _outResp) {
    // 可以在这里配置host和其他参数
    return {};
}

async function home(_inReq, _outResp) {
    const data = await request(`${host}/api.php/v2.vod/androidtypes`);
    
    let classes = [];
    for (const item of data.data) {
        classes.push({
            type_id: item.type_id.toString(),
            type_name: item.type_name
        });
    }

    // 获取首页视频内容
    const homeVideoData = await request(`${host}/api.php/v2.main/androidhome`);
    let videos = [];
    for (const section of homeVideoData.data.list) {
        videos = videos.concat(getVideoList(section.list));
    }

    return {
        class: classes,
        list: videos
    };
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page || 1;
    const extend = inReq.body.extend || {};
    
    const params = {
        page: pg,
        type: tid,
        area: extend.area || '',
        year: extend.year || '',
        sortby: extend.sortby || '',
        class: extend.classes || ''
    };
    
    // 过滤空参数
    const filteredParams = {};
    for (const [key, value] of Object.entries(params)) {
        if (value) filteredParams[key] = value;
    }
    
    const data = await request(`${host}/api.php/v2.vod/androidfilter10086`, {
        params: filteredParams
    });
    
    return {
        page: parseInt(pg),
        pagecount: 9999,
        limit: 90,
        total: 999999,
        list: getVideoList(data.data)
    };
}

async function detail(inReq, _outResp) {
    const ids = !Array.isArray(inReq.body.id) ? [inReq.body.id] : inReq.body.id;
    const videos = [];
    
    for (const id of ids) {
        const data = await request(`${host}/api.php/v3.vod/androiddetail2?vod_id=${id}`);
        const v = data.data;
        
        let vod = {
            vod_id: v.id || id,
            vod_name: v.name,
            vod_pic: v.pic,
            vod_year: v.year,
            vod_area: v.area,
            vod_lang: v.lang,
            type_name: v.className,
            vod_actor: v.actor,
            vod_director: v.director,
            vod_content: v.content,
            vod_remarks: v.updateInfo || v.score || '',
            vod_play_from: '小苹果',
            vod_play_url: v.urls ? v.urls.map(item => `${item.key}$${item.url}`).join('#') : ''
        };
        videos.push(vod);
    }
    
    return {
        list: videos
    };
}

async function play(inReq, _outResp) {
    const id = inReq.body.id;
    const flag = inReq.body.flag;
    
    const playHeaders = {
        'user_id': 'XPGBOX',
        'token2': 'XFxIummRrngadHB4TCzeUaleebTX10Vl/ftCvGLPeI5tN2Y/liZ5tY5e4t8=',
        'version': 'XPGBOX com.phoenix.tv1.5.5',
        'hash': '524f',
        'screenx': '2331',
        'user-agent': 'okhttp/3.12.11',
        'token': 'VkxTyy6Krh4hd3lrQySUCJlsDYzzxxBbttphr3DiQNhmJkwoyEEm2YEu8qcOFGz2SmxGbIaSC91pa+8+VE9+SPQjGWY/wnqwKk1McYhsGyVVvHRAF0B1mD7922ara1o3k/EwZ1xyManr90EeUSxI7rPOLBwX5zeOri31MeyDfBnIdhckWld4V1k2ZfZ3QKbN',
        'timestamp': '1749174636',
        'screeny': '1121',
    };
    
    let finalUrl = id;
    if (!id.includes('http')) {
        finalUrl = `http://c.xpgtv.net/m3u8/${id}.m3u8`;
    }
    
    return {
        parse: 0,
        url: finalUrl,
        header: playHeaders
    };
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page || 1;
    
    const data = await request(`${host}/api.php/v2.vod/androidsearch10086?page=${pg}&wd=${encodeURIComponent(wd)}`);
    
    return {
        page: parseInt(pg),
        pagecount: 9999,
        limit: 90,
        total: 999999,
        list: getVideoList(data.data)
    };
}

async function proxy(inReq, outResp) {
    const what = inReq.params.what;
    const purl = decodeURIComponent(inReq.params.ids);
    
    if (what === 'hls') {
        const resp = await req(purl, {
            method: 'get',
            headers: headers
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
        let hlsHeaders = {};
        if (resp.headers['content-length']) {
            Object.assign(hlsHeaders, resp.headers, {
                'content-length': hls.length.toString()
            });
        } else {
            Object.assign(hlsHeaders, resp.headers);
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

// 辅助函数
function getVideoList(data) {
    if (!data) return [];
    
    return data.map(vod => {
        let remarks = vod.updateInfo ? `更新至${vod.updateInfo}` : (vod.score || '');
        return {
            vod_id: vod.id.toString(),
            vod_name: vod.name,
            vod_pic: vod.pic,
            vod_remarks: remarks
        };
    });
}

export default {
    meta: {
        key: 'xpg',
        name: '小苹果',
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
