import axios from 'axios';
import crypto from 'crypto';

class GetQueryId {
    constructor(botConfig) {
        this.botConfig = botConfig;

        this.graphQLClient = axios.create({
            baseURL: 'https://twitter.com',
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

    async getQueryIdAndFeatureSwitches() {
        const response = await this.graphQLClient.get('/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://twitter.com/'
            }
        });

        const webContext = response.data;

        for (const item of ['main', 'modules.audio']) {
            await this.addApiQueryData(webContext, item);
        }

        console.log('New Twitter API Query Data Found!');
        console.log(`Total Query Data: ${Object.keys(this.apiQueryData).length}`);
    }

    async addApiQueryData(webContext, fileType) {
        try {
            let match;
            let fileName;
            if (fileType === 'main') {
                match = webContext.match(/main\.([^"]+)\.js/);
                if (!match) throw new Error(`Failed to get ${fileType} version`);
                fileName = match[0];
                this.apiQueryData.apiId['mainJsId'] = fileName;
            } else {
                match = webContext.match(new RegExp(`"${fileType.replace('.', '\\.')}"\\s*:\\s*"([^"]+)"`));
                if (!match) throw new Error(`Failed to get ${fileType} version`);
                fileName = `${fileType}.${match[1]}a.js`;
                this.apiQueryData.apiId['audiomoduleId'] = fileName;
            }

            const type = webContext.includes('-legacy') ? 'client-web-legacy' : 'client-web';
            const mainJsResponse = await axios.get(`https://abs.twimg.com/responsive-web/${type}/${fileName}`);
            const mainJsText = mainJsResponse.data;

            const apiQueryRegex = /{queryId:"([^"]+)",operationName:"([^"]+)",operationType:"([^"]+)",metadata:{featureSwitches:\[([^\]]+)]/g;
            let queryMatch;
            while ((queryMatch = apiQueryRegex.exec(mainJsText)) !== null) {
                const queryId = queryMatch[1];
                const featureSwitches = queryMatch[4].split(',').map(s => s.replace(/"/g, ''));
                this.apiQueryData.queryInfo[queryMatch[2]] = { queryId, queryToken: featureSwitches};
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

    async tryUpdate() {
        const response = await this.graphQLClient.get('/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://twitter.com/'
        }
    });

        
        const webContext = response.data;

        for (const item of ['main', 'modules.audio']) {
            await this.checkAndTryUpdateData(webContext, item);
        }
    }

    async checkAndTryUpdateData(webContext, fileType) {
        try {
            let match;
            let fileName;
            let outdated = false;
            if (fileType === 'main') {
                match = webContext.match(/main\.([^"]+)\.js/);
                if (!match) throw new Error(`Failed to get ${fileType} version`);
                fileName = match[0];
                if(fileName !== this.apiQueryData.apiId['mainJsId']) outdated = true;
                
            } else {
                match = webContext.match(new RegExp(`"${fileType.replace('.', '\\.')}"\\s*:\\s*"([^"]+)"`));
                if (!match) throw new Error(`Failed to get ${fileType} version`);
                fileName = `${fileType}.${match[1]}a.js`;
                if(fileName !== this.apiQueryData.apiId['audiomoduleId']) outdated = true;
            }

            if(outdated) {
                await this.addApiQueryData(webContext, fileType);
            }

        }
        catch (error) {
            console.error(`Error checking version for ${fileType}`, error);
            throw error;
        }
    }




}

export default GetQueryId;
