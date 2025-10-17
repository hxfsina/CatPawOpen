// TXSP.js - 腾腾影视规则文件
export const rule = {
    // 基本配置
    title: '腾腾影视',
    host: 'http://asp.xpgtv.com',
    
    // API接口
    apis: {
        categories: '/api.php/v2.vod/androidtypes',
        home: '/api.php/v2.main/androidhome',
        category: '/api.php/v2.vod/androidfilter10086',
        detail: '/api.php/v3.vod/androiddetail2',
        search: '/api.php/v2.vod/androidsearch10086'
    },
    
    // 请求头
    headers: {
        "User-Agent": "okhttp/3.12.11"
    },
    
    // 播放配置
    playConfig: {
        headers: {
            'user_id': 'XPGBOX',
            'token2': 'XFxIummRrngadHB4TCzeUaleebTX10Vl/ftCvGLPeI5tN2Y/liZ5tY5e4t8=',
            'version': 'XPGBOX com.phoenix.tv1.5.5',
            'hash': '524f',
            'screenx': '2331',
            'user-agent': 'okhttp/3.12.11',
            'token': 'VkxTyy6Krh4hd3lrQySUCJlsDYzzxxBbttphr3DiQNhmJkwoyEEm2YEu8qcOFGz2SmxGbIaSC91pa+8+VE9+SPQjGWY/wnqwKk1McYhsGyVVvHRAF0B1mD7922ara1o3k/EwZ1xyManr90EeUSxI7rPOLBwX5zeOri31MeyDfBnIdhckWld4V1k2ZfZ3QKbN',
            'timestamp': '1749174636',
            'screeny': '1121'
        },
        m3u8Prefix: 'http://c.xpgtv.net/m3u8/'
    },
    
    // 分类映射
    categories: {
        'choice': '精选',
        'movie': '电影', 
        'tv': '电视剧',
        'variety': '综艺',
        'cartoon': '动漫',
        'child': '少儿',
        'doco': '纪录片'
    },
    
    // 搜索配置
    search: {
        pageSize: 30,
        maxPage: 9999
    },
    
    // 分类页配置
    category: {
        pageSize: 90,
        maxPage: 9999
    },
    
    // 过滤器配置
    filters: {
        area: ['全部', '内地', '香港', '台湾', '美国', '韩国', '日本', '英国', '法国', '德国', '印度', '泰国', '其他'],
        year: ['全部', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'],
        sort: ['最新', '最热', '评分']
    },
    
    // 播放源配置
    playSources: {
        '书生玩剣ⁱ·*₁＇': {
            name: '主线路',
            type: 'm3u8',
            quality: ['超清', '高清', '标清']
        }
    },
    
    // 数据解析规则
    parseRules: {
        // 首页推荐解析
        home: {
            list: 'data.list',
            item: {
                id: 'id',
                name: 'name', 
                pic: 'pic',
                remarks: 'updateInfo || score'
            }
        },
        
        // 分类页解析
        category: {
            list: 'data',
            item: {
                id: 'id',
                name: 'name',
                pic: 'pic', 
                remarks: 'updateInfo || score'
            }
        },
        
        // 详情页解析
        detail: {
            data: 'data',
            fields: {
                id: 'id',
                name: 'name',
                pic: 'pic',
                year: 'year',
                area: 'area', 
                lang: 'lang',
                type: 'className',
                actor: 'actor',
                director: 'director',
                content: 'content',
                remarks: 'updateInfo || score',
                playUrls: 'urls'
            }
        },
        
        // 搜索解析
        search: {
            list: 'data',
            item: {
                id: 'id',
                name: 'name',
                pic: 'pic',
                remarks: 'updateInfo || score'
            }
        }
    },
    
    // 备注信息处理
    remarksHandler: function(vod) {
        if (vod.updateInfo) {
            return `更新至${vod.updateInfo}`;
        } else if (vod.score && vod.score !== '0.0' && vod.score !== '0') {
            return vod.score;
        } else if (vod.year) {
            return vod.year;
        } else if (vod.area) {
            return vod.area;
        } else {
            return '';
        }
    },
    
    // URL构建器
    urlBuilder: {
        home: function() {
            return this.host + this.apis.home;
        },
        
        categories: function() {
            return this.host + this.apis.categories;
        },
        
        category: function(tid, page, extend = {}) {
            const params = {
                page: page,
                type: tid,
                area: extend.area || '',
                year: extend.year || '',
                sortby: extend.sortby || '',
                class: extend.classes || ''
            };
            
            const filteredParams = {};
            for (const [key, value] of Object.entries(params)) {
                if (value) filteredParams[key] = value;
            }
            
            return this.host + this.apis.category + '?' + new URLSearchParams(filteredParams).toString();
        },
        
        detail: function(id) {
            return this.host + this.apis.detail + '?vod_id=' + id;
        },
        
        search: function(wd, page) {
            return this.host + this.apis.search + '?page=' + page + '&wd=' + encodeURIComponent(wd);
        },
        
        play: function(id) {
            if (id.includes('http')) {
                return id;
            } else {
                return this.playConfig.m3u8Prefix + id + '.m3u8';
            }
        }
    }
};

export default rule;
