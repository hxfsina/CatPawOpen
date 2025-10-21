import req from '../../util/req.js';

// 咪咕视频API基础域名
const API_BASE = 'https://miguvideo.hxfrock.ggff.net';

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
    url = inReq.server.config.migu?.url || '';
    categories = inReq.server.config.migu?.categories || [];
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
        
        // 添加所有可能的过滤器参数
        // 通用过滤器
        if (extend.mediaType) params.append('mediaType', extend.mediaType);
        if (extend.mediaArea) params.append('mediaArea', extend.mediaArea);
        if (extend.mediaYear) params.append('mediaYear', extend.mediaYear);
        if (extend.rankingType) params.append('rankingType', extend.rankingType);
        if (extend.payType) params.append('payType', extend.payType);
        
        // 特殊分类的过滤器
        if (extend.hotType) params.append('hotType', extend.hotType);           // 热门榜
        if (extend.contentType) params.append('contentType', extend.contentType); // 4K专区
        if (extend.area) params.append('area', extend.area);                    // 电视直播地区
        if (extend.sportType) params.append('sportType', extend.sportType);     // 体育类型
        if (extend.matchStatus) params.append('matchStatus', extend.matchStatus); // 比赛状态
        if (extend.matchdate) params.append('matchdate', extend.matchdate);     // 比赛时间
        
        console.log(`请求URL: ${API_BASE}/api/category?${params.toString()}`);
        
        const response = await req.get(`${API_BASE}/api/category?${params.toString()}`);
        
        const data = response.data.data;
        const videos = data.list || [];
        
        console.log(`成功获取 ${videos.length} 个视频`);
       
        return {
            page: parseInt(page),
            pagecount: 9999,
            limit: 20,
            total: 999999,
            list: videos,
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
    //console.log(`获取视频详情: id=${id}`);
    const response = await req.get(`${API_BASE}/api/detail?did=${id}`);
    
    //if (response.data.code !== 200) {
    //  throw new Error(`API返回错误: ${response.data.msg}`);
    //}

    const data = response.data.data;
    const videos = data.list || [];
    
    //if (videos.length > 0) {
    //  console.log(`成功获取视频详情: ${videos[0].vod_name}`);
    //}

    return {
      list: videos,
    };
  } catch (error) {
    //console.error('获取视频详情失败:', error.message);
  }
}

async function play(inReq, _outResp) {
  const flag = inReq.body.flag;
  const id = inReq.body.id;

  try {
    //console.log(`获取播放地址: flag=${flag}, id=${id}`);
    
    const response = await req.get(`${API_BASE}/api/player?flag=${flag || ''}&pid=${id}`);
    
    //if (response.data.code !== 200) {
    //  throw new Error(`API返回错误: ${response.data.msg}`);
    //}

    const data = response.data.data;
    
    //console.log(`成功获取播放地址: ${data.url ? '有地址' : '无地址'}`);

    return {
      parse: data.parse || 0,
      url: data.url || '',
      header: data.header || {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.miguvideo.com/'
      },
    };
  } catch (error) {
   // console.error('获取播放地址失败:', error.message);
  }
}

async function search(inReq, _outResp) {
  const wd = inReq.body.wd;
  const pg = inReq.body.page;
  let page = pg || 1;
  
  if (page == 0) page = 1;

  try {
    //console.log(`搜索视频: wd=${wd}, page=${page}`);
    
    const response = await req.get(`${API_BASE}/api/search?key=${encodeURIComponent(wd)}&page=${page}`);
    
    //if (response.data.code !== 200) {
    //  throw new Error(`API返回错误: ${response.data.msg}`);
    //}

    const data = response.data.data;
    const videos = data.list || [];
    
    //console.log(`搜索成功，找到 ${videos.length} 个结果`);

    const hasMore = videos.length >= 10;
    return {
      page: parseInt(page),
      pagecount: hasMore ? parseInt(page) + 1 : parseInt(page),
      list: videos,
    };
  } catch (error) {
   // console.error('搜索失败:', error.message);
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
    key: 'migu',
    name: '📺『咪咕视频』',
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
