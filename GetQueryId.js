import axios from 'axios';
import crypto from 'crypto';

class GetQueryId {
    constructor(botConfig) {
        this.botConfig = botConfig;

        this.graphQLClient = axios.create({
            baseURL: 'https://x.com',
            withCredentials: true,
            headers: {
                'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'X-Csrf-Token': this.botConfig.TwitterCSRFToken,
                'cookie': `auth_token=${this.botConfig.TwitterAuthToken}; ct0=${this.botConfig.TwitterCSRFToken}; guest_id=v1%3A${crypto.createHash('md5').update(new Date().toISOString()).digest('hex')}`
            }
        });

        // 添加響應攔截器來處理重定向
        this.graphQLClient.interceptors.response.use(async (response) => {
            if (response.status === 200 && response.data) {
                const redirectUrl = this.extractRedirectUrl(response.data);
                if (redirectUrl) {
                    //console.log(`Redirecting to: ${redirectUrl}`);
                    return await this.graphQLClient.get(redirectUrl);
                }
            }
            return response;
        }, (error) => {
            return Promise.reject(error);
        });

        this.apiQueryData = {};
        this.apiQueryData.apiId = {};
        this.apiQueryData.queryInfo = {};
    }

    extractRedirectUrl(html) {
        const regex = /<meta http-equiv="refresh" content="0; url = (.*?)"/;
        const match = html.match(regex);
        return match ? match[1] : null;
    }

