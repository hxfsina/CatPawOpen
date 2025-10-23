import req from '../../util/req.js';
import * as cheerio from 'cheerio';

const config = {
    host: 'https://v.qq.com',
    homeUrl: '/x/bu/pagesheet/list?_all=1&append=1&channel=cartoon&listpage=1&offset=0&pagesize=21&iarea=-1&sort=18',
    searchUrl: 'https://pbaccess.video.qq.com/trpc.videosearch.smartboxServer.HttpRountRecall/Smartbox?query=**&appID=3172&appKey=lGhFIPeD3HsO9xEp&pageNum=(fypage-1)&pageSize=10',
    detailUrl: 'https://node.video.qq.com/x/api/float_vinfo2?cid=fyid'
};

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.139 Safari/537.36",
    "Content-Type": "application/json",
    "origin": "https://v.qq.com",
    "referer": "https://v.qq.com/"
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
        detailUrl: config.detailUrl
    };
}

async function home(_inReq, _outResp) {
    try {
        // 使用腾讯视频的分类，但按照猫影视格式组织
        const classes = [
            { type_id: 'choice', type_name: '精选' },
            { type_id: 'movie', type_name: '电影' },
            { type_id: 'tv', type_name: '电视剧' },
            { type_id: 'variety', type_name: '综艺' },
            { type_id: 'cartoon', type_name: '动漫' },
            { type_id: 'child', type_name: '少儿' },
            { type_id: 'doco', type_name: '纪录片' }
        ];

        // 修正后的过滤器配置 - 只保留确认有效的过滤器
        const filters = {
            "choice": [
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
                    "key": "year",  // 精选使用year参数
                    "name": "年代",
                    "value": [
                        {"n": "全部", "v": "-1"},
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
                        {"n": "2015", "v": "2015"}
                    ]
                }
            ],
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
                    "key": "year",  // 电影使用year参数
                    "name": "年代",
                    "value": [
                        {"n": "全部", "v": "-1"},
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
                        {"n": "2015", "v": "2015"}
                    ]
                },
                {
                    "key": "itype",  // 电影类型使用itype参数
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
                        {"n": "动画", "v": "100015"},
                        {"n": "战争", "v": "100006"},
                        {"n": "家庭", "v": "100017"},
                        {"n": "剧情", "v": "100022"},
                        {"n": "奇幻", "v": "100016"},
                        {"n": "武侠", "v": "100011"},
                        {"n": "历史", "v": "100021"},
                        {"n": "老片", "v": "100013"},
                        {"n": "西部", "v": "3"},
                        {"n": "记录片", "v": "100020"}
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
                    "key": "iyear",  // 电视剧使用iyear参数
                    "name": "年代",
                    "value": [
                        {"n": "全部", "v": "-1"},
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
                        {"n": "2015", "v": "2015"}
                    ]
                },
                {
                    "key": "ifeature",  // 电视剧类型使用ifeature参数
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
                        {"n": "军旅", "v": "9"},
                        {"n": "权谋", "v": "10"},
                        {"n": "革命", "v": "11"},
                        {"n": "现实", "v": "13"},
                        {"n": "青春", "v": "14"},
                        {"n": "猎奇", "v": "15"},
                        {"n": "科幻", "v": "16"},
                        {"n": "竞技", "v": "17"},
                        {"n": "玄幻", "v": "18"}
                    ]
                }
            ],
            "variety": [
                // 综艺暂时保持原样，等找到正确的排序值后再更新
                {
                    "key": "sort",
                    "name": "排序",
                    "value": [
                        {"n": "最热", "v": "75"},
                        {"n": "最新", "v": "23"}
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
                        {"n": "2021", "v": "2021"},
                        {"n": "2020", "v": "2020"},
                        {"n": "2019", "v": "2019"},
                        {"n": "2018", "v": "2018"},
                        {"n": "2017", "v": "2017"},
                        {"n": "2016", "v": "2016"},
                        {"n": "2015", "v": "2015"}
                    ]
                }
            ],
            "cartoon": [
                // 动漫只保留排序和年代，去掉地区和类型
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
                    "key": "iyear",
                    "name": "年代",
                    "value": [
                        {"n": "全部", "v": "-1"},
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
                        {"n": "2015", "v": "2015"}
                    ]
                }
            ],
            "child": [
                // 少儿只保留排序
                {
                    "key": "sort",
                    "name": "排序",
                    "value": [
                        {"n": "最热", "v": "75"},
                        {"n": "最新", "v": "76"},
                        {"n": "好评", "v": "20"}
                    ]
                }
            ],
            "doco": [
                // 纪录片保留排序和出品方，去掉类型
                {
                    "key": "sort",
                    "name": "排序",
                    "value": [
                        {"n": "最热", "v": "75"},
                        {"n": "最新", "v": "74"}
                    ]
                },
                {
                    "key": "itrailer",
                    "name": "出品方",
                    "value": [
                        {"n": "全部", "v": "-1"},
                        {"n": "BBC", "v": "1"},
                        {"n": "国家地理", "v": "4"},
                        {"n": "HBO", "v": "3175"},
                        {"n": "NHK", "v": "2"},
                        {"n": "历史频道", "v": "7"},
                        {"n": "ITV", "v": "3530"},
                        {"n": "探索频道", "v": "3174"},
                        {"n": "ZDF", "v": "3176"},
                        {"n": "腾讯自制", "v": "15"},
                        {"n": "合作机构", "v": "6"},
                        {"n": "其他", "v": "5"}
                    ]
                }
            ]
        };

        // 获取首页推荐视频的代码保持不变
        const homeUrl = `${config.host}${config.homeUrl}`;
        const html = await request(homeUrl);
        const $ = cheerio.load(html);
        
        const videos = [];
        $('.list_item').each((index, element) => {
            const $el = $(element);
            
            const title = $el.find('.figure_title').text()?.trim() || $el.find('img').attr('alt') || '';
            let pic = $el.find('img.figure_pic').attr('src') || '';
            if (pic && pic.startsWith('//')) {
                pic = 'https:' + pic;
            }
            const videoId = $el.find('a.figure').attr('data-float') || '';
            
            if (title && pic) {
                videos.push({
                    vod_id: videoId || `video_${index}`,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: ''
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
    const filters = inReq.body.filters || {}; // 猫影视使用filters参数
    
    try {
        // 构建分类URL
        let url = `${config.host}/x/bu/pagesheet/list?_all=1&append=1&channel=${tid}&listpage=1&offset=${(pg-1)*21}&pagesize=21&iarea=-1`;
        
        // 添加所有过滤参数 - 使用腾讯视频的实际参数名
        Object.keys(filters).forEach(key => {
            if (filters[key] && filters[key] !== '-1') {
                url += `&${key}=${filters[key]}`;
            }
        });
        
        console.log('分类请求URL:', url); // 调试日志
        
        const html = await request(url);
        const $ = cheerio.load(html);
        
        const videos = [];
        $('.list_item').each((index, element) => {
            const $el = $(element);
            
            // 提取标题
            const title = $el.find('.figure_title').text()?.trim() || $el.find('img').attr('alt') || '';
            
            // 提取图片URL并修复协议问题
            let pic = $el.find('img.figure_pic').attr('src') || '';
            if (pic && pic.startsWith('//')) {
                pic = 'https:' + pic;
            }
            
            // 提取视频ID - 从data-float属性获取
            const videoId = $el.find('a.figure').attr('data-float') || '';
            
            // 提取视频类型标记（VIP、独播等）
            const mark = $el.find('img.mark_v').attr('alt') || '';
            
            if (title && pic) {
                videos.push({
                    vod_id: videoId || `${tid}_${index}`,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: mark // 只保留标记信息
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
                
                // 处理分类信息 - 展平嵌套数组
                let typeName = '';
                if (data.typ && Array.isArray(data.typ)) {
                    const flatTypes = data.typ.flat().filter(item => item && typeof item === 'string');
                    typeName = flatTypes.join(',');
                }
                
                // 处理演员信息 - 展平二维数组
                let actors = '';
                if (data.nam && Array.isArray(data.nam)) {
                    const flatActors = data.nam.flat().filter(item => item && typeof item === 'string');
                    actors = flatActors.join(',');
                }
                
                let vod = {
                    vod_id: videoId,
                    vod_name: v.title || '未知标题',
                    vod_pic: v.pic || '',
                    vod_year: v.year || '',
                    vod_area: v.area  || '',
                    type_name: typeName,
                    vod_actor: actors,
                    vod_director: v.director || '',
                    vod_content: v.description || '',
                    vod_remarks: data.rec || '',
                    vod_play_from: '腾讯视频',
                    vod_play_url: ''
                };
                
                // 处理播放列表 - 生成需要解析的原始URL
                if (v.video_ids && v.video_ids.length > 0) {
                    const playList = [];
                    
                    if (v.video_ids.length === 1) {
                        const vid = v.video_ids[0];
                        const playUrl = `https://v.qq.com/x/cover/${videoId}/${vid}.html`;
                        playList.push(`正片$${playUrl}`);
                    } else {
                        v.video_ids.forEach((vid, index) => {
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
        
        if (result && result.url && result.url !== '未抓取到 m3u8') {
            // 成功获取到真实地址且不是错误信息
            const realUrl = result.url;
            console.log(`获取到真实地址: ${realUrl}`);
            
            return {
                parse: 0, // 0表示不解析，直接播放
                jx: 0,    // 0表示不解析
                url: realUrl, // 返回真实的m3u8地址
                header: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
                    "Accept": "*/*",
                    //"Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                    "Origin": "https://jx.hls.one"
                }
            };
        } else {
            // 解析失败或返回"未抓取到 m3u8"，使用原始URL并让播放器自己解析
            console.log('解析API返回无效地址，使用原始URL并让播放器解析');
            const originalUrl = id.split("?")[0]; // 去除参数，保留基础URL
            
            return {
                parse: 0, // 0表示不解析
                jx: 1,    // 1表示需要播放器自己解析
                url: originalUrl,
                header: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
                    "Accept": "*/*",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                    "Origin": "https://v.qq.com",
                    "Referer": "https://v.qq.com/"
                }
            };
        }

    } catch (error) {
        console.error('播放处理失败:', error);
        // 发生异常时也使用原始URL并让播放器解析
        console.log('发生异常，使用原始URL并让播放器解析');
        const originalUrl = id.split("?")[0];
        
        return {
            parse: 0,
            jx: 1,
            url: originalUrl,
            header: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                "Origin": "https://v.qq.com",
                "Referer": "https://v.qq.com/"
            }
        };
    }
}

async function search(inReq, _outResp) {
    const wd = inReq.body.wd;
    const pg = inReq.body.page || 1;
    
    try {
        // 腾讯视频搜索API
        const API_URL = "https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.MultiTerminalSearch/MbSearch?vplatform=2";
        const PAGE_SIZE = 30;
        
        // 只排除指定的类型
        const excludedTypes = ["短视频", "生活", "新闻", "游戏"];

        // 构建请求参数
        const params = {
            "version": "25042201",
            "clientType": 1,
            "filterValue": "",
            "uuid": "B1E50847-D25F-4C4B-BBA0-36F0093487F6",
            "retry": 0,
            "query": wd,
            "pagenum": 0, // 只查询第1页
            "isPrefetch": true,
            "pagesize": PAGE_SIZE,
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
        };

        // 发送请求
        const response = await request(API_URL, {
            method: "POST",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.139 Safari/537.36',
                'Content-Type': 'application/json',
                'origin': 'https://v.qq.com',
                'referer': 'https://v.qq.com/'
            },
            body: JSON.stringify(params)
        });

        const json = JSON.parse(response);
        const videos = [];

        // 处理普通搜索结果
        if (json.data?.normalList?.itemList) {
            json.data.normalList.itemList.forEach(item => {
                if (item.doc?.dataType === 5000) return;
                
                if (item.doc?.id && item.videoInfo) {
                    const videoData = parseVideoInfo(item, wd);
                    if (videoData && !isExcludedVideoType(videoData.vod_type, excludedTypes)) {
                        videos.push(videoData);
                    }
                }
            });
        }

        // 处理区域搜索结果
        if (json.data?.areaBoxList) {
            json.data.areaBoxList.forEach(area => {
                if (area.itemList) {
                    area.itemList.forEach(item => {
                        if (item.doc?.dataType === 5000) return;
                        
                        if (item.doc?.id && item.videoInfo) {
                            const videoData = parseVideoInfo(item, wd);
                            if (videoData && !isExcludedVideoType(videoData.vod_type, excludedTypes)) {
                                videos.push(videoData);
                            }
                        }
                    });
                }
            });
        }

        // 按信息完整度排序
        const sortedVideos = videos.sort((a, b) => {
            const scoreA = calculateInfoScore(a);
            const scoreB = calculateInfoScore(b);
            return scoreB - scoreA; // 降序排列，信息完整的在前
        });

        // 猫影视格式返回
        return {
            page: parseInt(pg),
            pagecount: Math.ceil(sortedVideos.length / 20), // 猫影视每页20条
            limit: 20,
            total: sortedVideos.length,
            list: sortedVideos.slice(0, 20) // 只返回前20条
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

// 计算信息完整度得分
function calculateInfoScore(video) {
    let score = 0;
    
    // 年份信息 (10分)
    if (video.vod_year && video.vod_year !== "") score += 10;
    
    // 演员信息 (20分)
    if (video.vod_actor && video.vod_actor !== "") score += 20;
    
    // 导演信息 (15分)
    if (video.vod_director && video.vod_director !== "") score += 15;
    
    // 简介信息 (25分)
    if (video.vod_content && video.vod_content !== "") score += 25;
    
    // 封面图片 (10分)
    if (video.vod_pic && video.vod_pic !== "") score += 10;
    
    // 备注信息 (10分)
    if (video.vod_remarks && video.vod_remarks !== "") score += 10;
    
    // 类型信息 (10分)
    if (video.vod_type && video.vod_type !== "未知") score += 10;
    
    return score;
}

// 类型排除函数 - 只检查是否在排除列表中
function isExcludedVideoType(vodType, excludedTypes) {
    if (!vodType || vodType === "未知") return false;
    
    // 检查是否在排除列表中
    return excludedTypes.some(excluded => 
        vodType.includes(excluded) || excluded.includes(vodType)
    );
}

// 解析视频信息函数 - 保持标题精确匹配
function parseVideoInfo(item, exactMatchKeyword) {
    try {
        const videoInfo = item.videoInfo;
        const doc = item.doc;
        
        // 清理标题
        const cleanTitle = (videoInfo.title || doc.title || "未知标题")
            .replace(/<em>/g, "")
            .replace(/<\/em>/g, "")
            .replace(/\s+/g, " ")
            .trim();
        
        // 标题精确匹配验证
        if (cleanTitle !== exactMatchKeyword) {
            return null;
        }
        
        // 提取播放量或追剧数
        let remarks = "";
        if (videoInfo.coverDoc?.chaseNum) {
            remarks = `追剧${videoInfo.coverDoc.chaseNum}`;
        } else if (videoInfo.views) {
            remarks = videoInfo.views;
        }
        
        // 确定视频类型
        let vodType = "未知";
        if (videoInfo.typeName) {
            vodType = videoInfo.typeName;
        } else if (videoInfo.videoType === 7) {
            vodType = "短视频";
        } else if (videoInfo.videoType === 2) {
            vodType = "电视剧";
        } else if (videoInfo.videoType === 3) {
            vodType = "电影";
        } else if (videoInfo.videoType === 4) {
            vodType = "综艺";
        } else if (videoInfo.videoType === 5) {
            vodType = "动漫";
        }
        
        return {
            vod_id: doc.id,
            vod_name: cleanTitle,
            vod_pic: videoInfo.imgUrl || doc.pic || "",
            vod_remarks: remarks,
            vod_type: vodType,
            vod_year: videoInfo.year || "",
            vod_actor: videoInfo.actors?.join(", ") || "",
            vod_director: videoInfo.directors?.join(", ") || "",
            vod_content: videoInfo.descrip || ""
        };
    } catch (error) {
        return null;
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
        fastify.get('/test', test);
    },
};
