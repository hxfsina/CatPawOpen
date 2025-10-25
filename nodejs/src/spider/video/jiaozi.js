import req from '../../util/req.js';

// 饺子影院API基础域名 - 需要根据实际情况配置
const API_BASE = 'http://nas.hxfkof.top:3059';

let url = '';
let categories = [];

async function request(reqUrl) {
    let res = await req(reqUrl, {
        method: 'get',
    });
    return res.data;
}

async function init(inReq, _outResp) {
    // 初始化配置
    url = inReq.server.config.jiaozi?.url || '';
    categories = inReq.server.config.jiaozi?.categories || [];
    return {};
}

async function home(_inReq, _outResp) {
    try {
        const response = await req.get(`${API_BASE}/api/categories`);
        const data = response.data.data;
        
        return {
            class: data.class || [],
            filters: data.filters || {},
            list: [] // 必须包含list字段，即使为空
        };
    } catch (error) {
        console.error('获取首页分类失败:', error);
        return {
            class: [],
            filters: {},
            list: []
        };
    }
}

async function category(inReq, _outResp) {
    const tid = inReq.body.id;
    const pg = inReq.body.page;
    const extend = inReq.body.filters || {};
    
    let page = pg || 1;
    if (page == 0) page = 1;

    try {
        console.log(`获取分类内容: tid=${tid}, page=${page}, filters=`, extend);
        
        // 构建查询参数
        const params = new URLSearchParams({
            cid: tid,
            page: page.toString()
        });
        
        // 添加筛选条件
        if (extend.area && extend.area !== 'all') {
            params.append('area', extend.area);
        }
        if (extend.year && extend.year !== 'all') {
            params.append('year', extend.year);
        }
        if (extend.state && extend.state !== 'all') {
            params.append('state', extend.state);
        }
        if (extend.order && extend.order !== 'time') {
            params.append('order', extend.order);
        }
        
        console.log(`请求URL: ${API_BASE}/api/category?${params.toString()}`);
        
        const response = await req.get(`${API_BASE}/api/category?${params.toString()}`);
        
        const data = response.data.data;
        const videos = data.list || [];
        
        console.log(`API返回 ${videos.length} 个视频, 总页数 ${data.pagecount}`);
        
        return {
            page: parseInt(page),
            pagecount: data.pagecount || 1,
            limit: 20,
            total: data.total || videos.length,
            list: videos.map(item => ({
                vod_id: item.vod_id,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_remarks: item.vod_remarks
            })),
        };
    } catch (error) {
        console.error('获取分类内容失败:', error);
        return {
            page: parseInt(page),
            pagecount: 1,
            limit: 20,
            total: 0,
            list: []
        };
    }
}

async function detail(inReq, _outResp) {
    const id = inReq.body.id;
    
    try {
        console.log(`获取视频详情: id=${id}`);
        const response = await req.get(`${API_BASE}/api/detail?did=${encodeURIComponent(id)}`);
        
        const data = response.data.data;
        
        // 转换数据结构为猫影视需要的格式
        const videoDetail = {
            vod_id: data.vod_id,
            vod_name: data.vod_name,
            vod_pic: data.vod_pic,
            vod_remarks: data.vod_remarks,
            vod_year: data.vod_year,
            vod_area: data.vod_area,
            vod_actor: data.vod_actor,
            vod_director: data.vod_director,
            vod_content: data.vod_content,
            vod_play_from: data.vod_play_from,
            vod_play_url: data.vod_play_url          
        };
        
        console.log(`成功获取视频详情: ${videoDetail.vod_name}`);
        
        return {
            list: [videoDetail],
        };
    } catch (error) {
        console.error('获取视频详情失败:', error);
        return {
            list: [],
        };
    }
}

async function play(inReq, _outResp) {
    const flag = inReq.body.flag;
    const id = inReq.body.id;

    try {
        console.log(`获取播放地址: flag=${flag}, id=${id}`);
        
        // 将线路名称转换为数字标识
        const lineNameToId = {
            '线路1': '0',
            '线路2': '1',
            '线路3': '2',
            '线路4': '3',
            '线路5': '4',
            '线路6': '5',
            '线路7': '6',
            '网盘': '7'
        };
        
        let lineFlag = '0'; // 默认使用线路1
        if (flag && lineNameToId[flag]) {
            lineFlag = lineNameToId[flag];
        } else if (flag && !isNaN(parseInt(flag))) {
            // 如果已经是数字，直接使用
            lineFlag = flag;
        }
        
        // 解析播放URL，提取pid参数
        let pid = id;
        if (id.includes('$')) {
            // 如果是完整播放URL格式，提取$后面的部分
            pid = id.split('$')[1];
        }
        
        console.log(`转换后的参数: lineFlag=${lineFlag}, pid=${pid}`);
        
        const response = await req.get(`${API_BASE}/api/player?flag=${lineFlag}&pid=${encodeURIComponent(pid)}`);
        
        const data = response.data.data;
        
        console.log(`成功获取播放地址: ${data.url ? '有地址' : '无地址'}`);

        return {
            parse: data.parse || 0,
            url: data.url || '',
            header: data.header || {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.jiaozi.me/',
                'accept-encoding': 'identity;q=1, *;q=0',
                'range': 'bytes=0-'
            },
        };
    } catch (error) {
        console.error('获取播放地址失败:', error);
        return {
            parse: 0,
            url: '',
            header: {}
        };
    }
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page;
    let page = pg || 1;
    
    if (page == 0) page = 1;

    try {
        console.log(`搜索视频: wd=${wd}, page=${page}`);
        
        const response = await req.get(`${API_BASE}/api/search?key=${encodeURIComponent(wd)}&page=${page}`);
        
        const data = response.data.data;
        const videos = data.list || [];
        
        console.log(`搜索成功，找到 ${videos.length} 个结果`);

        return {
            page: parseInt(page),
            pagecount: data.pagecount || 1,
            limit: 20,
            total: data.total || videos.length,
            list: videos,
        };
    } catch (error) {
        console.error('搜索失败:', error);
        return {
            page: parseInt(page),
            pagecount: 1,
            limit: 20,
            total: 0,
            list: [],
        };
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
        
        if (dataResult.home.class.length > 0) {
            resp = await inReq.server.inject().post(`${prefix}/category`).payload({
                id: dataResult.home.class[0].type_id,
                page: 1,
                filter: false,
                filters: {},
            });
            dataResult.category = resp.json();
            printErr(resp.json());
            
            if (dataResult.category.list.length > 0) {
                resp = await inReq.server.inject().post(`${prefix}/detail`).payload({
                    id: dataResult.category.list[0].vod_id,
                });
                dataResult.detail = resp.json();
                printErr(resp.json());
                
                if (dataResult.detail.list && dataResult.detail.list.length > 0) {
                    dataResult.play = [];
                    const vod = dataResult.detail.list[0];
                    if (vod.vod_play_from && vod.vod_play_url) {
                        const flags = vod.vod_play_from.split('$$$');
                        const ids = vod.vod_play_url.split('$$$');
                        for (let j = 0; j < flags.length; j++) {
                            const flag = flags[j];
                            const urls = ids[j].split('#');
                            if (urls.length > 0) {
                                const playUrl = urls[0].split('$');
                                if (playUrl.length > 1) {
                                    resp = await inReq.server
                                        .inject()
                                        .post(`${prefix}/play`)
                                        .payload({
                                            flag: flag,
                                            id: playUrl[1],
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
            wd: '头号',
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
        key: 'jiaozi',
        name: '💞『饺子影院』',
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