    // 1) getQueryIdAndFeatureSwitches：維持流程但允許多個 audio 模組
    async getQueryIdAndFeatureSwitches() {
        const response = await this.graphQLClient.get('/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://x.com/'
            }
        });

        const webContext = response.data;

        // 先處理 main，再批次處理所有 modules.audio-*
        await this.addApiQueryData(webContext, 'main');
        await this.addApiQueryData(webContext, 'modules.audio');

        console.log('New Twitter API Query Data Found!');
        console.log(`Total Query Names: ${Object.keys(this.apiQueryData.queryInfo).length}`);
    }

    // 2) addApiQueryData：新增對 "modules.audio-*" 的多筆擷取與逐檔請求
    async addApiQueryData(webContext, fileType) {
        try {
            const type = webContext.includes('-legacy') ? 'client-web-legacy' : 'client-web';

            if (fileType === 'main') {
                const match = webContext.match(/main\.([^"]+)\.js/);
                if (!match) throw new Error(`Failed to get ${fileType} version`);
                const fileName = match[0];
                this.apiQueryData.apiId['mainJsId'] = fileName;

                const resp = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
                await this._extractQueriesFromJs(resp.data);
                return;
            }

            // —— 多筆 modules.audio-* ——（符合你提供的清單格式）
            // 範例鍵值對：
            // "modules.audio-6107ac1a": "94bee89",
            // "modules.audio-7c51e6a7": "0e5eba6",
            // 檔名推導：modules.audio-<keyhash>.<valuehash>a.js
            const re = /"modules\.audio-([0-9a-f]{8})"\s*:\s*"([0-9a-f]{7})"/gi;

            // 收集所有音訊模組檔名
            const audioFiles = [];
            for (let m; (m = re.exec(webContext)) !== null;) {
                const keyHash = m[1];
                const valHash = m[2];
                const fileName = `modules.audio-${keyHash}.${valHash}a.js`;
                audioFiles.push(fileName);
            }
            if (audioFiles.length === 0) {
                throw new Error(`Failed to get any ${fileType} versions`);
            }

            // 保存清單（供後續 tryUpdate 比對）
            this.apiQueryData.apiId['audiomoduleIds'] = Array.from(new Set([
                ...(this.apiQueryData.apiId['audiomoduleIds'] || []),
                ...audioFiles
            ]));

            // 逐檔請求並跑後續 regex 測試（必要：不確定哪個檔含需要的資訊）
            for (const fileName of audioFiles) {
                try {
                    const resp = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
                    await this._extractQueriesFromJs(resp.data);
                } catch (e) {
                    // 單檔失敗不阻斷整體流程，記錄即可
                    console.warn(`Skip ${fileName}:`, e?.message || e);
                }
            }
        } catch (error) {
            console.error(`Error adding API query data for ${fileType}`, error);
            throw error;
        }
    }

    // 3) 共用解析函式：維持原本查詢抽取邏輯
    async _extractQueriesFromJs(mainJsText) {
        const apiQueryRegex = /{queryId:"([^"]+)",operationName:"([^"]+)",operationType:"([^"]+)",metadata:{featureSwitches:\[([^\]]+)]/g;
        let queryMatch;
        while ((queryMatch = apiQueryRegex.exec(mainJsText)) !== null) {
            const queryId = queryMatch[1];
            const opName = queryMatch[2];
            const featureSwitches = queryMatch[4].split(',').map(s => s.replace(/"/g, ''));
            this.apiQueryData.queryInfo[opName] = { queryId, queryToken: featureSwitches };
        }
    }

    // 4) tryUpdate：同樣以「多個 audio 檔」為基礎檢查差異
    async tryUpdate() {
        const response = await this.graphQLClient.get('/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://x.com/'
            }
        });
        const webContext = response.data;

        await this.checkAndTryUpdateData(webContext, 'main');
        await this.checkAndTryUpdateData(webContext, 'modules.audio');
    }

    // 5) checkAndTryUpdateData：改為集合比對，新增者逐檔補抓與解析
    async checkAndTryUpdateData(webContext, fileType) {
        try {
            const type = webContext.includes('-legacy') ? 'client-web-legacy' : 'client-web';

            if (fileType === 'main') {
                const match = webContext.match(/main\.([^"]+)\.js/);
                if (!match) throw new Error(`Failed to get ${fileType} version`);
                const fileName = match[0];
                const current = this.apiQueryData.apiId['mainJsId'];

                if (fileName !== current) {
                    this.apiQueryData.apiId['mainJsId'] = fileName;
                    const resp = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
                    await this._extractQueriesFromJs(resp.data);
                }
                return;
            }

            // 重新掃描目前頁面上的所有 audio 檔
            const re = /"modules\.audio-([0-9a-f]{8})"\s*:\s*"([0-9a-f]{7})"/gi;
            const nowSet = new Set();
            for (let m; (m = re.exec(webContext)) !== null;) {
                nowSet.add(`modules.audio-${m[1]}.${m[2]}a.js`);
            }

            const had = new Set(this.apiQueryData.apiId['audiomoduleIds'] || []);
            const added = [...nowSet].filter(x => !had.has(x));
            if (added.length > 0) {
                // 更新已知清單
                this.apiQueryData.apiId['audiomoduleIds'] = [...new Set([...had, ...added])];

                // 僅對新增者逐檔請求再解析
                for (const fileName of added) {
                    try {
                        const resp = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
                        await this._extractQueriesFromJs(resp.data);
                    } catch (e) {
                        console.warn(`Skip ${fileName}:`, e?.message || e);
                    }
                }
            }
        } catch (error) {
            console.error(`Error checking version for ${fileType}`, error);
            throw error;
        }
    }



    // 2) addApiQueryData：新增對 "modules.audio-*" 的多筆擷取與逐檔請求
    async addApiQueryData(webContext, fileType) {
        try {
            const type = webContext.includes('-legacy') ? 'client-web-legacy' : 'client-web';

            if (fileType === 'main') {
                const match = webContext.match(/main\.([^"]+)\.js/);
                if (!match) throw new Error(`Failed to get ${fileType} version`);
                const fileName = match[0];
                this.apiQueryData.apiId['mainJsId'] = fileName;

                const resp = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
                await this._extractQueriesFromJs(resp.data);
                return;
            }

            // —— 多筆 modules.audio-* ——（符合你提供的清單格式）
            // 範例鍵值對：
            // "modules.audio-6107ac1a": "94bee89",
            // "modules.audio-7c51e6a7": "0e5eba6",
            // 檔名推導：modules.audio-<keyhash>.<valuehash>a.js
            const re = /"modules\.audio-([0-9a-f]{8})"\s*:\s*"([0-9a-f]{7})"/gi;

            // 收集所有音訊模組檔名
            const audioFiles = [];
            for (let m; (m = re.exec(webContext)) !== null;) {
                const keyHash = m[1];
                const valHash = m[2];
                const fileName = `modules.audio-${keyHash}.${valHash}a.js`;
                audioFiles.push(fileName);
            }
            if (audioFiles.length === 0) {
                throw new Error(`Failed to get any ${fileType} versions`);
            }

            // 保存清單（供後續 tryUpdate 比對）
            this.apiQueryData.apiId['audiomoduleIds'] = Array.from(new Set([
                ...(this.apiQueryData.apiId['audiomoduleIds'] || []),
                ...audioFiles
            ]));

            // 逐檔請求並跑後續 regex 測試（必要：不確定哪個檔含需要的資訊）
            for (const fileName of audioFiles) {
                try {
                    const resp = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
                    await this._extractQueriesFromJs(resp.data);
                } catch (e) {
                    // 單檔失敗不阻斷整體流程，記錄即可
                    console.warn(`Skip ${fileName}:`, e?.message || e);
                }
            }
        } catch (error) {
            console.error(`Error adding API query data for ${fileType}`, error);
            throw error;
        }
    }

    async getQueryId(queryName) {
        if (!this.apiQueryData.queryInfo[queryName]) {
            throw new Error(`Query ${queryName} not found`);
        }

        return this.apiQueryData.queryInfo[queryName].queryId;
    }

    async getQueryToken(queryName) {
        if (!this.apiQueryData.queryInfo[queryName]) {
            throw new Error(`Query ${queryName} not found`);
        }

        return this.apiQueryData.queryInfo[queryName].queryToken;
    }

    async getQueryIdAndToken(queryName) {
        return {
            queryId: await this.getQueryId(queryName),
            queryToken: await this.getQueryToken(queryName)
        };
    }
    // 3) 共用解析函式：維持原本查詢抽取邏輯
    async _extractQueriesFromJs(mainJsText) {
        const apiQueryRegex = /{queryId:"([^"]+)",operationName:"([^"]+)",operationType:"([^"]+)",metadata:{featureSwitches:\[([^\]]+)]/g;
        let queryMatch;
        while ((queryMatch = apiQueryRegex.exec(mainJsText)) !== null) {
            const queryId = queryMatch[1];
            const opName = queryMatch[2];
            const featureSwitches = queryMatch[4].split(',').map(s => s.replace(/"/g, ''));
            this.apiQueryData.queryInfo[opName] = { queryId, queryToken: featureSwitches };
        }
    }

    // 4) tryUpdate：同樣以「多個 audio 檔」為基礎檢查差異
    async tryUpdate() {
        const response = await this.graphQLClient.get('/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://twitter.com/'
            }
        });
        const webContext = response.data;

        await this.checkAndTryUpdateData(webContext, 'main');
        await this.checkAndTryUpdateData(webContext, 'modules.audio');
    }

    // 5) checkAndTryUpdateData：改為集合比對，新增者逐檔補抓與解析
    async checkAndTryUpdateData(webContext, fileType) {
        try {
            const type = webContext.includes('-legacy') ? 'client-web-legacy' : 'client-web';

            if (fileType === 'main') {
                const match = webContext.match(/main\.([^"]+)\.js/);
                if (!match) throw new Error(`Failed to get ${fileType} version`);
                const fileName = match[0];
                const current = this.apiQueryData.apiId['mainJsId'];

                if (fileName !== current) {
                    this.apiQueryData.apiId['mainJsId'] = fileName;
                    const resp = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
                    await this._extractQueriesFromJs(resp.data);
                }
                return;
            }

            // 重新掃描目前頁面上的所有 audio 檔
            const re = /"modules\.audio-([0-9a-f]{8})"\s*:\s*"([0-9a-f]{7})"/gi;
            const nowSet = new Set();
            for (let m; (m = re.exec(webContext)) !== null;) {
                nowSet.add(`modules.audio-${m[1]}.${m[2]}a.js`);
            }

            const had = new Set(this.apiQueryData.apiId['audiomoduleIds'] || []);
            const added = [...nowSet].filter(x => !had.has(x));
            if (added.length > 0) {
                // 更新已知清單
                this.apiQueryData.apiId['audiomoduleIds'] = [...new Set([...had, ...added])];

                // 僅對新增者逐檔請求再解析
                for (const fileName of added) {
                    try {
                        const resp = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
                        await this._extractQueriesFromJs(resp.data);
                    } catch (e) {
                        console.warn(`Skip ${fileName}:`, e?.message || e);
                    }
                }
            }
        } catch (error) {
            console.error(`Error checking version for ${fileType}`, error);
            throw error;
        }
    }




}

export default GetQueryId;
