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
    console.log('获取咪咕视频首页分类...');
    const response = await req.get(`${API_BASE}/api/categories`);
    
    if (response.data.code !== 200) {
      throw new Error(`API返回错误: ${response.data.msg}`);
    }

    const data = response.data.data;
    const classes = data.class || [];

    console.log(`成功获取 ${classes.length} 个分类`);
    
    return {
      class: classes
    };
  } catch (error) {
    console.error('获取首页分类失败:', error.message);
    return {
      class: [
        {'type_id': '1000', 'type_name': '电影'},
        {'type_id': '1001', 'type_name': '电视剧'},
        {'type_id': '1005', 'type_name': '综艺'},
        {'type_id': '1002', 'type_name': '纪实'},
        {'type_id': '1007', 'type_name': '动漫'},
        {'type_id': '601382', 'type_name': '少儿'}
      ]
    };
  }
}

async function category(inReq, _outResp) {
  const tid = inReq.body.id;
  const pg = inReq.body.page;
  let page = pg || 1;
  
  if (page == 0) page = 1;

  try {
    console.log(`获取分类内容: tid=${tid}, page=${page}`);
    
    // 构建查询参数 - 只传递分类ID和页码
    const params = new URLSearchParams({
      cid: tid,
      page: page.toString()
    });
    
    const response = await req.get(`${API_BASE}/api/category?${params.toString()}`);
    
    if (response.data.code !== 200) {
      throw new Error(`API返回错误: ${response.data.msg}`);
    }

    const data = response.data.data;
    const videos = data.list || [];
    
    console.log(`成功获取 ${videos.length} 个视频`);

    // 返回CatPawOpen需要的格式
    const hasMore = videos.length >= 20;
    return {
      page: parseInt(page),
      pagecount: hasMore ? parseInt(page) + 1 : parseInt(page),
      limit: 20,
      total: hasMore ? 3000 : videos.length,
      list: videos,
    };
  } catch (error) {
    console.error('获取分类内容失败:', error.message);
  }
}

async function detail(inReq, _outResp) {
  const id = inReq.body.id;
  
  try {
    console.log(`获取视频详情: id=${id}`);
    const response = await req.get(`${API_BASE}/api/detail?did=${id}`);
    
    if (response.data.code !== 200) {
      throw new Error(`API返回错误: ${response.data.msg}`);
    }

    const data = response.data.data;
    const videos = data.list || [];
    
    if (videos.length > 0) {
      console.log(`成功获取视频详情: ${videos[0].vod_name}`);
    }

    return {
      list: videos,
    };
  } catch (error) {
    console.error('获取视频详情失败:', error.message);
  }
}

async function play(inReq, _outResp) {
  const flag = inReq.body.flag;
  const id = inReq.body.id;

  try {
    console.log(`获取播放地址: flag=${flag}, id=${id}`);
    
    const response = await req.get(`${API_BASE}/api/player?flag=${flag || ''}&pid=${id}`);
    
    if (response.data.code !== 200) {
      throw new Error(`API返回错误: ${response.data.msg}`);
    }

    const data = response.data.data;
    
    console.log(`成功获取播放地址: ${data.url ? '有地址' : '无地址'}`);

    return {
      parse: data.parse || 0,
      url: data.url || '',
      header: data.header || {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.miguvideo.com/'
      },
    };
  } catch (error) {
    console.error('获取播放地址失败:', error.message);
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
    
    if (response.data.code !== 200) {
      throw new Error(`API返回错误: ${response.data.msg}`);
    }

    const data = response.data.data;
    const videos = data.list || [];
    
    console.log(`搜索成功，找到 ${videos.length} 个结果`);

    const hasMore = videos.length >= 10;
    return {
      page: parseInt(page),
      pagecount: hasMore ? parseInt(page) + 1 : parseInt(page),
      list: videos,
    };
  } catch (error) {
    console.error('搜索失败:', error.message);
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
    name: '咪咕视频',
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
